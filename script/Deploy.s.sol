// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {StakingContract} from "../src/StakingContract.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        MockERC20 token = new MockERC20();
        StakingContract staking = new StakingContract(address(token), 1e9);

        vm.stopBroadcast();

        console.log("MockERC20 deployed at:", address(token));
        console.log("StakingContract deployed at:", address(staking));
    }
}