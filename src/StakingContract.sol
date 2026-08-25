// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract StakingContract {
    IERC20 public stakingToken;

    struct Stake {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Stake[]) public stakes;
    uint256 public rewardPool;
    uint256 public rewardRate;
    uint256 public constant PRECISION = 1e18;
    address public owner;
    modifier onlyOwner() {
    require(msg.sender == owner, "Not the owner");
    _;
}

    event Staked(address indexed user, uint256 amount);
    event RewardsFunded(address indexed funder, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 expectedReward, uint256 actualReward);
    constructor(address _stakingToken, uint256 _rewardRate) {
        stakingToken = IERC20(_stakingToken);
        rewardRate = _rewardRate;
        owner = msg.sender;
    }
    function setRewardRate(uint256 newRate) external onlyOwner {
    rewardRate = newRate;
}
    function stake(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        stakes[msg.sender].push(
            Stake({amount: amount, timestamp: block.timestamp})
        );
        emit Staked(msg.sender, amount);
    }

    function fundRewards(uint256 amount) external {
        require(amount > 0, "inappropriate amount");
        require(stakingToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        rewardPool += amount;
        emit RewardsFunded(msg.sender, amount);
    }

    function withdraw(uint256 index) external {
        require(index < stakes[msg.sender].length, "Invalid index");
        Stake memory userStake = stakes[msg.sender][index];
        uint256 amount = userStake.amount;
        uint256 elapsedTime = block.timestamp - userStake.timestamp;
        uint256 reward = amount * elapsedTime * rewardRate / PRECISION;
        uint256 expectedReward = reward; // cheklashdan oldingi asl qiymat
        stakes[msg.sender][index] = stakes[msg.sender][stakes[msg.sender].length - 1];
        stakes[msg.sender].pop();
        if (reward > rewardPool) {
          reward = rewardPool;
         }
        rewardPool -= reward;

        require(
        stakingToken.transfer(msg.sender, amount + reward),
        "Transfer failed"
);
     emit Withdrawn(msg.sender, amount, expectedReward, reward);    }
}