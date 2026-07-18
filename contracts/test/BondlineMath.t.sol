// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {BondlineMath} from "../src/BondlineMath.sol";

/// @dev Unit tests for the pure threshold math, isolated from the contracts
///      that use it. Covers the rounding-up rule, the floor-at-1 rule, and the
///      two resolution triggers across the pod sizes / thresholds in the spec.
contract BondlineMathTest is Test {
    // --- requiredApprovals: rounds UP, floored at 1 ---

    function test_required_50pct_variousSizes() public pure {
        // eligibleVoters = members - 1
        assertEq(BondlineMath.requiredApprovals(1, 5000), 1); // 2-member pod: ceil(0.5)=1
        assertEq(BondlineMath.requiredApprovals(2, 5000), 1); // 3-member: ceil(1.0)=1
        assertEq(BondlineMath.requiredApprovals(3, 5000), 2); // 4-member: ceil(1.5)=2
        assertEq(BondlineMath.requiredApprovals(5, 5000), 3); // 6-member: ceil(2.5)=3
    }

    function test_required_100pct() public pure {
        assertEq(BondlineMath.requiredApprovals(1, 10000), 1);
        assertEq(BondlineMath.requiredApprovals(3, 10000), 3);
        assertEq(BondlineMath.requiredApprovals(5, 10000), 5);
    }

    function test_required_10pct_flooredAtOne() public pure {
        // 10% of a handful of voters rounds up but never drops below 1
        assertEq(BondlineMath.requiredApprovals(1, 1000), 1); // ceil(0.1)=1
        assertEq(BondlineMath.requiredApprovals(5, 1000), 1); // ceil(0.5)=1
        assertEq(BondlineMath.requiredApprovals(10, 1000), 1); // ceil(1.0)=1
        assertEq(BondlineMath.requiredApprovals(11, 1000), 2); // ceil(1.1)=2
    }

    function test_required_zeroEligible_flooredAtOne() public pure {
        // degenerate, but the floor must still hold
        assertEq(BondlineMath.requiredApprovals(0, 5000), 1);
    }

    // --- isApproved ---

    function test_isApproved_atAndAboveBar() public pure {
        assertFalse(BondlineMath.isApproved(1, 2));
        assertTrue(BondlineMath.isApproved(2, 2));
        assertTrue(BondlineMath.isApproved(3, 2));
    }

    // --- isRejectable: remaining possible yes can't reach the bar ---

    function test_isRejectable() public pure {
        // 4-member pod, 50% -> eligible 3, required 2.
        // 1 no -> 2 possible yes remain -> still reachable.
        assertFalse(BondlineMath.isRejectable(3, 1, 2));
        // 2 no -> 1 possible yes remains -> unreachable -> rejectable.
        assertTrue(BondlineMath.isRejectable(3, 2, 2));
    }

    function test_isRejectable_100pct_singleNoKills() public pure {
        // 3-member pod at 100% -> eligible 2, required 2. One no makes it
        // unreachable immediately (mirrors old unanimous behavior at 100%).
        assertFalse(BondlineMath.isRejectable(2, 0, 2));
        assertTrue(BondlineMath.isRejectable(2, 1, 2));
    }
}
