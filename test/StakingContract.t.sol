// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StakingContract} from "../src/StakingContract.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {MaliciousToken} from "./MaliciousToken.sol";

contract StakingContractTest is Test {
    StakingContract public staking;
    MockERC20 public token;

    address public user1 = address(0x1);

    function setUp() public {
        token = new MockERC20();
        staking = new StakingContract(address(token), 1e9);
        token.mint(user1, 1000e18);
    }

    function test_Stake() public {
        vm.prank(user1);
        token.approve(address(staking), 100e18);

        vm.prank(user1);
        staking.stake(100e18);

        assertEq(token.balanceOf(address(staking)), 100e18);

        (uint256 amount, ) = staking.stakes(user1, 0);
        assertEq(amount, 100e18);
    }

    function test_Withdraw() public {
    token.mint(address(this), 1000e18);
    token.approve(address(staking), 1000e18);
    staking.fundRewards(1000e18);

    vm.prank(user1);
    token.approve(address(staking), 100e18);
    vm.prank(user1);
    staking.stake(100e18);

    vm.warp(block.timestamp + 10 days);

    vm.prank(user1);
    staking.withdraw(0);

    uint256 expectedReward = 100e18 * 864000 * 1e9/ 1e18;
    assertEq(token.balanceOf(user1), 900e18 + 100e18 + expectedReward);
}

function test_RevertWhen_InvalidIndex() public {
    vm.prank(user1);
    vm.expectRevert("Invalid index");
    staking.withdraw(0); // hech qachon stake qilinmagan, shuning uchun index 0 mavjud emas
}

function test_RevertWhen_StakeZeroAmount() public {
    vm.prank(user1);
    vm.expectRevert("Invalid amount");
    staking.stake(0);
}

function test_ReentrancyProtection() public {
    MaliciousToken evilToken = new MaliciousToken();
    StakingContract vulnerableStaking = new StakingContract(address(evilToken), 1e9);
    evilToken.setStaking(address(vulnerableStaking));

    evilToken.mint(address(this), 1000e18);
    evilToken.approve(address(vulnerableStaking), 100e18);
    vulnerableStaking.stake(100e18);

    evilToken.mint(address(this), 1000e18);
    evilToken.approve(address(vulnerableStaking), 1000e18);
    vulnerableStaking.fundRewards(1000e18);

    vm.warp(block.timestamp + 10 days);

    evilToken.startAttack();

    vm.expectRevert("Invalid index");
    vulnerableStaking.withdraw(0);
}

function test_WithdrawWithInsufficientRewardPool() public {
    vm.prank(user1);
    token.approve(address(staking), 100e18);

    vm.prank(user1);
    staking.stake(100e18);

    vm.warp(block.timestamp + 10 days);

    vm.prank(user1);
    staking.withdraw(0);

    // rewardPool = 0 edi, demak reward berilmagan, faqat amount qaytgan
    assertEq(token.balanceOf(user1), 900e18 + 100e18);
}
function test_SetRewardRate_Owner() public {
    // owner (test kontraktining o'zi, chunki setUp()da staking = new StakingContract(...) address(this) nomidan chaqirilgan)
    staking.setRewardRate(1e8);
    assertEq(staking.rewardRate(), 1e8);  }

function test_RevertWhen_SetRewardRate_NotOwner() public {
    vm.prank(user1);
    vm.expectRevert("Not the owner");
     staking.setRewardRate(1e10); 
}

function test_TransferOwnership() public {
    staking.transferOwnership(user1);
    assertEq(staking.owner(), user1);
}

function test_RevertWhen_TransferOwnershipToZeroAddress() public {
    vm.expectRevert("New owner cannot be zero address");
    staking.transferOwnership(address(0));
}
}