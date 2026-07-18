// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BondlineVault} from "../src/BondlineVault.sol";
import {PodFund} from "../src/PodFund.sol";
import {PodFundFactory} from "../src/PodFundFactory.sol";

contract BondlineVaultTest is Test {
    BondlineVault vault;
    PodFundFactory factory;
    address podImpl;

    // a 4-member pod at 50% -> eligible voters 3, required approvals 2
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address dave = makeAddr("dave");
    address stranger = makeAddr("stranger");
    address payable vendor = payable(makeAddr("vendor"));

    function setUp() public {
        podImpl = address(new PodFund());
        vault = new BondlineVault();
        factory = new PodFundFactory(address(vault), podImpl);
        vault.setFactory(address(factory));

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
        vm.deal(dave, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    // --- helpers ---

    function _pod(uint16 bps, address[] memory members) internal returns (address) {
        return factory.createPod("Test Pod", members, bps);
    }

    function _four(uint16 bps) internal returns (address) {
        address[] memory m = new address[](4);
        m[0] = alice;
        m[1] = bob;
        m[2] = carol;
        m[3] = dave;
        return _pod(bps, m);
    }

    function _commit(address pod, address who, uint256 stake) internal returns (uint256 id) {
        vm.prank(who);
        id = vault.createCommitment{value: stake}(pod, "ship it", uint64(block.timestamp + 1 days));
    }

    function _declare(uint256 id, address who) internal {
        vm.prank(who);
        vault.declareComplete(id, keccak256("evidence"), "ipfs://evidence");
    }

    function _status(uint256 id) internal view returns (BondlineVault.Status s) {
        (, , , , , s, , , , , ) = vault.commitments(id);
    }

    // --- wiring ---

    function test_setFactory_isWriteOnce() public {
        vm.expectRevert(BondlineVault.FactoryAlreadySet.selector);
        vault.setFactory(address(0xBEEF));
    }

    function test_setFactory_onlyDeployer() public {
        BondlineVault fresh = new BondlineVault();
        vm.prank(stranger);
        vm.expectRevert(BondlineVault.OnlyDeployer.selector);
        fresh.setFactory(address(factory));
    }

    // --- factory / clones ---

    function test_factory_createsDistinctClones() public {
        address p1 = _four(5000);
        address p2 = _four(5000);
        assertTrue(p1 != p2, "clones must be distinct addresses");
        assertTrue(factory.isPod(p1));
        assertTrue(factory.isPod(p2));
        assertEq(factory.podCount(), 2);
    }

    function test_factory_rejectsDuplicateMember() public {
        address[] memory m = new address[](3);
        m[0] = alice;
        m[1] = bob;
        m[2] = alice;
        vm.expectRevert(PodFundFactory.DuplicateMember.selector);
        _pod(5000, m);
    }

    function test_factory_rejectsThresholdOutOfRange() public {
        address[] memory m = new address[](2);
        m[0] = alice;
        m[1] = bob;
        vm.expectRevert(PodFundFactory.ThresholdOutOfRange.selector);
        _pod(999, m); // below 10%
        vm.expectRevert(PodFundFactory.ThresholdOutOfRange.selector);
        _pod(10001, m); // above 100%
    }

    function test_factory_rejectsTooSmall() public {
        address[] memory m = new address[](1);
        m[0] = alice;
        vm.expectRevert(PodFundFactory.PodTooSmall.selector);
        _pod(5000, m);
    }

    function test_clone_cannotBeReinitialized() public {
        address pod = _four(5000);
        address[] memory m = new address[](2);
        m[0] = stranger;
        m[1] = alice;
        vm.expectRevert();
        PodFund(pod).initialize("hijack", m, 5000, address(vault));
    }

    // --- commitment creation ---

    function test_create_revertsForNonMember() public {
        address pod = _four(5000);
        vm.prank(stranger);
        vm.expectRevert(BondlineVault.NotPodMember.selector);
        vault.createCommitment{value: 1 ether}(pod, "x", uint64(block.timestamp + 1 days));
    }

    function test_create_revertsForUnknownPod() public {
        vm.prank(alice);
        vm.expectRevert(BondlineVault.UnknownPod.selector);
        vault.createCommitment{value: 1 ether}(address(0xdead), "x", uint64(block.timestamp + 1 days));
    }

    // --- voting: early approval ---

    function test_earlyApproval_resolvesWithoutWaitingWindow() public {
        address pod = _four(5000); // eligible 3, required 2
        uint256 id = _commit(pod, alice, 2 ether);
        _declare(id, alice);

        uint256 balBefore = alice.balance;
        vm.prank(bob);
        vault.castVote(id, true);
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.PendingVote)); // 1/2, still open

        vm.prank(carol);
        vault.castVote(id, true); // clears bar at 2/2 -> resolves NOW

        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Completed));
        assertEq(alice.balance, balBefore + 2 ether);
        // window never expired; resolution happened purely on hitting the bar
        assertLt(block.timestamp, vault.VOTE_WINDOW());
    }

    // --- voting: early rejection ---

    function test_earlyRejection_resolvesWhenBarUnreachable() public {
        address pod = _four(5000); // eligible 3, required 2
        uint256 id = _commit(pod, alice, 2 ether);
        _declare(id, alice);

        vm.prank(bob);
        vault.castVote(id, false);
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.PendingVote)); // 1 no, still reachable

        vm.prank(carol);
        vault.castVote(id, false); // 2 no -> only 1 possible yes left < 2 -> reject NOW

        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Forfeited));
        assertEq(PodFund(pod).balance(), 2 ether);
    }

    function test_singleNo_doesNotAutoKill_unlike_unanimous() public {
        address pod = _four(5000); // required 2, eligible 3
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);

        vm.prank(bob);
        vault.castVote(id, false); // one no
        // still pending: unlike the old unanimous model, one no doesn't kill it
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.PendingVote));

        vm.prank(carol);
        vault.castVote(id, true);
        vm.prank(dave);
        vault.castVote(id, true); // 2 yes -> approved despite the earlier no
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Completed));
    }

    // --- voting: expiry ---
    // Note: because castVote auto-approves the instant the bar clears, a claim
    // can only survive to expiry if it never cleared the bar — so resolveExpired
    // in practice always forfeits. Its approve branch (resolve on yes >= required
    // at close) is kept as defensive code but is unreachable under early-approve.
    // "Both directions" of resolution are covered by the early-approval and
    // early-rejection tests above; expiry itself only forfeits.

    function test_expiry_forfeitsWhenUnderBarAtClose() public {
        address pod = _four(5000); // required 2
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.prank(bob);
        vault.castVote(id, true); // 1 yes, below bar, window left to run

        vm.warp(block.timestamp + vault.VOTE_WINDOW() + 1);
        // 1 < 2 at close -> forfeits (under threshold resolves against creator)
        vault.resolveExpired(id);
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Forfeited));
        assertEq(PodFund(pod).balance(), 1 ether);
    }

    function test_expiry_forfeitsOnSilence() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        // nobody votes
        vm.warp(block.timestamp + vault.VOTE_WINDOW() + 1);
        vault.resolveExpired(id);
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Forfeited));
    }

    function test_expiry_10pctPodApprovesOnOneYes() public {
        address pod = _four(1000); // 10%: eligible 3, required 1
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.prank(bob);
        // a single yes already clears required=1 -> auto-approves immediately
        vault.castVote(id, true);
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Completed));
    }

    function test_forfeitMissed_afterDeadlineWithoutDeclaration() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 2 ether);
        // creator never declares; deadline passes
        vm.warp(block.timestamp + 2 days);
        // permissionless — a non-member can even trigger it
        vm.prank(stranger);
        vault.forfeitMissed(id);
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Forfeited));
        assertEq(PodFund(pod).balance(), 2 ether);
    }

    function test_forfeitMissed_revertsBeforeDeadline() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        vm.expectRevert(BondlineVault.DeadlineNotReached.selector);
        vault.forfeitMissed(id);
    }

    function test_forfeitMissed_revertsIfAlreadyPending() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice); // now PendingVote, not Active
        vm.warp(block.timestamp + 2 days);
        vm.expectRevert(BondlineVault.NotActive.selector);
        vault.forfeitMissed(id);
    }

    function test_resolveExpired_revertsWhileWindowOpen() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.expectRevert(BondlineVault.VoteStillOpen.selector);
        vault.resolveExpired(id);
    }

    // --- voting: access control ---

    function test_creatorCannotVote() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.prank(alice);
        vm.expectRevert(BondlineVault.CreatorCannotVote.selector);
        vault.castVote(id, true);
    }

    function test_nonMemberCannotVote() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.prank(stranger);
        vm.expectRevert(BondlineVault.NotPodMember.selector);
        vault.castVote(id, true);
    }

    function test_doubleVoteReverts() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.prank(bob);
        vault.castVote(id, true);
        vm.prank(bob);
        vm.expectRevert(BondlineVault.AlreadyVoted.selector);
        vault.castVote(id, true);
    }

    function test_declare_onlyCreatorBeforeDeadline() public {
        address pod = _four(5000);
        uint256 id = _commit(pod, alice, 1 ether);
        vm.prank(bob);
        vm.expectRevert(BondlineVault.NotCreator.selector);
        vault.declareComplete(id, bytes32(0), "");

        vm.warp(block.timestamp + 2 days); // past deadline
        vm.prank(alice);
        vm.expectRevert(BondlineVault.DeadlinePassed.selector);
        vault.declareComplete(id, bytes32(0), "");
    }

    // --- 2-member and 100% edge pods ---

    function test_twoMemberPod_50pct() public {
        address[] memory m = new address[](2);
        m[0] = alice;
        m[1] = bob;
        address pod = _pod(5000, m); // eligible 1, required 1
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.prank(bob);
        vault.castVote(id, true); // single eligible voter approves -> done
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Completed));
    }

    function test_100pctPod_requiresAll() public {
        address pod = _four(10000); // eligible 3, required 3
        uint256 id = _commit(pod, alice, 1 ether);
        _declare(id, alice);
        vm.prank(bob);
        vault.castVote(id, true);
        vm.prank(carol);
        vault.castVote(id, true);
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.PendingVote)); // 2/3
        vm.prank(dave);
        vault.castVote(id, true); // 3/3
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Completed));
    }

    // --- clone isolation ---

    function test_isolation_forfeitCreditsOnlyOwningPod() public {
        address podA = _four(5000);
        address[] memory m2 = new address[](2);
        m2[0] = alice;
        m2[1] = bob;
        address podB = _pod(5000, m2);

        uint256 id = _commit(podA, alice, 3 ether);
        _declare(id, alice);
        vm.prank(bob);
        vault.castVote(id, false);
        vm.prank(carol);
        vault.castVote(id, false); // reject -> funds podA only

        assertEq(PodFund(podA).balance(), 3 ether);
        assertEq(PodFund(podB).balance(), 0, "podB must be untouched");
    }

    function test_isolation_directPodCallsRevert() public {
        address pod = _four(5000);
        // Only the vault may move a pod's money — direct calls from anyone else
        // (member or not) revert, so one pod can't be drained out of band.
        vm.prank(alice);
        vm.expectRevert(PodFund.NotVault.selector);
        PodFund(pod).executeWithdrawal(vendor, 1 ether);

        vm.prank(alice);
        vm.expectRevert(PodFund.NotVault.selector);
        PodFund(pod).depositForfeit{value: 1 ether}();
    }

    function test_isolation_nonMemberOfOtherPodCannotCommit() public {
        address podA = _four(5000);
        address[] memory m2 = new address[](2);
        m2[0] = stranger;
        m2[1] = bob;
        address podB = _pod(5000, m2);
        assertTrue(podA != podB);

        // carol is in podA but not podB -> can't create against podB
        vm.prank(carol);
        vm.expectRevert(BondlineVault.NotPodMember.selector);
        vault.createCommitment{value: 1 ether}(podB, "x", uint64(block.timestamp + 1 days));
    }

    // --- withdrawals ---

    function _fund(address pod, uint256 amount) internal {
        uint256 id = _commit(pod, alice, amount);
        _declare(id, alice);
        // Vote no from each non-creator member, stopping the moment the claim
        // early-rejects and forfeits — otherwise a later vote hits an already
        // resolved commitment (NotPending). Which vote is decisive depends on
        // the pod threshold, so we drive it dynamically rather than hard-coding.
        address[3] memory voters = [bob, carol, dave];
        for (uint256 i = 0; i < voters.length; i++) {
            if (_status(id) != BondlineVault.Status.PendingVote) break;
            vm.prank(voters[i]);
            vault.castVote(id, false);
        }
        assertEq(uint256(_status(id)), uint256(BondlineVault.Status.Forfeited));
        assertEq(PodFund(pod).balance(), amount);
    }

    function test_withdrawal_executesAtThreshold() public {
        address pod = _four(5000); // withdrawals: eligible = full membership 4, required ceil(2)=2
        _fund(pod, 4 ether);

        vm.prank(alice);
        uint256 pid = vault.proposeWithdrawal(pod, vendor, 4 ether, "group dinner");
        // proposer auto-approved (1/2), not yet executed
        assertEq(vendor.balance, 0);

        vm.prank(bob);
        vault.approveWithdrawal(pid); // 2/2 -> executes
        assertEq(vendor.balance, 4 ether);
        assertEq(PodFund(pod).balance(), 0);
    }

    function test_withdrawal_nonMemberCannotPropose() public {
        address pod = _four(5000);
        _fund(pod, 2 ether);
        vm.prank(stranger);
        vm.expectRevert(BondlineVault.NotPodMember.selector);
        vault.proposeWithdrawal(pod, vendor, 1 ether, "x");
    }

    function test_withdrawal_overBalanceReverts() public {
        address pod = _four(5000);
        _fund(pod, 1 ether);
        vm.prank(alice);
        vm.expectRevert(BondlineVault.InsufficientPodBalance.selector);
        vault.proposeWithdrawal(pod, vendor, 2 ether, "too much");
    }

    function test_withdrawal_doubleApprovalReverts() public {
        address pod = _four(10000); // required = all 4, so it stays open after proposer
        _fund(pod, 2 ether);
        vm.prank(alice);
        uint256 pid = vault.proposeWithdrawal(pod, vendor, 2 ether, "trip");
        vm.prank(alice);
        vm.expectRevert(BondlineVault.AlreadyApproved.selector);
        vault.approveWithdrawal(pid);
    }

    // --- reentrancy ---

    function test_refundReentrancyGuarded() public {
        ReentrantCreator attacker = new ReentrantCreator(vault);
        vm.deal(address(attacker), 10 ether);
        address[] memory m = new address[](2);
        m[0] = address(attacker);
        m[1] = bob;
        address pod = _pod(5000, m); // eligible 1, required 1

        uint256 id = attacker.commit{value: 2 ether}(pod);
        vm.prank(address(attacker));
        vault.declareComplete(id, bytes32(0), "");
        attacker.arm(id);

        // bob approves -> refund fires to attacker, which re-enters on receive.
        // nonReentrant makes the whole resolution revert rather than double-pay.
        vm.prank(bob);
        vm.expectRevert();
        vault.castVote(id, true);
    }
}

/// @dev Attacker that re-enters the vault when it receives its stake refund.
contract ReentrantCreator {
    BondlineVault private immutable vault;
    uint256 private armedId;
    bool private armed;

    constructor(BondlineVault _vault) {
        vault = _vault;
    }

    function commit(address pod) external payable returns (uint256) {
        return vault.createCommitment{value: msg.value}(pod, "x", uint64(block.timestamp + 1 days));
    }

    function arm(uint256 id) external {
        armedId = id;
        armed = true;
    }

    receive() external payable {
        if (armed) {
            armed = false;
            // try to re-enter a resolving path
            vault.resolveExpired(armedId);
        }
    }
}
