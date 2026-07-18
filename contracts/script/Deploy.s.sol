// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {BondlineVault} from "../src/BondlineVault.sol";
import {PodFund} from "../src/PodFund.sol";
import {PodFundFactory} from "../src/PodFundFactory.sol";

/// @notice Deploys the Bondline stack and wires it:
///   1. PodFund implementation (the clone template — never used directly)
///   2. BondlineVault (holds all escrow + voting state)
///   3. PodFundFactory (clones pods, pointed at the vault + implementation)
///   4. vault.setFactory(factory) — write-once link so the vault trusts the
///      factory's pod registry.
///
/// Run against Monad testnet:
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --verify
contract Deploy is Script {
    function run()
        external
        returns (BondlineVault vault, PodFundFactory factory, PodFund podImpl)
    {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        podImpl = new PodFund();
        vault = new BondlineVault();
        factory = new PodFundFactory(address(vault), address(podImpl));
        vault.setFactory(address(factory));

        vm.stopBroadcast();

        console2.log("PodFund implementation:", address(podImpl));
        console2.log("BondlineVault:", address(vault));
        console2.log("PodFundFactory:", address(factory));
        console2.log("");
        console2.log("web/.env.local:");
        console2.log("NEXT_PUBLIC_VAULT_ADDRESS=", address(vault));
        console2.log("NEXT_PUBLIC_FACTORY_ADDRESS=", address(factory));
    }
}
