// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BondlineMath} from "../src/BondlineMath.sol";

/// @dev Unit tests for the pure threshold math, isolated from the contracts
///      that use it. Covers the rounding-up rule, the floor-at-1 rule, and the
///      two resolution triggers across the Circle sizes / thresholds in the spec.
contract BondlineMathTest is Test {
    // --- requiredCosigns: rounds UP, floored at 1 ---

    function test_required_50pct_variousSizes() public pure {
        // eligibleCosigners = members - 1
        assertEq(BondlineMath.requiredCosigns(1, 5000), 1); // 2-member Circle: ceil(0.5)=1
        assertEq(BondlineMath.requiredCosigns(2, 5000), 1); // 3-member: ceil(1.0)=1
        assertEq(BondlineMath.requiredCosigns(3, 5000), 2); // 4-member: ceil(1.5)=2
        assertEq(BondlineMath.requiredCosigns(5, 5000), 3); // 6-member: ceil(2.5)=3
    }

    function test_required_100pct() public pure {
        assertEq(BondlineMath.requiredCosigns(1, 10000), 1);
        assertEq(BondlineMath.requiredCosigns(3, 10000), 3);
        assertEq(BondlineMath.requiredCosigns(5, 10000), 5);
    }

    function test_required_10pct_flooredAtOne() public pure {
        // 10% of a handful of cosigners rounds up but never drops below 1
        assertEq(BondlineMath.requiredCosigns(1, 1000), 1); // ceil(0.1)=1
        assertEq(BondlineMath.requiredCosigns(5, 1000), 1); // ceil(0.5)=1
        assertEq(BondlineMath.requiredCosigns(10, 1000), 1); // ceil(1.0)=1
        assertEq(BondlineMath.requiredCosigns(11, 1000), 2); // ceil(1.1)=2
    }

    function test_required_zeroEligible_flooredAtOne() public pure {
        // degenerate, but the floor must still hold
        assertEq(BondlineMath.requiredCosigns(0, 5000), 1);
    }

    // --- isCleared ---

    function test_isCleared_atAndAboveBar() public pure {
        assertFalse(BondlineMath.isCleared(1, 2));
        assertTrue(BondlineMath.isCleared(2, 2));
        assertTrue(BondlineMath.isCleared(3, 2));
    }

    // --- isUnreachable: remaining possible confirms can't reach the bar ---

    function test_isUnreachable() public pure {
        // 4-member Circle, 50% -> eligible 3, required 2.
        // 1 objection -> 2 possible confirms remain -> still reachable.
        assertFalse(BondlineMath.isUnreachable(3, 1, 2));
        // 2 objections -> 1 possible confirm remains -> unreachable.
        assertTrue(BondlineMath.isUnreachable(3, 2, 2));
    }

    function test_isUnreachable_100pct_singleObjectionKills() public pure {
        // 3-member Circle at 100% -> eligible 2, required 2. One objection makes
        // it unreachable immediately (mirrors old unanimous behavior at 100%).
        assertFalse(BondlineMath.isUnreachable(2, 0, 2));
        assertTrue(BondlineMath.isUnreachable(2, 1, 2));
    }
}
