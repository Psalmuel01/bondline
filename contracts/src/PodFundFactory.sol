// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {PodFund} from "./PodFund.sol";

/// @title PodFundFactory
/// @notice Deploys a fresh PodFund clone (EIP-1167 minimal proxy) per friend
///         group, so each group gets its own distinct, shareable contract
///         address in a single transaction. Also serves as the on-chain
///         registry: the frontend reads `allPods()` / `PodCreated` events to
///         discover every group with no external indexer.
contract PodFundFactory {
    /// @notice The PodFund logic contract all clones delegate to.
    address public immutable implementation;

    /// @notice The BondlineVault every pod authorizes to move its funds. Wired
    ///         at construction and stamped into each clone at init time.
    address public immutable vault;

    address[] private _pods;
    mapping(address => bool) public isPod;

    uint16 internal constant BPS_DENOMINATOR = 10_000;
    /// @notice Floor on the approval threshold (10%). Below this a single or
    ///         zero confirmation could pass claims, gutting the whole point.
    uint16 public constant MIN_THRESHOLD_BPS = 1_000;

    error PodTooSmall();
    error ZeroMember();
    error DuplicateMember();
    error ThresholdOutOfRange();
    error ZeroAddress();

    event PodCreated(
        address indexed pod,
        address indexed creator,
        string name,
        address[] members,
        uint16 approvalThresholdBps
    );

    constructor(address vault_, address implementation_) {
        if (vault_ == address(0) || implementation_ == address(0)) revert ZeroAddress();
        vault = vault_;
        implementation = implementation_;
    }

    /// @notice Create a new pod. Validates the member set and threshold, clones
    ///         the PodFund implementation, and initializes it in one tx.
    /// @param name_ human-readable group name (display only)
    /// @param members_ fixed member list, >=2, no zero address, no duplicates
    /// @param approvalThresholdBps_ approval bar in bps, [1000, 10000]
    /// @return pod the address of the newly deployed pod clone
    function createPod(
        string calldata name_,
        address[] calldata members_,
        uint16 approvalThresholdBps_
    ) external returns (address pod) {
        if (members_.length < 2) revert PodTooSmall();
        if (approvalThresholdBps_ < MIN_THRESHOLD_BPS || approvalThresholdBps_ > BPS_DENOMINATOR) {
            revert ThresholdOutOfRange();
        }
        // O(n^2) duplicate/zero check — pods are tiny, and doing it here keeps
        // the clone's initializer trivial and gas-flat.
        for (uint256 i = 0; i < members_.length; i++) {
            if (members_[i] == address(0)) revert ZeroMember();
            for (uint256 j = i + 1; j < members_.length; j++) {
                if (members_[i] == members_[j]) revert DuplicateMember();
            }
        }

        pod = Clones.clone(implementation);
        PodFund(pod).initialize(name_, members_, approvalThresholdBps_, vault);

        _pods.push(pod);
        isPod[pod] = true;

        emit PodCreated(pod, msg.sender, name_, members_, approvalThresholdBps_);
    }

    // --- registry views ---

    function allPods() external view returns (address[] memory) {
        return _pods;
    }

    function podCount() external view returns (uint256) {
        return _pods.length;
    }
}
