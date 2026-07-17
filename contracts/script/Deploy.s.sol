// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ShipstakeVault} from "../src/ShipstakeVault.sol";

/// @notice Deploys ShipstakeVault. Run against Monad testnet:
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --verify
contract Deploy is Script {
    function run() external returns (ShipstakeVault vault) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        vault = new ShipstakeVault();
        vm.stopBroadcast();
        console2.log("ShipstakeVault deployed at:", address(vault));
    }
}
