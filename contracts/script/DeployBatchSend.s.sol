// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/BatchSend.sol";

contract DeployBatchSend is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        BatchSend batchSend = new BatchSend();
        console.log("BatchSend deployed at:", address(batchSend));
        vm.stopBroadcast();
    }
}