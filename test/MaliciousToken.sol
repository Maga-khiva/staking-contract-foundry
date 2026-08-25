// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {StakingContract} from "../src/StakingContract.sol";

contract MaliciousToken {
    string public name = "Evil Token";
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    StakingContract public staking;
    bool public attacking;

    function setStaking(address _staking) external {
        staking = StakingContract(_staking);
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function startAttack() external {
    attacking = true;
}

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;

        // MANA BU YERDA HUJUM SODIR BO'LADI:
        if (attacking) {
            attacking = false; // cheksiz loop bo'lmasligi uchun, faqat bir marta qayta urinamiz
            staking.withdraw(0); // qaytib withdraw()ni chaqirishga urinish
        }

        return true;
    }
}