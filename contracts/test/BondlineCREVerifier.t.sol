// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {BondlineCore} from "../src/BondlineCore.sol";
import {Circle} from "../src/Circle.sol";
import {CircleFactory} from "../src/CircleFactory.sol";
import {BondlineCREVerifier} from "../src/BondlineCREVerifier.sol";
contract FixtureCREForwarder {
    function deliver(BondlineCREVerifier receiver, bytes memory metadata, bytes memory report) external { receiver.onReport(metadata, report); }
}
contract BondlineCREVerifierTest is Test {
    BondlineCore core;
    CircleFactory factory;
    FixtureCREForwarder forwarder;
    BondlineCREVerifier receiver;
    address circle;
    address alice = address(0xa11ce);
    address bob = address(0xb0b);
    bytes10 constant NAME = bytes10("bondline01");
    string constant SPEC = '{"type":"github","repo":"owner/repo","author":"owner","commits":1}';
    function setUp() public {
        vm.warp(10 days);
        core = new BondlineCore();
        factory = new CircleFactory(address(core), address(new Circle()));
        core.setFactory(address(factory));
        forwarder = new FixtureCREForwarder();
        receiver = new BondlineCREVerifier(address(core),address(forwarder),address(this),NAME);
        core.setTrustedVerifier(address(receiver),true);
        address[] memory members = new address[](2);members[0]=alice;members[1]=bob;
        circle = factory.createCircle("CRE fixture",members,5000);
        vm.deal(alice,10 ether);
    }
    function open() private returns(uint256 id) {
        vm.prank(alice);
        return core.openVerifiedBond{value:1 ether}(circle,"Public repository activity",uint64(block.timestamp+1 days),BondlineCore.VerifierType.External,address(receiver),0,SPEC);
    }
    function metadata() private view returns(bytes memory) { return abi.encodePacked(bytes32(uint256(1)),NAME,address(this),bytes2(0)); }
    function report(uint256 id,bool success) private pure returns(bytes memory) { return abi.encode(id,success,keccak256(bytes(SPEC)),keccak256("GitHub evidence")); }
    function test_successRefundAndReplayRejected() public {
        uint256 id=open();uint256 before=alice.balance;
        forwarder.deliver(receiver,metadata(),report(id,true));
        (,,,,,BondlineCore.Status status,,,,,)=core.bonds(id);
        assertEq(uint256(status),uint256(BondlineCore.Status.Met));assertEq(alice.balance,before+1 ether);
        vm.expectRevert(BondlineCore.NotActive.selector);forwarder.deliver(receiver,metadata(),report(id,true));
    }
    function test_failureFundsReservedPotAfterDeadline() public {
        uint256 id=open();vm.warp(block.timestamp+1 days);
        forwarder.deliver(receiver,metadata(),report(id,false));
        assertEq(circle.balance,1 ether);assertEq(core.reservedPot(circle),1 ether);
    }
    function test_directCallerCannotForgeReport() public {
        uint256 id=open();vm.expectRevert(BondlineCREVerifier.UnauthorizedForwarder.selector);receiver.onReport(metadata(),report(id,true));
    }
    function test_wrongWorkflowOwnerRejected() public {
        uint256 id=open();bytes memory wrong=abi.encodePacked(bytes32(uint256(1)),NAME,bob,bytes2(0));
        vm.expectRevert(BondlineCREVerifier.WrongWorkflow.selector);forwarder.deliver(receiver,wrong,report(id,true));
    }
    function test_wrongWorkflowNameRejected() public {
        uint256 id=open();bytes memory wrong=abi.encodePacked(bytes32(uint256(1)),bytes10("wrong-name"),address(this),bytes2(0));
        vm.expectRevert(BondlineCREVerifier.WrongWorkflow.selector);forwarder.deliver(receiver,wrong,report(id,true));
    }
    function test_missingMetadataRejected() public {
        uint256 id=open();vm.expectRevert(BondlineCREVerifier.InvalidMetadata.selector);forwarder.deliver(receiver,"",report(id,true));
    }
    function test_packedMetadataAccepted() public {
        uint256 id=open();forwarder.deliver(receiver,abi.encodePacked(bytes32(uint256(1)),NAME,address(this)),report(id,true));
    }
    function test_changedConditionRejected() public {
        uint256 id=open();vm.expectRevert(BondlineCore.InvalidCondition.selector);forwarder.deliver(receiver,metadata(),abi.encode(id,true,keccak256("different condition"),keccak256("evidence")));
    }
    function test_lateSuccessRejected() public {
        uint256 id=open();vm.warp(block.timestamp+1 days);vm.expectRevert(BondlineCore.DeadlinePassed.selector);forwarder.deliver(receiver,metadata(),report(id,true));
    }
    function test_earlyFailureRejected() public {
        uint256 id=open();vm.expectRevert(BondlineCore.DeadlineNotReached.selector);forwarder.deliver(receiver,metadata(),report(id,false));
    }
    function test_invalidPayloadRejected() public {
        vm.expectRevert(BondlineCREVerifier.InvalidReport.selector);forwarder.deliver(receiver,metadata(),abi.encode(1));
    }
    function test_zeroIdentityRejectedAtConfiguration() public {
        vm.expectRevert(BondlineCREVerifier.InvalidConfiguration.selector);new BondlineCREVerifier(address(core),address(forwarder),address(0),NAME);
    }
}
