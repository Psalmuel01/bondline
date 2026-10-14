// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {BondlineCore} from "../src/BondlineCore.sol";
import {Circle} from "../src/Circle.sol";
import {CircleFactory} from "../src/CircleFactory.sol";
import {LocalCREReceiver} from "./fixtures/LocalCREReceiver.sol";
contract LocalMockForwarder {
    function deliver(LocalCREReceiver receiver, bytes memory report) external { receiver.onReport("", report); }
}
contract LocalCREReceiverTest is Test {
    BondlineCore core;
    LocalMockForwarder forwarder;
    LocalCREReceiver receiver;
    address circle;
    address alice = address(0xa11ce);
    string constant SPEC = '{"type":"github","repo":"owner/repo","author":"owner","commits":1}';
    function setUp() public {
        vm.chainId(31337); vm.warp(10 days);
        core = new BondlineCore();
        CircleFactory factory = new CircleFactory(address(core), address(new Circle())); core.setFactory(address(factory));
        forwarder = new LocalMockForwarder(); receiver = new LocalCREReceiver(address(core), address(forwarder)); core.setTrustedVerifier(address(receiver), true);
        address[] memory members = new address[](2); members[0] = alice; members[1] = address(0xb0b);
        circle = factory.createCircle("Local CRE simulation", members, 5000); vm.deal(alice, 10 ether);
    }
    function open() private returns (uint256) {
        vm.prank(alice); return core.openVerifiedBond{value:1 ether}(circle,"Publish fixture tooling",uint64(block.timestamp+1 days),BondlineCore.VerifierType.External,address(receiver),0,SPEC);
    }
    function test_adapterCannotDeployOnEitherMonadNetwork() public {
        vm.chainId(10143); vm.expectRevert(LocalCREReceiver.SimulationOnly.selector); new LocalCREReceiver(address(core),address(forwarder));
        vm.chainId(143); vm.expectRevert(LocalCREReceiver.SimulationOnly.selector); new LocalCREReceiver(address(core),address(forwarder));
    }
    function test_onlyMockForwarderCanSettle() public {
        uint256 id = open(); vm.expectRevert(LocalCREReceiver.WrongForwarder.selector); receiver.onReport("",abi.encode(id,true,keccak256(bytes(SPEC)),keccak256("evidence")));
    }
    function test_localSuccessRefundAndReplayRejection() public {
        uint256 id = open(); uint256 before = alice.balance; bytes memory report = abi.encode(id,true,keccak256(bytes(SPEC)),keccak256("evidence")); forwarder.deliver(receiver,report);
        (,,,,,BondlineCore.Status status,,,,,)=core.bonds(id); assertEq(uint256(status),2); assertEq(alice.balance,before+1 ether);
        vm.expectRevert(BondlineCore.NotActive.selector); forwarder.deliver(receiver,report);
    }
    function test_localFailureReservesStakeInPot() public {
        uint256 id = open(); vm.warp(block.timestamp+1 days); forwarder.deliver(receiver,abi.encode(id,false,keccak256(bytes(SPEC)),keccak256("expired")));
        assertEq(circle.balance,1 ether); assertEq(core.reservedPot(circle),1 ether);
    }
}
