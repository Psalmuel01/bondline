// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PodFund} from "./PodFund.sol";

/// @title ShipstakeVault
/// @notice A stake-backed commitment protocol. You escrow MON behind a deadline
///         and name a witness who can vouch that you shipped. Ship in time and
///         your witness refunds you. Miss the deadline and anyone can move the
///         stake to your chosen beneficiary. The chain enforces the outcome.
/// @dev Single-vault design: all stakes live here under internal accounting,
///      keyed by commitment id. The entire trust surface fits on one screen.
contract ShipstakeVault is ReentrancyGuard {
    enum Status {
        Active, // escrowed, deadline not yet resolved
        Completed, // witness confirmed before deadline -> refunded
        Forfeited // deadline passed unconfirmed -> sent to beneficiary
    }

    struct Commitment {
        address creator; // who staked and made the promise
        address witness; // the only address that can mark it complete
        address beneficiary; // who receives the stake on forfeit (address(0) in pod mode)
        uint96 stake; // escrowed MON (uint96 fits any realistic stake, packs tight)
        uint64 deadline; // unix timestamp; at/after this, completion is closed
        Status status; // lifecycle state
        uint256 podId; // pod that receives the forfeit, or NO_POD for an external beneficiary
        string description; // the promise, in plain words (on-chain for legibility)
    }

    /// @dev Sentinel podId meaning "no pod — forfeit goes to the external beneficiary".
    uint256 public constant NO_POD = type(uint256).max;

    /// @dev The shared-treasury contract forfeits are routed to in pod mode.
    ///      Immutable here; PodFund holds the back-reference via its write-once
    ///      initVault (a mutual reference can't be immutable on both sides).
    PodFund public immutable podFund;

    /// @dev Incrementing id => commitment. Public getter is the whole read API.
    mapping(uint256 => Commitment) public commitments;
    uint256 public commitmentCount;

    constructor(PodFund _podFund) {
        podFund = _podFund;
    }

    event CommitmentCreated(
        uint256 indexed id,
        address indexed creator,
        address indexed witness,
        address beneficiary,
        uint256 stake,
        uint64 deadline,
        string description
    );
    event CommitmentCompleted(uint256 indexed id, address indexed witness, uint256 refund);
    event CommitmentForfeited(uint256 indexed id, address indexed caller, address indexed beneficiary, uint256 stake);
    event CommitmentForfeitedToPod(uint256 indexed id, address indexed caller, uint256 indexed podId, uint256 stake);

    error StakeRequired();
    error StakeTooLarge();
    error DeadlineInPast();
    error WitnessRequired();
    error BeneficiaryRequired();
    error WitnessCannotBeCreator();
    error BeneficiaryCannotBeCreator();
    error WitnessCannotBeBeneficiary();
    error NotPodMember();
    error NoSuchCommitment();
    error NotWitness();
    error NotActive();
    error DeadlinePassed();
    error DeadlineNotReached();
    error TransferFailed();

    /// @notice Escrow MON behind a promise, forfeiting to an external beneficiary.
    /// @param description Plain-text promise, e.g. "Ship Privara milestone 2".
    /// @param deadline Unix timestamp the promise must be confirmed before.
    /// @param witness Address allowed to confirm completion (not the creator).
    /// @param beneficiary Address that receives the stake if the deadline passes.
    /// @return id The new commitment's id.
    function createCommitment(
        string calldata description,
        uint64 deadline,
        address witness,
        address beneficiary
    ) external payable returns (uint256 id) {
        if (beneficiary == address(0)) revert BeneficiaryRequired();
        // A creator who is their own beneficiary just refunds themselves on
        // miss, gutting the enforcement the whole protocol exists to provide.
        if (beneficiary == msg.sender) revert BeneficiaryCannotBeCreator();
        // The witness must never profit from the creator missing the deadline,
        // or "vouch for me" degrades into a coin-flip on stealing the stake.
        if (witness == beneficiary) revert WitnessCannotBeBeneficiary();

        id = _create(description, deadline, witness, beneficiary, NO_POD);
        emit CommitmentCreated(id, msg.sender, witness, beneficiary, msg.value, deadline, description);
    }

    /// @notice Escrow MON behind a promise, forfeiting into a shared pod fund.
    ///         The creator must be a member of the pod — otherwise anyone could
    ///         route their forfeits into a friend group's fund they were never
    ///         part of, defeating the "our mutual accountability" framing.
    /// @param podId The pod whose treasury receives the stake on forfeit.
    /// @return id The new commitment's id.
    function createPodCommitment(
        string calldata description,
        uint64 deadline,
        address witness,
        uint256 podId
    ) external payable returns (uint256 id) {
        if (!podFund.isPodMember(podId, msg.sender)) revert NotPodMember();
        // No beneficiary/creator or witness/beneficiary check here: in pod mode
        // the forfeit goes to a shared treasury, not any single address. Every
        // member benefits equally from any forfeit — including the creator's own
        // — so the self-benefit is diluted to ~1/N and locked behind a group
        // vote, not concentrated on one witness who profits from staying silent.
        // Pod members witnessing each other is normal and desired: that IS the
        // friend-group-holds-each-other-accountable mechanic.
        id = _create(description, deadline, witness, address(0), podId);
        emit CommitmentCreated(id, msg.sender, witness, address(0), msg.value, deadline, description);
    }

    /// @dev Shared creation path. Beneficiary-vs-pod validation is done by the
    ///      public entrypoints; the invariants here hold for both modes.
    function _create(
        string calldata description,
        uint64 deadline,
        address witness,
        address beneficiary,
        uint256 podId
    ) internal returns (uint256 id) {
        if (msg.value == 0) revert StakeRequired();
        if (msg.value > type(uint96).max) revert StakeTooLarge();
        if (deadline <= block.timestamp) revert DeadlineInPast();
        if (witness == address(0)) revert WitnessRequired();
        if (witness == msg.sender) revert WitnessCannotBeCreator();

        id = commitmentCount++;
        commitments[id] = Commitment({
            creator: msg.sender,
            witness: witness,
            beneficiary: beneficiary,
            stake: uint96(msg.value),
            deadline: deadline,
            status: Status.Active,
            podId: podId,
            description: description
        });
    }

    /// @notice Witness confirms the creator shipped in time; refunds the stake.
    /// @dev Witness-only, Active-only, strictly before the deadline.
    ///      Checks-effects-interactions: state is finalized before the transfer.
    function markComplete(uint256 id) external nonReentrant {
        Commitment storage c = commitments[id];
        if (c.creator == address(0)) revert NoSuchCommitment();
        if (msg.sender != c.witness) revert NotWitness();
        if (c.status != Status.Active) revert NotActive();
        if (block.timestamp >= c.deadline) revert DeadlinePassed();

        uint256 refund = c.stake;
        address creator = c.creator;

        // effects — status is the state machine; a non-Active commitment can never
        // pay out again (see the NotActive check above), so `stake` is left intact
        // as the permanent historical record of what was on the line.
        c.status = Status.Completed;

        // interaction
        (bool ok, ) = payable(creator).call{value: refund}("");
        if (!ok) revert TransferFailed();

        emit CommitmentCompleted(id, msg.sender, refund);
    }

    /// @notice After the deadline, anyone can move an unconfirmed stake to the
    ///         beneficiary. Silence defaults to forfeiture, never deadlock.
    /// @dev Permissionless by design; funds always go to the beneficiary, never
    ///      the caller, so there is no MEV race — only the promise being kept or not.
    function claimForfeit(uint256 id) external nonReentrant {
        Commitment storage c = commitments[id];
        if (c.creator == address(0)) revert NoSuchCommitment();
        if (c.status != Status.Active) revert NotActive();
        if (block.timestamp < c.deadline) revert DeadlineNotReached();

        uint256 stake = c.stake;
        address beneficiary = c.beneficiary;
        uint256 podId = c.podId;

        // effects — status flips to Forfeited before the transfer; the NotActive
        // guard makes a second payout impossible, so `stake` stays as the record.
        c.status = Status.Forfeited;

        // interaction
        if (podId == NO_POD) {
            (bool ok, ) = payable(beneficiary).call{value: stake}("");
            if (!ok) revert TransferFailed();
            emit CommitmentForfeited(id, msg.sender, beneficiary, stake);
        } else {
            // The stake becomes the group's shared future. depositForfeit is
            // onlyVault-guarded on PodFund's side.
            podFund.depositForfeit{value: stake}(podId, id);
            emit CommitmentForfeitedToPod(id, msg.sender, podId, stake);
        }
    }

    /// @notice Convenience read: is this commitment forfeitable right now?
    function isForfeitable(uint256 id) external view returns (bool) {
        Commitment storage c = commitments[id];
        return c.creator != address(0) && c.status == Status.Active && block.timestamp >= c.deadline;
    }
}
