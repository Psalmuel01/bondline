// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BondlineCore} from "./BondlineCore.sol";

/// @notice Production CRE receiver. The configured forwarder authenticates DON
/// signatures; this receiver additionally binds reports to one workflow owner
/// and name. Register this receiver as a trusted verifier in the existing Core.
/// No custody, upgrade proxy, direct-key attestation, or funds are held here.
contract BondlineCREVerifier {
    BondlineCore public immutable core;
    address public immutable forwarder;
    address public immutable workflowOwner;
    bytes10 public immutable workflowName;

    error InvalidConfiguration();
    error UnauthorizedForwarder();
    error InvalidMetadata();
    error WrongWorkflow();
    error InvalidReport();
    event ReportSettled(bytes32 indexed workflowId, uint256 indexed commitmentId, bool success, bytes32 evidenceHash);

    constructor(address core_, address forwarder_, address owner_, bytes10 name_) {
        if (core_.code.length == 0 || forwarder_.code.length == 0 || owner_ == address(0) || name_ == bytes10(0)) revert InvalidConfiguration();
        core = BondlineCore(core_);
        if (core.protocolVersion() != 2) revert InvalidConfiguration();
        forwarder = forwarder_;
        workflowOwner = owner_;
        workflowName = name_;
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == this.onReport.selector;
    }

    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != forwarder) revert UnauthorizedForwarder();
        // Production forwarder metadata is 64 bytes, with a 62-byte identity
        // prefix and a two-byte report ID. Accept packed 62-byte tooling too.
        if (metadata.length != 62 && metadata.length != 64) revert InvalidMetadata();
        bytes32 id = bytes32(metadata[0:32]);
        bytes10 name = bytes10(metadata[32:42]);
        address owner = address(bytes20(metadata[42:62]));
        if (id == bytes32(0) || name != workflowName || owner != workflowOwner) revert WrongWorkflow();
        if (report.length != 128) revert InvalidReport();
        (uint256 commitmentId, bool success, bytes32 conditionHash, bytes32 evidenceHash) = abi.decode(report, (uint256, bool, bytes32, bytes32));
        core.attest(commitmentId, success, conditionHash, evidenceHash);
        emit ReportSettled(id, commitmentId, success, evidenceHash);
    }
}
