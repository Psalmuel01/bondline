// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BondlineMath
/// @notice The approval-threshold math for Bondline, written once and shared by
///         both the commitment-resolution path and the fund-withdrawal path so
///         the two can never drift. All rules operate on `eligibleVoters` — for
///         a commitment that's (pod members - 1), since the creator can't vote
///         on their own claim; for a withdrawal it's the full membership.
library BondlineMath {
    uint16 internal constant BPS_DENOMINATOR = 10_000;

    /// @notice Votes needed to approve, given the eligible voter count and a
    ///         basis-point threshold. Rounds UP (a 50% bar in a 3-voter pod
    ///         needs 2, not 1) and is floored at 1 so a claim can never pass on
    ///         zero confirmations, even at a 0-ish threshold or an empty
    ///         eligible set.
    /// @dev ceil(eligibleVoters * bps / 10000) = (e*bps + 9999) / 10000.
    ///      eligibleVoters is bounded by pod size (validated small on creation),
    ///      so e*bps cannot overflow uint256.
    function requiredApprovals(uint256 eligibleVoters, uint16 bps)
        internal
        pure
        returns (uint256)
    {
        uint256 needed = (eligibleVoters * bps + (BPS_DENOMINATOR - 1)) / BPS_DENOMINATOR;
        return needed == 0 ? 1 : needed;
    }

    /// @notice True once the yes-side has cleared the bar — the trigger to
    ///         resolve a claim as approved without waiting out the window.
    function isApproved(uint256 yesVotes, uint256 required) internal pure returns (bool) {
        return yesVotes >= required;
    }

    /// @notice True once approval is mathematically unreachable — every voter
    ///         who hasn't already said no could say yes and still fall short.
    ///         This is the early-reject trigger: a doomed claim shouldn't make
    ///         the pod wait out the full window.
    /// @dev remaining possible yes = eligibleVoters - noVotes. Unreachable when
    ///      that maximum can't meet the bar.
    function isRejectable(uint256 eligibleVoters, uint256 noVotes, uint256 required)
        internal
        pure
        returns (bool)
    {
        return eligibleVoters - noVotes < required;
    }
}
