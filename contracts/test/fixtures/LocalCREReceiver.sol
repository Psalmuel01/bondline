// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {BondlineCore} from "../../src/BondlineCore.sol";

/// @dev CLI-simulation adapter ONLY. The official MockForwarder does not carry
/// production workflow identity metadata. This fixture can never be deployed
/// on Monad mainnet/testnet. BondlineCREVerifier stays strict and unchanged.
contract LocalCREReceiver {
    BondlineCore public immutable core;
    address public immutable mockForwarder;
    error SimulationOnly();
    error WrongForwarder();
    error InvalidReport();
    event LocalReportSettled(uint256 indexed commitmentId, bool success, bytes32 evidenceHash);
    constructor(address core_, address forwarder_) {
        if (block.chainid != 31337 || core_.code.length == 0 || forwarder_.code.length == 0) revert SimulationOnly();
        core = BondlineCore(core_);
        if (core.protocolVersion() != 2) revert SimulationOnly();
        mockForwarder = forwarder_;
    }
    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == this.onReport.selector;
    }
    function onReport(bytes calldata, bytes calldata report) external {
        if (msg.sender != mockForwarder) revert WrongForwarder();
        if (report.length != 128) revert InvalidReport();
        (uint256 id, bool success, bytes32 conditionHash, bytes32 evidenceHash) = abi.decode(report, (uint256, bool, bytes32, bytes32));
        core.attest(id, success, conditionHash, evidenceHash);
        emit LocalReportSettled(id, success, evidenceHash);
    }
}
