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
    struct Progress { uint256 current; uint256 target; uint64 checkedAt; uint8 outcome; bytes32 evidenceHash; }
    struct ProductReport { uint256 commitmentId; uint8 outcome; bytes32 conditionHash; bytes32 evidenceHash; uint256 current; uint256 target; uint64 checkedAt; }
    mapping(uint256 => Progress) public progress;
    event VerificationProgress(uint256 indexed commitmentId, uint256 current, uint256 target, uint64 checkedAt, uint8 outcome, bytes32 evidenceHash);
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
        // Product reports carry authenticated progress. Legacy settlement reports
        // remain supported for the reproducible developer simulation.
        if (report.length == 224) {
            _productReport(id, report);
            return;
        }
        if (report.length != 128) revert InvalidReport();
        (uint256 commitmentId, bool success, bytes32 conditionHash, bytes32 evidenceHash) = abi.decode(report, (uint256, bool, bytes32, bytes32));
        core.attest(commitmentId, success, conditionHash, evidenceHash);
        emit ReportSettled(id, commitmentId, success, evidenceHash);
    }
    function _productReport(bytes32 workflowId, bytes calldata report) private {
        ProductReport memory r = abi.decode(report, (ProductReport));
        (BondlineCore.VerifierType kind, address verifier,,bytes32 expectedHash,uint64 createdAt) = core.verification(r.commitmentId);
        (,,,uint64 deadline,,BondlineCore.Status status,,,,,) = core.bonds(r.commitmentId);
        if (kind != BondlineCore.VerifierType.External || verifier != address(this) || expectedHash != r.conditionHash || status != BondlineCore.Status.Active) revert InvalidReport();
        if (r.outcome > 2 || r.target == 0 || r.current > r.target || r.evidenceHash == bytes32(0) || r.checkedAt < createdAt || r.checkedAt > block.timestamp) revert InvalidReport();
        if ((r.outcome == 0 && (r.current >= r.target || r.checkedAt >= deadline)) || (r.outcome == 1 && (r.current < r.target || r.checkedAt >= deadline)) || (r.outcome == 2 && r.checkedAt < deadline)) revert InvalidReport();
        Progress memory previous = progress[r.commitmentId];
        if (r.checkedAt < previous.checkedAt) revert InvalidReport();
        if (r.checkedAt == previous.checkedAt) {
            if (r.evidenceHash != previous.evidenceHash || r.current != previous.current || r.outcome != previous.outcome || r.target != previous.target) revert InvalidReport();
            return;
        }
        progress[r.commitmentId] = Progress(r.current, r.target, r.checkedAt, r.outcome, r.evidenceHash);
        emit VerificationProgress(r.commitmentId, r.current, r.target, r.checkedAt, r.outcome, r.evidenceHash);
        if (r.outcome != 0) {
            core.attest(r.commitmentId, r.outcome == 1, r.conditionHash, r.evidenceHash);
            emit ReportSettled(workflowId, r.commitmentId, r.outcome == 1, r.evidenceHash);
        }
    }
}
