# Staking Contract

A Solidity staking contract that lets users stake ERC20 tokens and earn time-based rewards, built and tested with Foundry.

## Overview

Users stake tokens, and rewards accrue linearly based on how long each stake has been active. The contract owner (or anyone) funds a reward pool separately from the staking mechanism, keeping user principal and protocol rewards cleanly separated.

## Features

- **Stake** — deposit ERC20 tokens, tracked per-user with individual timestamps
- **Fund Rewards** — top up the reward pool independently of staking
- **Withdraw** — returns principal + accrued reward; reward is capped to whatever remains in the pool, so a user's principal is never locked even if the pool runs dry

## Security

- **Checks-Effects-Interactions pattern** in `withdraw()` — state is updated (array pop, reward pool deduction) *before* the external token transfer, preventing reentrancy
- **Reentrancy tested directly** — `test/MaliciousToken.sol` simulates a malicious ERC20 that attempts to re-enter `withdraw()` during the transfer callback; the attack correctly reverts
- **Reward pool depletion handled gracefully** — if accrued reward exceeds the pool, the user still receives their full principal plus whatever reward is available, rather than reverting and locking their funds
- **Transfer return values checked** — all ERC20 transfers use `require()` to guard against tokens that fail silently instead of reverting

## Gas Optimization

Deployment cost reduced by ~9.5% (1,196,384 → 1,083,109 gas) through:

- **`immutable` for `STAKING_TOKEN`** — avoids storage reads on every token interaction, since the address never changes after deployment
- **Extracted modifier logic** — `onlyOwner` calls an internal `_onlyOwner()` function instead of inlining the check, reducing bytecode duplication across multiple protected functions
- **Storage references in `withdraw()`** — caches `stakes[msg.sender]` as a local `storage` pointer instead of re-reading the mapping on every array access

All 10 tests pass after each optimization — verified with `forge test --gas-report` before and after.

## Tests

6 Foundry tests covering the core paths:

| Test | Purpose |
|---|---|
| `test_Stake` | Verifies staking updates balances and storage correctly |
| `test_Withdraw` | Full withdraw flow: principal + reward calculation |
| `test_WithdrawWithInsufficientRewardPool` | Confirms principal is never locked, even with an empty reward pool |
| `test_RevertWhen_InvalidIndex` | Rejects withdrawals on non-existent stakes |
| `test_RevertWhen_StakeZeroAmount` | Rejects zero-amount stakes |
| `test_ReentrancyProtection` | Simulates a live reentrancy attack via a malicious token and confirms it fails |

## Running locally

```bash
forge build
forge test -vvv
```

## Stack

- Solidity ^0.8.20
- Foundry (forge)