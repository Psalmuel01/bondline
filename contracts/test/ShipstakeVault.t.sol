// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ShipstakeVault} from "../src/ShipstakeVault.sol";

contract ShipstakeVaultTest is Test {
    ShipstakeVault vault;

    address creator = makeAddr("creator");
    address witness = makeAddr("witness");
    address beneficiary = makeAddr("beneficiary");
    address stranger = makeAddr("stranger");

    uint64 deadline;

    function setUp() public {
        vault = new ShipstakeVault();
        deadline = uint64(block.timestamp + 1 days);
        vm.deal(creator, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    function _create(uint256 stake) internal returns (uint256 id) {
        vm.prank(creator);
        id = vault.createCommitment{value: stake}("Ship Privara milestone 2", deadline, witness, beneficiary);
    }

    // --- creation ---

    function test_create_storesCommitment() public {
        uint256 id = _create(1 ether);
        (
            address c,
            address w,
            address b,
            uint96 stake,
            uint64 dl,
            ShipstakeVault.Status status,
            string memory desc
        ) = vault.commitments(id);

        assertEq(c, creator);
        assertEq(w, witness);
        assertEq(b, beneficiary);
        assertEq(stake, 1 ether);
        assertEq(dl, deadline);
        assertEq(uint256(status), uint256(ShipstakeVault.Status.Active));
        assertEq(desc, "Ship Privara milestone 2");
        assertEq(address(vault).balance, 1 ether);
        assertEq(vault.commitmentCount(), 1);
    }

    function test_create_incrementsIds() public {
        assertEq(_create(1 ether), 0);
        assertEq(_create(1 ether), 1);
    }

    function test_create_revertsOnZeroStake() public {
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.StakeRequired.selector);
        vault.createCommitment{value: 0}("x", deadline, witness, beneficiary);
    }

    function test_create_revertsOnPastDeadline() public {
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.DeadlineInPast.selector);
        vault.createCommitment{value: 1 ether}("x", uint64(block.timestamp), witness, beneficiary);
    }

    function test_create_revertsOnZeroWitness() public {
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.WitnessRequired.selector);
        vault.createCommitment{value: 1 ether}("x", deadline, address(0), beneficiary);
    }

    function test_create_revertsOnZeroBeneficiary() public {
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.BeneficiaryRequired.selector);
        vault.createCommitment{value: 1 ether}("x", deadline, witness, address(0));
    }

    function test_create_revertsWhenWitnessIsCreator() public {
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.WitnessCannotBeCreator.selector);
        vault.createCommitment{value: 1 ether}("x", deadline, creator, beneficiary);
    }

    function test_create_revertsWhenBeneficiaryIsCreator() public {
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.BeneficiaryCannotBeCreator.selector);
        vault.createCommitment{value: 1 ether}("x", deadline, witness, creator);
    }

    function test_create_revertsWhenWitnessIsBeneficiary() public {
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.WitnessCannotBeBeneficiary.selector);
        vault.createCommitment{value: 1 ether}("x", deadline, witness, witness);
    }

    function test_create_revertsOnStakeTooLarge() public {
        uint256 tooBig = uint256(type(uint96).max) + 1;
        vm.deal(creator, tooBig);
        vm.prank(creator);
        vm.expectRevert(ShipstakeVault.StakeTooLarge.selector);
        vault.createCommitment{value: tooBig}("x", deadline, witness, beneficiary);
    }

    // --- markComplete (refund path) ---

    function test_markComplete_refundsCreator() public {
        uint256 id = _create(1 ether);
        uint256 before = creator.balance;

        vm.prank(witness);
        vault.markComplete(id);

        assertEq(creator.balance, before + 1 ether);
        assertEq(address(vault).balance, 0);
        (, , , uint96 stake, , ShipstakeVault.Status status, ) = vault.commitments(id);
        assertEq(uint256(status), uint256(ShipstakeVault.Status.Completed));
        assertEq(stake, 1 ether); // stake kept as historical record
    }

    function test_markComplete_onlyWitness() public {
        uint256 id = _create(1 ether);
        vm.prank(stranger);
        vm.expectRevert(ShipstakeVault.NotWitness.selector);
        vault.markComplete(id);
    }

    function test_markComplete_revertsAfterDeadline() public {
        uint256 id = _create(1 ether);
        vm.warp(deadline);
        vm.prank(witness);
        vm.expectRevert(ShipstakeVault.DeadlinePassed.selector);
        vault.markComplete(id);
    }

    function test_markComplete_revertsIfNotActive() public {
        uint256 id = _create(1 ether);
        vm.prank(witness);
        vault.markComplete(id);
        vm.prank(witness);
        vm.expectRevert(ShipstakeVault.NotActive.selector);
        vault.markComplete(id);
    }

    function test_markComplete_revertsOnMissingCommitment() public {
        vm.prank(witness);
        vm.expectRevert(ShipstakeVault.NoSuchCommitment.selector);
        vault.markComplete(999);
    }

    // --- claimForfeit ---

    function test_claimForfeit_sendsToBeneficiary() public {
        uint256 id = _create(1 ether);
        vm.warp(deadline);
        uint256 before = beneficiary.balance;

        vm.prank(stranger); // permissionless
        vault.claimForfeit(id);

        assertEq(beneficiary.balance, before + 1 ether);
        assertEq(address(vault).balance, 0);
        (, , , uint96 stake, , ShipstakeVault.Status status, ) = vault.commitments(id);
        assertEq(uint256(status), uint256(ShipstakeVault.Status.Forfeited));
        assertEq(stake, 1 ether); // stake kept as historical record
    }

    function test_claimForfeit_revertsBeforeDeadline() public {
        uint256 id = _create(1 ether);
        vm.prank(stranger);
        vm.expectRevert(ShipstakeVault.DeadlineNotReached.selector);
        vault.claimForfeit(id);
    }

    function test_claimForfeit_revertsIfCompleted() public {
        uint256 id = _create(1 ether);
        vm.prank(witness);
        vault.markComplete(id);
        vm.warp(deadline);
        vm.prank(stranger);
        vm.expectRevert(ShipstakeVault.NotActive.selector);
        vault.claimForfeit(id);
    }

    function test_claimForfeit_revertsOnDoubleClaim() public {
        uint256 id = _create(1 ether);
        vm.warp(deadline);
        vm.prank(stranger);
        vault.claimForfeit(id);
        vm.prank(stranger);
        vm.expectRevert(ShipstakeVault.NotActive.selector);
        vault.claimForfeit(id);
    }

    // --- isForfeitable ---

    function test_isForfeitable_transitions() public {
        uint256 id = _create(1 ether);
        assertFalse(vault.isForfeitable(id));
        vm.warp(deadline);
        assertTrue(vault.isForfeitable(id));
        vm.prank(stranger);
        vault.claimForfeit(id);
        assertFalse(vault.isForfeitable(id));
    }

    // --- reentrancy ---
    // The fund recipient is the only party that can re-enter (its receive() runs
    // during the .call). On markComplete that's the creator; on claimForfeit the
    // beneficiary. We make that recipient a malicious contract and prove the stake
    // can't be drained twice.

    function test_markComplete_reentrancyGuarded() public {
        ReentrantCreator attacker = new ReentrantCreator(vault);
        vm.deal(address(attacker), 10 ether);

        // attacker is the creator; refund flows back into its receive()
        uint256 id = attacker.create{value: 1 ether}("x", deadline, witness, beneficiary);

        vm.prank(witness);
        // receive() re-enters markComplete -> status already Completed / guard trips -> whole tx reverts
        vm.expectRevert();
        vault.markComplete(id);
    }

    function test_claimForfeit_reentrancyGuarded() public {
        ReentrantBeneficiary attacker = new ReentrantBeneficiary(vault);
        vm.prank(creator);
        uint256 id =
            vault.createCommitment{value: 1 ether}("x", deadline, witness, address(attacker));

        vm.warp(deadline);
        vm.expectRevert();
        vault.claimForfeit(id);
    }

    // --- fuzz ---

    function testFuzz_create_and_forfeit(uint96 stake, uint64 dt) public {
        stake = uint96(bound(stake, 1, 1_000 ether));
        dt = uint64(bound(dt, 1, 3650 days));
        vm.deal(creator, uint256(stake));

        vm.prank(creator);
        uint256 id = vault.createCommitment{value: stake}(
            "fuzz", uint64(block.timestamp + dt), witness, beneficiary
        );

        vm.warp(block.timestamp + dt);
        uint256 before = beneficiary.balance;
        vault.claimForfeit(id);
        assertEq(beneficiary.balance, before + stake);
    }
}

/// @dev Malicious creator: the refund recipient in markComplete. Its receive()
///      re-enters markComplete on the same id, attempting a double refund.
contract ReentrantCreator {
    ShipstakeVault vault;
    uint256 target;

    constructor(ShipstakeVault _vault) {
        vault = _vault;
    }

    function create(string calldata desc, uint64 deadline, address witness, address beneficiary)
        external
        payable
        returns (uint256 id)
    {
        id = vault.createCommitment{value: msg.value}(desc, deadline, witness, beneficiary);
        target = id;
    }

    receive() external payable {
        // Fires during the refund .call; guard must make this re-entry revert.
        vault.markComplete(target);
    }
}

/// @dev Malicious beneficiary: the fund recipient in claimForfeit. Its receive()
///      re-enters claimForfeit on the same id, attempting a double payout.
contract ReentrantBeneficiary {
    ShipstakeVault vault;
    uint256 public target;

    constructor(ShipstakeVault _vault) {
        vault = _vault;
    }

    function setTarget(uint256 id) external {
        target = id;
    }

    receive() external payable {
        vault.claimForfeit(target);
    }
}
