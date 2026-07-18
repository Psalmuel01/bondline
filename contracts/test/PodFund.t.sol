// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ShipstakeVault} from "../src/ShipstakeVault.sol";
import {PodFund} from "../src/PodFund.sol";

contract PodFundTest is Test {
    ShipstakeVault vault;
    PodFund podFund;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address stranger = makeAddr("stranger");
    address witness = makeAddr("witness");
    address payable tripVendor = payable(makeAddr("tripVendor"));

    uint64 deadline;
    uint256 podId;

    function setUp() public {
        podFund = new PodFund();
        vault = new ShipstakeVault(podFund);
        podFund.initVault(address(vault));
        deadline = uint64(block.timestamp + 1 days);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        vm.deal(stranger, 100 ether);

        address[] memory members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = carol;
        podId = podFund.createPod(members);
    }

    // --- wiring ---

    function test_initVault_isWriteOnce() public {
        vm.expectRevert(PodFund.VaultAlreadySet.selector);
        podFund.initVault(address(0xBEEF));
    }

    function test_initVault_rejectsZero() public {
        PodFund fresh = new PodFund();
        vm.expectRevert(PodFund.VaultRequired.selector);
        fresh.initVault(address(0));
    }

    function test_depositForfeit_onlyVault() public {
        vm.expectRevert(PodFund.NotVault.selector);
        podFund.depositForfeit{value: 1 ether}(podId, 0);
    }

    // --- pod creation ---

    function test_createPod_storesMembers() public view {
        address[] memory m = podFund.podMembers(podId);
        assertEq(m.length, 3);
        assertTrue(podFund.isPodMember(podId, alice));
        assertTrue(podFund.isPodMember(podId, bob));
        assertTrue(podFund.isPodMember(podId, carol));
        assertFalse(podFund.isPodMember(podId, stranger));
    }

    function test_createPod_revertsOnDuplicateMember() public {
        address[] memory members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = alice;
        vm.expectRevert(PodFund.DuplicateMember.selector);
        podFund.createPod(members);
    }

    function test_createPod_revertsOnZeroMember() public {
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = address(0);
        vm.expectRevert(PodFund.ZeroMember.selector);
        podFund.createPod(members);
    }

    function test_createPod_revertsBelowTwoMembers() public {
        address[] memory members = new address[](1);
        members[0] = alice;
        vm.expectRevert(PodFund.PodTooSmall.selector);
        podFund.createPod(members);
    }

    // --- pod-linked commitments ---

    function _createPodCommitment(address who, uint256 stake) internal returns (uint256 id) {
        vm.prank(who);
        id = vault.createPodCommitment{value: stake}("Ship the thing", deadline, witness, podId);
    }

    function test_createPodCommitment_revertsForNonMember() public {
        vm.prank(stranger);
        vm.expectRevert(ShipstakeVault.NotPodMember.selector);
        vault.createPodCommitment{value: 1 ether}("sneak in", deadline, witness, podId);
    }

    function test_podCommitment_storesPodId() public {
        uint256 id = _createPodCommitment(alice, 1 ether);
        (, , address b, , , , uint256 storedPod, ) = vault.commitments(id);
        assertEq(b, address(0));
        assertEq(storedPod, podId);
    }

    function test_forfeitedPodCommitment_creditsPodBalance() public {
        uint256 id = _createPodCommitment(alice, 2 ether);
        assertEq(podFund.podBalance(podId), 0);

        vm.warp(deadline);
        vault.claimForfeit(id);

        assertEq(podFund.podBalance(podId), 2 ether);
        assertEq(address(podFund).balance, 2 ether);
    }

    function test_completedPodCommitment_refundsCreatorNotPod() public {
        uint256 id = _createPodCommitment(alice, 2 ether);
        uint256 before = alice.balance;

        vm.prank(witness);
        vault.markComplete(id);

        assertEq(alice.balance, before + 2 ether);
        assertEq(podFund.podBalance(podId), 0);
    }

    // --- withdrawals ---

    function _fund(uint256 amount) internal {
        uint256 id = _createPodCommitment(alice, amount);
        vm.warp(deadline);
        vault.claimForfeit(id);
    }

    function test_withdrawal_executesOnlyWhenAllApprove() public {
        _fund(3 ether);

        vm.prank(alice);
        uint256 pid = podFund.proposeWithdrawal(podId, tripVendor, 3 ether, "Cabo trip");
        // proposer auto-approved; not yet executed (bob + carol outstanding)
        assertEq(tripVendor.balance, 0);
        assertEq(podFund.podBalance(podId), 3 ether);

        vm.prank(bob);
        podFund.approveWithdrawal(pid);
        assertEq(tripVendor.balance, 0); // still one short

        vm.prank(carol);
        podFund.approveWithdrawal(pid);

        // unanimous -> executed
        assertEq(tripVendor.balance, 3 ether);
        assertEq(podFund.podBalance(podId), 0);
    }

    function test_propose_revertsForNonMember() public {
        _fund(3 ether);
        vm.prank(stranger);
        vm.expectRevert(PodFund.NotAMember.selector);
        podFund.proposeWithdrawal(podId, tripVendor, 1 ether, "nope");
    }

    function test_approve_revertsForNonMember() public {
        _fund(3 ether);
        vm.prank(alice);
        uint256 pid = podFund.proposeWithdrawal(podId, tripVendor, 1 ether, "trip");
        vm.prank(stranger);
        vm.expectRevert(PodFund.NotAMember.selector);
        podFund.approveWithdrawal(pid);
    }

    function test_approve_revertsOnDoubleApproval() public {
        _fund(3 ether);
        vm.prank(alice);
        uint256 pid = podFund.proposeWithdrawal(podId, tripVendor, 1 ether, "trip");
        // alice already auto-approved as proposer
        vm.prank(alice);
        vm.expectRevert(PodFund.AlreadyApproved.selector);
        podFund.approveWithdrawal(pid);
    }

    function test_propose_revertsOverBalance() public {
        _fund(1 ether);
        vm.prank(alice);
        vm.expectRevert(PodFund.InsufficientBalance.selector);
        podFund.proposeWithdrawal(podId, tripVendor, 2 ether, "too much");
    }

    function test_approve_revertsOnMissingProposal() public {
        vm.prank(alice);
        vm.expectRevert(PodFund.NoSuchProposal.selector);
        podFund.approveWithdrawal(999);
    }

    /// @dev The observable guarantee after a unanimous execution: funds left
    ///      the pod exactly once and cannot be drained again. (Note: the
    ///      AlreadyExecuted guard in _approve is unreachable under unanimous
    ///      rules — every member has already approved by execution time, so a
    ///      re-approval hits AlreadyApproved first. It's kept as defensive code
    ///      for a future M-of-N threshold, not exercised here.)
    function test_executedFunds_cannotBeDrainedTwice() public {
        _fund(2 ether);
        vm.prank(alice);
        uint256 pid = podFund.proposeWithdrawal(podId, tripVendor, 2 ether, "trip");
        vm.prank(bob);
        podFund.approveWithdrawal(pid);
        vm.prank(carol);
        podFund.approveWithdrawal(pid); // unanimous -> executes, drains balance

        assertEq(tripVendor.balance, 2 ether);
        assertEq(podFund.podBalance(podId), 0);

        // The drained balance means a fresh identical proposal can't be made.
        vm.prank(alice);
        vm.expectRevert(PodFund.InsufficientBalance.selector);
        podFund.proposeWithdrawal(podId, tripVendor, 2 ether, "again");
    }

    /// @dev A malicious recipient that re-enters approveWithdrawal on payout
    ///      must not be able to double-spend: nonReentrant + executed flag hold.
    function test_execute_reentrancyGuarded() public {
        // Build a pod whose payout target is a reentrant contract member.
        ReentrantRecipient attacker = new ReentrantRecipient(podFund);
        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = address(attacker);
        uint256 evilPod = podFund.createPod(members);

        // Fund it via a forfeited pod commitment from alice.
        vm.prank(alice);
        uint256 id = vault.createPodCommitment{value: 2 ether}("x", deadline, witness, evilPod);
        vm.warp(deadline);
        vault.claimForfeit(id);
        assertEq(podFund.podBalance(evilPod), 2 ether);

        attacker.arm(evilPod);
        // alice proposes paying the attacker; both members approve -> execute.
        vm.prank(alice);
        uint256 pid = podFund.proposeWithdrawal(evilPod, payable(address(attacker)), 2 ether, "trip");
        vm.prank(address(attacker));
        // On receiving funds the attacker re-enters; the guard makes the whole
        // execution revert rather than paying twice.
        vm.expectRevert();
        podFund.approveWithdrawal(pid);
    }
}

/// @dev Reentrancy attacker: on receiving pod funds, tries to re-enter
///      approveWithdrawal to force a second payout of the same proposal.
contract ReentrantRecipient {
    PodFund private immutable podFund;
    uint256 private podId;
    bool private armed;

    constructor(PodFund _podFund) {
        podFund = _podFund;
    }

    function arm(uint256 _podId) external {
        podId = _podId;
        armed = true;
    }

    receive() external payable {
        if (armed) {
            armed = false;
            // Re-enter: proposalCount-1 is the in-flight proposal.
            podFund.approveWithdrawal(podFund.proposalCount() - 1);
        }
    }
}
