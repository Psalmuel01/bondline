// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PodFund
/// @notice A shared treasury for a fixed group of friends. Forfeited
///         Shipstake commitment stakes land here instead of an external
///         beneficiary. Members later withdraw together, by proposal and
///         approval, once they hit their own goals — the group's individual
///         misses fund the group's collective future.
/// @dev Withdrawals are unanimous: every member must approve. Intentional for
///      small, tightly-knit friend pods. Known v1 limitation — one permanently
///      unresponsive member freezes the fund with no escape hatch. A later
///      version could add a time-locked fallback threshold (e.g. unanimous
///      within 30 days, then drops to 75%).
contract PodFund is ReentrancyGuard {
    struct Pod {
        address[] members;
        mapping(address => bool) isMember;
        uint256 balance;
    }

    struct WithdrawalProposal {
        uint256 podId;
        address proposer;
        address payable recipient;
        uint256 amount;
        string reason; // e.g. "Cabo trip, June 2027"
        uint256 approvals;
        mapping(address => bool) hasApproved;
        bool executed;
    }

    mapping(uint256 => Pod) private pods;
    uint256 public podCount;

    mapping(uint256 => WithdrawalProposal) private proposals;
    uint256 public proposalCount;

    /// @dev Only ShipstakeVault (the forfeit-triggering contract) may deposit
    ///      forfeited stakes. Set exactly once, right after deploy, then frozen.
    ///      Not `immutable` because the vault needs this contract's address in
    ///      its own constructor — a mutual reference can't be immutable on both
    ///      sides. `initVault` enforces the write-once guarantee instead.
    address public vault;

    event VaultSet(address indexed vault);
    event PodCreated(uint256 indexed podId, address[] members);
    event Deposited(uint256 indexed podId, uint256 amount, uint256 fromCommitmentId);
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed podId,
        address proposer,
        address recipient,
        uint256 amount,
        string reason
    );
    event ProposalApproved(uint256 indexed proposalId, address approver, uint256 approvals);
    event ProposalExecuted(uint256 indexed proposalId, uint256 indexed podId, address recipient, uint256 amount);

    error VaultAlreadySet();
    error VaultRequired();
    error NotVault();
    error NotAMember();
    error PodTooSmall();
    error DuplicateMember();
    error ZeroMember();
    error NoSuchPod();
    error NoSuchProposal();
    error AlreadyApproved();
    error AlreadyExecuted();
    error InsufficientBalance();
    error TransferFailed();

    /// @notice Wire the authorized vault exactly once, after both contracts are
    ///         deployed. Reverts if already set or if given the zero address.
    function initVault(address _vault) external {
        if (vault != address(0)) revert VaultAlreadySet();
        if (_vault == address(0)) revert VaultRequired();
        vault = _vault;
        emit VaultSet(_vault);
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    /// @notice Create a fixed-membership pod. Minimum 2 members (you'd never
    ///         build a "friend group" pod of one).
    function createPod(address[] calldata members) external returns (uint256 podId) {
        if (members.length < 2) revert PodTooSmall();

        podId = podCount++;
        Pod storage p = pods[podId];
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == address(0)) revert ZeroMember();
            if (p.isMember[members[i]]) revert DuplicateMember();
            p.isMember[members[i]] = true;
            p.members.push(members[i]);
        }

        emit PodCreated(podId, members);
    }

    /// @notice Called by ShipstakeVault when a commitment tied to this pod
    ///         gets forfeited. Routes the stake into the pod balance instead
    ///         of an external beneficiary.
    function depositForfeit(uint256 podId, uint256 fromCommitmentId) external payable onlyVault {
        Pod storage p = pods[podId];
        if (p.members.length == 0) revert NoSuchPod();

        p.balance += msg.value;
        emit Deposited(podId, msg.value, fromCommitmentId);
    }

    /// @notice Any member proposes spending pod funds. The proposer's own
    ///         approval is recorded automatically.
    function proposeWithdrawal(
        uint256 podId,
        address payable recipient,
        uint256 amount,
        string calldata reason
    ) external returns (uint256 proposalId) {
        Pod storage p = pods[podId];
        if (!p.isMember[msg.sender]) revert NotAMember();
        if (amount > p.balance) revert InsufficientBalance();

        proposalId = proposalCount++;
        WithdrawalProposal storage wp = proposals[proposalId];
        wp.podId = podId;
        wp.proposer = msg.sender;
        wp.recipient = recipient;
        wp.amount = amount;
        wp.reason = reason;

        emit ProposalCreated(proposalId, podId, msg.sender, recipient, amount, reason);

        // Proposer's vote counts automatically.
        _approve(proposalId, msg.sender);
    }

    /// @notice A pod member approves a pending proposal. Executes automatically
    ///         once every member has approved (unanimous — see contract notice).
    function approveWithdrawal(uint256 proposalId) external {
        WithdrawalProposal storage wp = proposals[proposalId];
        if (wp.proposer == address(0)) revert NoSuchProposal();
        Pod storage p = pods[wp.podId];
        if (!p.isMember[msg.sender]) revert NotAMember();

        _approve(proposalId, msg.sender);
    }

    function _approve(uint256 proposalId, address approver) internal {
        WithdrawalProposal storage wp = proposals[proposalId];
        if (wp.executed) revert AlreadyExecuted();
        if (wp.hasApproved[approver]) revert AlreadyApproved();

        wp.hasApproved[approver] = true;
        wp.approvals++;
        emit ProposalApproved(proposalId, approver, wp.approvals);

        Pod storage p = pods[wp.podId];
        if (wp.approvals == p.members.length) {
            _execute(proposalId);
        }
    }

    /// @dev Checks-effects-interactions: `executed` and `balance` are written
    ///      before the transfer, and nonReentrant blocks a re-entered execute.
    function _execute(uint256 proposalId) internal nonReentrant {
        WithdrawalProposal storage wp = proposals[proposalId];
        Pod storage p = pods[wp.podId];

        if (wp.amount > p.balance) revert InsufficientBalance();

        // effects
        wp.executed = true;
        p.balance -= wp.amount;

        // interaction
        (bool ok, ) = wp.recipient.call{value: wp.amount}("");
        if (!ok) revert TransferFailed();

        emit ProposalExecuted(proposalId, wp.podId, wp.recipient, wp.amount);
    }

    function podBalance(uint256 podId) external view returns (uint256) {
        return pods[podId].balance;
    }

    function podMembers(uint256 podId) external view returns (address[] memory) {
        return pods[podId].members;
    }

    function isPodMember(uint256 podId, address who) external view returns (bool) {
        return pods[podId].isMember[who];
    }

    function hasApproved(uint256 proposalId, address who) external view returns (bool) {
        return proposals[proposalId].hasApproved[who];
    }
}
