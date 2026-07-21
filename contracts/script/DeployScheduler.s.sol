// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Scheduler.sol";

/// @notice Deploy the Scheduler contract to GIWA Sepolia.
///
/// Usage:
///   forge script contracts/script/DeployScheduler.s.sol \
///     --rpc-url https://sepolia-rpc.giwa.io \
///     --broadcast \
///     --verify \
///     --private-key $DEPLOYER_PRIVATE_KEY
///
/// After deployment, copy the printed address into:
///   SCHEDULER_CONTRACT_ADDRESS in .env
contract DeployScheduler is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deploying Scheduler from:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);
        Scheduler scheduler = new Scheduler();
        vm.stopBroadcast();

        console.log("Scheduler deployed at:", address(scheduler));
        console.log("Verify at: https://sepolia-explorer.giwa.io/address/", address(scheduler));
    }
}
