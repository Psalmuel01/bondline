// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {BondlineMath} from "./BondlineMath.sol";
import {PodFund} from "./PodFund.sol";
import {PodFundFactory} from "./PodFundFactory.sol";

/// @title BondlineVault
/// @notice The central commitment + voting engine for Bondline. Friends stake
///         MON against their own deadlines; miss it and the stake funds their
///         group's PodFund, hit it and they're refunded once enough of the
///         group confirms.
///
///         All commitments, votes, and resolution live here, keyed by the pod
///         (a PodFund clone) they belong to. The vault is the sole address
///         authorized to move any pod's money — pods themselves hold only
///         membership, threshold, and balance. This split keeps every pod's
///         funds isolated while the voting logic and threshold math live in one
///         audited place.
contract BondlineVault is ReentrancyGuard {
    using BondlineMath for uint256;

    /// @notice Fixed window opened by declareComplete during which the group
    ///         votes on a claim. Chosen to be short enough to keep momentum but
    ///         long enough that a distributed friend group can weigh in.
    uint64 public constant VOTE_WINDOW = 24 hours;

    /// @notice Ceiling on a single stake — keeps stake in uint96 for packing and
    ///         guards against fat-finger deposits on an unaudited testnet build.
    uint96 public constant MAX_STAKE = 1_000_000 ether;

    enum Status {
        Active, // staked, deadline running, not yet declared
        PendingVote, // creator declared complete, group is voting
        Completed, // approved -> creator refunded
        Forfeited // rejected or expired -> stake sent to pod fund
    }

    struct Commitment {
        address creator;
        address pod;
        uint96 stake;
        uint64 deadline;
        uint64 voteClosesAt; // set when declareComplete flips to PendingVote
        Status status;
        uint32 yesVotes;
        uint32 noVotes;
        string description;
        bytes32 evidenceHash;
        string evidenceUri;
    }

    struct Proposal {
        address pod;
        address to;
        uint96 amount;
        bool executed;
        uint32 approvals;
        string memo;
    }

    PodFundFactory public factory;
    address public immutable deployer;

    Commitment[] private _commitments;
    /// @dev commitment id => voter => voted already (creator excluded from voting)
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    Proposal[] private _proposals;
    /// @dev proposal id => member => approved already
    mapping(uint256 => mapping(address => bool)) public hasApprovedWithdrawal;

    // --- errors ---
    error FactoryAlreadySet();
    error FactoryNotSet();
    error OnlyDeployer();
    error ZeroAddress();
    error UnknownPod();
    error NotPodMember();
    error StakeRequired();
    error StakeTooLarge();
    error DeadlineInPast();
    error NoSuchCommitment();
    error NotCreator();
    error NotActive();
    error DeadlinePassed();
    error DeadlineNotReached();
    error NotPending();
    error CreatorCannotVote();
    error AlreadyVoted();
    error VoteClosed();
    error VoteStillOpen();
    error TransferFailed();
    error NoSuchProposal();
    error InsufficientPodBalance();
    error AlreadyExecuted();
    error AlreadyApproved();

    // --- events ---
    event CommitmentCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed pod,
        uint256 stake,
        uint64 deadline,
        string description
    );
    event CompletionDeclared(
        uint256 indexed id, address indexed creator, uint64 voteClosesAt, bytes32 evidenceHash, string evidenceUri
    );
    event VoteCast(uint256 indexed id, address indexed voter, bool approve, uint32 yesVotes, uint32 noVotes);
    event CommitmentResolved(uint256 indexed id, Status status, uint256 stake);

    event WithdrawalProposed(
        uint256 indexed proposalId, address indexed pod, address indexed to, uint256 amount, string memo
    );
    event WithdrawalApproved(uint256 indexed proposalId, address indexed member, uint32 approvals);
    event WithdrawalExecuted(uint256 indexed proposalId, address indexed pod, address to, uint256 amount);

    constructor() {
        deployer = msg.sender;
    }

    /// @notice Wire the factory once, after both are deployed (they reference
    ///         each other, so one must learn the other post-construction).
    function setFactory(address factory_) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (address(factory) != address(0)) revert FactoryAlreadySet();
        if (factory_ == address(0)) revert ZeroAddress();
        factory = PodFundFactory(factory_);
    }

    // --- commitment lifecycle ---

    /// @notice Stake MON against a personal deadline, tied to a pod you're in.
    ///         Miss the deadline (or fail the vote) and the stake funds the pod.
    function createCommitment(address pod, string calldata description, uint64 deadline)
        external
        payable
        returns (uint256 id)
    {
        if (address(factory) == address(0)) revert FactoryNotSet();
        if (!factory.isPod(pod)) revert UnknownPod();
        if (!PodFund(pod).isMember(msg.sender)) revert NotPodMember();
        if (msg.value == 0) revert StakeRequired();
        if (msg.value > MAX_STAKE) revert StakeTooLarge();
        if (deadline <= block.timestamp) revert DeadlineInPast();

        id = _commitments.length;
        _commitments.push(
            Commitment({
                creator: msg.sender,
                pod: pod,
                stake: uint96(msg.value),
                deadline: deadline,
                voteClosesAt: 0,
                status: Status.Active,
                yesVotes: 0,
                noVotes: 0,
                description: description,
                evidenceHash: bytes32(0),
                evidenceUri: ""
            })
        );

        emit CommitmentCreated(id, msg.sender, pod, msg.value, deadline, description);
    }

    /// @notice Creator declares they've shipped, before the deadline. Freezes
    ///         the clock immediately (even minutes early) and opens the vote
    ///         window. Evidence is stored as a content hash plus an off-chain
    ///         URI voters can open — the hash anchors it, the URI serves it.
    function declareComplete(uint256 id, bytes32 evidenceHash, string calldata evidenceUri) external {
        Commitment storage c = _get(id);
        if (msg.sender != c.creator) revert NotCreator();
        if (c.status != Status.Active) revert NotActive();
        if (block.timestamp >= c.deadline) revert DeadlinePassed();

        c.status = Status.PendingVote;
        c.voteClosesAt = uint64(block.timestamp) + VOTE_WINDOW;
        c.evidenceHash = evidenceHash;
        c.evidenceUri = evidenceUri;

        emit CompletionDeclared(id, msg.sender, c.voteClosesAt, evidenceHash, evidenceUri);
    }

    /// @notice Cast a vote on a pending claim. Any pod member except the creator
    ///         may vote once. Resolves immediately when the threshold is cleared
    ///         (approve) or becomes unreachable (reject) — no waiting out the
    ///         window in either decided case.
    function castVote(uint256 id, bool approve) external nonReentrant {
        Commitment storage c = _get(id);
        if (c.status != Status.PendingVote) revert NotPending();
        if (block.timestamp >= c.voteClosesAt) revert VoteClosed();
        if (msg.sender == c.creator) revert CreatorCannotVote();
        if (!PodFund(c.pod).isMember(msg.sender)) revert NotPodMember();
        if (hasVoted[id][msg.sender]) revert AlreadyVoted();

        hasVoted[id][msg.sender] = true;
        if (approve) {
            c.yesVotes += 1;
        } else {
            c.noVotes += 1;
        }
        emit VoteCast(id, msg.sender, approve, c.yesVotes, c.noVotes);

        uint256 eligible = _eligibleVoters(c.pod);
        uint256 required = BondlineMath.requiredApprovals(eligible, PodFund(c.pod).approvalThresholdBps());

        if (BondlineMath.isApproved(c.yesVotes, required)) {
            _resolve(id, c, true);
        } else if (BondlineMath.isRejectable(eligible, c.noVotes, required)) {
            _resolve(id, c, false);
        }
    }

    /// @notice Permissionlessly forfeit a commitment whose creator blew the
    ///         deadline without ever declaring completion. This is the "miss your
    ///         deadline and your stake funds the group" path — without it, a
    ///         creator who simply never declares would trap their own stake in
    ///         Active forever. Anyone can trigger it once the deadline passes.
    function forfeitMissed(uint256 id) external nonReentrant {
        Commitment storage c = _get(id);
        if (c.status != Status.Active) revert NotActive();
        if (block.timestamp < c.deadline) revert DeadlineNotReached();
        _resolve(id, c, false);
    }

    /// @notice Resolve a claim whose vote window has closed without an automatic
    ///         resolution. Permissionless. Approves iff yes-votes met the bar at
    ///         close; otherwise forfeits — ties and under-threshold resolve
    ///         against the creator, consistent with "silence forfeits".
    function resolveExpired(uint256 id) external nonReentrant {
        Commitment storage c = _get(id);
        if (c.status != Status.PendingVote) revert NotPending();
        if (block.timestamp < c.voteClosesAt) revert VoteStillOpen();

        uint256 eligible = _eligibleVoters(c.pod);
        uint256 required = BondlineMath.requiredApprovals(eligible, PodFund(c.pod).approvalThresholdBps());
        _resolve(id, c, BondlineMath.isApproved(c.yesVotes, required));
    }

    /// @dev Settle a commitment exactly once. Approval refunds the creator;
    ///      rejection routes the stake into the pod's shared fund. Effects
    ///      (status flip) happen before the external value move (CEI), and the
    ///      whole path is nonReentrant.
    function _resolve(uint256 id, Commitment storage c, bool approved) private {
        uint256 stake = c.stake;
        if (approved) {
            c.status = Status.Completed;
            (bool ok, ) = payable(c.creator).call{value: stake}("");
            if (!ok) revert TransferFailed();
        } else {
            c.status = Status.Forfeited;
            PodFund(c.pod).depositForfeit{value: stake}();
        }
        emit CommitmentResolved(id, c.status, stake);
    }

    // --- shared-fund withdrawals ---

    /// @notice Propose paying out MON from a pod's shared fund. Proposer must be
    ///         a member and auto-approves. Requires the pod to currently hold at
    ///         least `amount`. Gated by the same per-pod threshold as claims,
    ///         but over the full membership (a withdrawal has no "creator" to
    ///         exclude — everyone including the proposer is an eligible voter).
    function proposeWithdrawal(address pod, address to, uint96 amount, string calldata memo)
        external
        nonReentrant
        returns (uint256 proposalId)
    {
        if (!factory.isPod(pod)) revert UnknownPod();
        if (!PodFund(pod).isMember(msg.sender)) revert NotPodMember();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0 || amount > PodFund(pod).balance()) revert InsufficientPodBalance();

        proposalId = _proposals.length;
        _proposals.push(
            Proposal({pod: pod, to: to, amount: amount, executed: false, approvals: 1, memo: memo})
        );
        hasApprovedWithdrawal[proposalId][msg.sender] = true;
        emit WithdrawalProposed(proposalId, pod, to, amount, memo);
        emit WithdrawalApproved(proposalId, msg.sender, 1);

        _maybeExecuteWithdrawal(proposalId, pod);
    }

    /// @notice Approve a pending withdrawal. Executes automatically once the
    ///         pod's threshold (over full membership) is cleared.
    function approveWithdrawal(uint256 proposalId) external nonReentrant {
        if (proposalId >= _proposals.length) revert NoSuchProposal();
        Proposal storage p = _proposals[proposalId];
        if (p.executed) revert AlreadyExecuted();
        if (!PodFund(p.pod).isMember(msg.sender)) revert NotPodMember();
        if (hasApprovedWithdrawal[proposalId][msg.sender]) revert AlreadyApproved();

        hasApprovedWithdrawal[proposalId][msg.sender] = true;
        p.approvals += 1;
        emit WithdrawalApproved(proposalId, msg.sender, p.approvals);

        _maybeExecuteWithdrawal(proposalId, p.pod);
    }

    /// @dev Execute the payout when approvals clear the pod threshold. Full
    ///      membership is the eligible set for withdrawals.
    function _maybeExecuteWithdrawal(uint256 proposalId, address pod) private {
        Proposal storage p = _proposals[proposalId];
        uint256 eligible = PodFund(pod).memberCount();
        uint256 required = BondlineMath.requiredApprovals(eligible, PodFund(pod).approvalThresholdBps());
        if (!BondlineMath.isApproved(p.approvals, required)) return;
        if (p.amount > PodFund(pod).balance()) revert InsufficientPodBalance();

        p.executed = true; // effects before interaction
        PodFund(pod).executeWithdrawal(p.to, p.amount);
        emit WithdrawalExecuted(proposalId, pod, p.to, p.amount);
    }

    // --- views ---

    /// @notice Eligible voters on a commitment = pod members minus the creator.
    function _eligibleVoters(address pod) private view returns (uint256) {
        return PodFund(pod).memberCount() - 1;
    }

    /// @notice Live resolution snapshot for a pending claim, for the voting UI:
    ///         eligible voters, approvals required, current yes/no, and whether
    ///         either resolution condition is already met.
    function voteState(uint256 id)
        external
        view
        returns (uint256 eligible, uint256 required, uint32 yes, uint32 no, bool approvedNow, bool rejectableNow)
    {
        Commitment storage c = _get(id);
        eligible = _eligibleVoters(c.pod);
        required = BondlineMath.requiredApprovals(eligible, PodFund(c.pod).approvalThresholdBps());
        yes = c.yesVotes;
        no = c.noVotes;
        approvedNow = BondlineMath.isApproved(yes, required);
        rejectableNow = BondlineMath.isRejectable(eligible, no, required);
    }

    function commitments(uint256 id)
        external
        view
        returns (
            address creator,
            address pod,
            uint96 stake,
            uint64 deadline,
            uint64 voteClosesAt,
            Status status,
            uint32 yesVotes,
            uint32 noVotes,
            string memory description,
            bytes32 evidenceHash,
            string memory evidenceUri
        )
    {
        Commitment storage c = _get(id);
        return (
            c.creator,
            c.pod,
            c.stake,
            c.deadline,
            c.voteClosesAt,
            c.status,
            c.yesVotes,
            c.noVotes,
            c.description,
            c.evidenceHash,
            c.evidenceUri
        );
    }

    function commitmentCount() external view returns (uint256) {
        return _commitments.length;
    }

    function proposals(uint256 id)
        external
        view
        returns (address pod, address to, uint96 amount, bool executed, uint32 approvals, string memory memo)
    {
        if (id >= _proposals.length) revert NoSuchProposal();
        Proposal storage p = _proposals[id];
        return (p.pod, p.to, p.amount, p.executed, p.approvals, p.memo);
    }

    function proposalCount() external view returns (uint256) {
        return _proposals.length;
    }

    function _get(uint256 id) private view returns (Commitment storage) {
        if (id >= _commitments.length) revert NoSuchCommitment();
        return _commitments[id];
    }
}
