// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {BondlineCoreTest} from "./BondlineCore.t.sol";
import {BondlineCore} from "../src/BondlineCore.sol";
import {Circle} from "../src/Circle.sol";
contract MetropolisTest is BondlineCoreTest {
    function _verified(address c, address who, BondlineCore.VerifierType kind, uint96 target) internal returns(uint256) {
        vm.prank(who);
        return core.openVerifiedBond{value:1 ether}(c,"Reach my goal",uint64(block.timestamp+1 days),kind,kind==BondlineCore.VerifierType.External?address(this):address(0),target,"github:owner/repo:3");
    }
    function test_balanceRefundReplay() public {
        uint256 id=_verified(_four(5000),alice,BondlineCore.VerifierType.OnchainBalance,99 ether);
        vm.prank(stranger);core.verifyBalance(id);
        assertEq(alice.balance,100 ether);assertEq(address(core).balance,0);
        vm.expectRevert(BondlineCore.NotActive.selector);core.verifyBalance(id);
    }
    function test_balanceBelowAndLate() public {
        uint256 id=_verified(_four(5000),alice,BondlineCore.VerifierType.OnchainBalance,100 ether);
        vm.expectRevert(BondlineCore.InvalidCondition.selector);core.verifyBalance(id);
        vm.warp(block.timestamp+1 days);
        vm.expectRevert(BondlineCore.DeadlinePassed.selector);core.verifyBalance(id);
        core.crossMissed(id);assertEq(uint256(_status(id)),3);
    }
    function test_externalAuthorityConditionReplay() public {
        uint256 id=_verified(_four(5000),alice,BondlineCore.VerifierType.External,0);
        bytes32 condition=keccak256("github:owner/repo:3");bytes32 evidence=keccak256("evidence");
        vm.prank(bob);vm.expectRevert(BondlineCore.WrongVerifier.selector);core.attest(id,true,condition,evidence);
        vm.expectRevert(BondlineCore.InvalidCondition.selector);core.attest(id,true,bytes32(0),evidence);
        vm.expectRevert(BondlineCore.DeadlineNotReached.selector);core.attest(id,false,condition,evidence);
        vm.prank(alice);vm.expectRevert(BondlineCore.WrongVerifier.selector);core.declareDone(id,condition,"evidence");
        core.attest(id,true,condition,evidence);
        vm.expectRevert(BondlineCore.NotActive.selector);core.attest(id,true,condition,evidence);
    }
    function test_externalFailureLateSuccess() public {
        address c=_four(5000);uint256 id=_verified(c,alice,BondlineCore.VerifierType.External,0);
        vm.warp(block.timestamp+1 days);
        vm.expectRevert(BondlineCore.DeadlinePassed.selector);core.attest(id,true,keccak256("github:owner/repo:3"),keccak256("e"));
        core.attest(id,false,keccak256("github:owner/repo:3"),keccak256("e"));
        assertEq(Circle(c).balance(),1 ether);assertEq(core.reservedPot(c),1 ether);
    }
    function test_untrustedAndSelfVerifier() public {
        address c=_four(5000);
        vm.prank(alice);vm.expectRevert(BondlineCore.InvalidCondition.selector);
        core.openVerifiedBond{value:1 ether}(c,"x",uint64(block.timestamp+1 days),BondlineCore.VerifierType.External,bob,0,"x");
        core.setTrustedVerifier(alice,true);
        vm.prank(alice);vm.expectRevert(BondlineCore.InvalidCondition.selector);
        core.openVerifiedBond{value:1 ether}(c,"x",uint64(block.timestamp+1 days),BondlineCore.VerifierType.External,alice,0,"x");
        vm.prank(bob);vm.expectRevert(BondlineCore.OnlyDeployer.selector);core.setTrustedVerifier(bob,true);
    }
    function test_backingUniqueNoSettlement() public {
        uint256 id=_openBond(_four(5000),alice,1 ether);
        vm.prank(alice);vm.expectRevert(BondlineCore.CreatorCannotCosign.selector);core.backCommitment(id);
        vm.prank(stranger);vm.expectRevert(BondlineCore.NotCircleMember.selector);core.backCommitment(id);
        vm.prank(bob);core.backCommitment(id);
        vm.prank(bob);vm.expectRevert(BondlineCore.AlreadyBacked.selector);core.backCommitment(id);
        assertEq(core.backerCount(id),1);assertEq(uint256(_status(id)),0);assertEq(address(core).balance,1 ether);
    }
    function test_invitationFrozenRoster() public {
        address c=_four(5000);uint256 id=_openBond(c,alice,1 ether);
        vm.prank(stranger);vm.expectRevert(Circle.NotMember.selector);Circle(c).invite(stranger);
        vm.prank(alice);Circle(c).invite(stranger);vm.prank(stranger);Circle(c).join();
        assertEq(Circle(c).memberCount(),5);
        vm.prank(stranger);vm.expectRevert(Circle.NotInvited.selector);Circle(c).join();
        _declare(id,alice);
        vm.prank(stranger);vm.expectRevert(BondlineCore.NotCircleMember.selector);core.cosign(id);
        vm.prank(bob);core.cosign(id);vm.prank(carol);core.cosign(id);assertEq(uint256(_status(id)),2);
    }
    function test_weeklyDistributionAccounting() public {
        address c=_four(5000);uint256 win=_verified(c,alice,BondlineCore.VerifierType.OnchainBalance,1 ether);
        uint256 fail=_openBond(c,bob,3 ether);uint256 epoch=(block.timestamp+1 days)/core.PERIOD();core.verifyBalance(win);
        vm.warp((epoch+1)*core.PERIOD());
        vm.expectRevert(BondlineCore.PeriodNotReady.selector);core.closePeriod(c,epoch);
        core.crossMissed(fail);
        vm.prank(alice);vm.expectRevert(BondlineCore.InsufficientPotBalance.selector);core.proposePayout(c,alice,1 ether,"can't steal rewards");
        core.closePeriod(c,epoch);
        vm.prank(bob);vm.expectRevert(BondlineCore.NoReward.selector);core.claimReward(c,epoch,payable(bob));
        uint256 before=alice.balance;vm.prank(alice);core.claimReward(c,epoch,payable(alice));
        assertEq(alice.balance,before+3 ether);assertEq(core.reservedPot(c),0);assertEq(Circle(c).balance(),0);
        vm.prank(alice);vm.expectRevert(BondlineCore.NoReward.selector);core.claimReward(c,epoch,payable(alice));
        vm.expectRevert(BondlineCore.AlreadyExecuted.selector);core.closePeriod(c,epoch);
    }
    function test_emptyWeekRollover() public {
        address c=_four(5000);uint256 id=_openBond(c,alice,1 ether);uint256 epoch=(block.timestamp+1 days)/core.PERIOD();
        vm.warp((epoch+1)*core.PERIOD());core.crossMissed(id);core.closePeriod(c,epoch);
        assertEq(core.periodPot(c,block.timestamp/core.PERIOD()),1 ether);assertEq(core.reservedPot(c),1 ether);
    }
    function testFuzz_stakeConservation(uint96 stake) public {
        stake=uint96(bound(stake,1,50 ether));address c=_four(5000);uint256 id=_openBond(c,alice,stake);
        assertEq(address(core).balance,stake);vm.warp(block.timestamp+1 days);core.crossMissed(id);
        assertEq(address(core).balance,0);assertEq(Circle(c).balance(),stake);assertEq(core.reservedPot(c),stake);
    }
    function test_malformedStakeDuration() public {
        address c=_four(5000);
        vm.prank(alice);vm.expectRevert(BondlineCore.StakeRequired.selector);core.openBond(c,"x",uint64(block.timestamp+1 days));
        vm.prank(alice);vm.expectRevert(BondlineCore.InvalidDescription.selector);core.openBond{value:1}(c,"",uint64(block.timestamp+1 days));
        vm.prank(alice);vm.expectRevert(BondlineCore.DurationTooLong.selector);core.openBond{value:1}(c,"x",uint64(block.timestamp+31 days));
    }
    function test_backingPersistsThroughEvidenceReview() public {
        address c = _four(5000);
        uint256 id = _openBond(c, alice, 1 ether);
        vm.prank(bob); core.backCommitment(id);
        _declare(id, alice);
        assertTrue(core.hasBacked(id, bob));
        assertFalse(core.hasResponded(id, bob));
        (, , , , , , uint32 approvals, , , , ) = core.bonds(id);
        assertEq(approvals, 0);
        assertEq(uint256(_status(id)), uint256(BondlineCore.Status.PendingCosign));
        vm.prank(bob); core.cosign(id);
        assertTrue(core.hasResponded(id, bob));
        assertTrue(core.hasBacked(id, bob));
        assertEq(core.backerCount(id), 1);
        assertEq(core.uniqueCosigners(alice), 1); // backing plus review is one unique supporter
        vm.prank(carol); core.cosign(id);
        assertEq(uint256(_status(id)), uint256(BondlineCore.Status.Met));
        assertTrue(core.hasBacked(id, bob));
        assertEq(alice.balance, 100 ether);
    }
}
