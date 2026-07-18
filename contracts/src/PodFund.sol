// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {BondlineMath} from "./BondlineMath.sol";

/// @title PodFund
/// @notice One friend group's own vault. Deployed as an EIP-1167 minimal-proxy
///         clone by PodFundFactory, so every pod has a real, distinct contract
///         address it can point to and share — "our own vault", not a row in a
///         shared mapping.
///
///         A PodFund holds only three things: who's in the group (fixed at
///         creation), the group's approval threshold, and the MON balance that
///         accumulates from members' forfeited stakes. All value-moving calls
///         are gated to the single BondlineVault that orchestrates commitments
///         and votes — the fund itself has no opinion on how MON arrives or
///         leaves, which keeps each clone's attack surface tiny and its state
///         provably isolated from every other pod.
contract PodFund is Initializable {
    using BondlineMath for uint256;

    /// @notice The vault authorized to move this pod's funds. Set once at init.
    address public vault;

    /// @notice Human-readable pod name (e.g. "Cabo 2026"). Display only.
    string public name;

    /// @notice Per-pod approval threshold in basis points, immutable for life.
    ///         Applies to both commitment resolution and fund withdrawals.
    uint16 public approvalThresholdBps;

    address[] private _members;
    mapping(address => bool) public isMember;

    error NotVault();
    error AlreadyInitialized();
    error TransferFailed();

    event ForfeitDeposited(address indexed from, uint256 amount, uint256 newBalance);
    event WithdrawalExecuted(address indexed to, uint256 amount, uint256 newBalance);

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    /// @dev Disable initializers on the implementation contract so the logic
    ///      contract behind the clones can never itself be initialized/hijacked.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize a freshly-cloned pod. Called once by the factory in
    ///         the same tx as the clone deploy. The factory is responsible for
    ///         validating members (>=2, no zero, no duplicates) and the bps
    ///         range; by the time we're here those invariants already hold.
    function initialize(
        string calldata name_,
        address[] calldata members_,
        uint16 approvalThresholdBps_,
        address vault_
    ) external initializer {
        vault = vault_;
        name = name_;
        approvalThresholdBps = approvalThresholdBps_;
        for (uint256 i = 0; i < members_.length; i++) {
            _members.push(members_[i]);
            isMember[members_[i]] = true;
        }
    }

    /// @notice Receive a forfeited stake from the vault into the shared fund.
    ///         Value is carried by msg.value; the pod balance is simply this
    ///         contract's MON balance, so no separate accounting can desync.
    function depositForfeit() external payable onlyVault {
        emit ForfeitDeposited(msg.sender, msg.value, address(this).balance);
    }

    /// @notice Pay out an approved group withdrawal. The vault enforces that the
    ///         withdrawal cleared this pod's threshold before calling; the fund
    ///         only checks it can cover the amount (implicit in the transfer).
    function executeWithdrawal(address to, uint256 amount) external onlyVault {
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit WithdrawalExecuted(to, amount, address(this).balance);
    }

    // --- views ---

    function members() external view returns (address[] memory) {
        return _members;
    }

    function memberCount() external view returns (uint256) {
        return _members.length;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Approvals required for an action with `eligibleVoters` eligible
    ///         members, under this pod's threshold. Exposed so the vault and the
    ///         frontend read identical math from one source.
    function requiredApprovals(uint256 eligibleVoters) external view returns (uint256) {
        return BondlineMath.requiredApprovals(eligibleVoters, approvalThresholdBps);
    }
}
