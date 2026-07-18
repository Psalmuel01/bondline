// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ShipstakeVault} from "../src/ShipstakeVault.sol";
import {PodFund} from "../src/PodFund.sol";

/// @notice Deploys PodFund + ShipstakeVault and wires their mutual reference.
///         Run against Monad testnet:
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --verify
contract Deploy is Script {
    function run() external returns (ShipstakeVault vault, PodFund podFund) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        // Order matters: PodFund first, Vault second (needs PodFund's address),
        // then wire PodFund's write-once back-reference to the Vault.
        podFund = new PodFund();
        vault = new ShipstakeVault(podFund);
        podFund.initVault(address(vault));

        vm.stopBroadcast();
        console2.log("PodFund deployed at:", address(podFund));
        console2.log("ShipstakeVault deployed at:", address(vault));
    }
}
