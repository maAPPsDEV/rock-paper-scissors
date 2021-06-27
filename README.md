# Solidity Game - Rock Paper Scissors

## Task

_The task is divided into 2 "levels". You my choose to either finish both or just the first one depending on your skill level._

### Level 1 Requirement

As the bare minimum, you're required to build an on-chain rock paper scissors game that's _provable fair_. Players use Ethers for placing bets, and get nothing back in case they lose, and twice the amount otherwise.

"Provable fairness" means that any technically competent player can independently verify that the host didn't have any advantage over her in any game she played. However you implement this "provable fairness" is entirely up to you.

### Level 2 Requirement

On top of the level-1 task above, instead of giving back twice the bet amount when the player wins, 5% of that goes into a "fomo pool". Whenever a player places a bet:

- If the fomo time is off, the time is started an set to end at 1 hour from bet placement time.
- Otherwise extend the time to 1 hour from the bet placement time if the bet amount is at least 10% of the pool size.

If the fomo timer goes to zero, the last bettor that either turned on or extended the timer wins all the amount in the fomo pool, and the fomo timer is turned off.

_Hint:_

1. What is an odometer?

## What will you learn?

1. Solidity Security Consideration
2. **Underflow** and **Overflow** in use of unsigned integers

## What is the most difficult challenge?

**You won't get success to attack if the target contract has been complied in Solidity 0.8.0 or uppper** 🤔

> [**Solidity v0.8.0 Breaking Changes**](https://docs.soliditylang.org/en/v0.8.5/080-breaking-changes.html?highlight=underflow#silent-changes-of-the-semantics)
>
> Arithmetic operations revert on **underflow** and **overflow**. You can use `unchecked { ... }` to use the previous wrapping behaviour.
>
> Checks for overflow are very common, so we made them the default to increase readability of code, even if it comes at a slight increase of gas costs.

I had tried to do everything in Solidity 0.8.5 at first time, but it didn't work, as it reverted transactions everytime it met underflow.

Finally, I found that Solidity included those checks by defaults while using sliencely more gas.

So, don't you need to use [`SafeMath`](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SafeMath.sol)?

## Source Code

⚠️This contract contains a bug or risk. Do not use on mainnet!

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

contract Token {
  mapping(address => uint256) balances;
  uint256 public totalSupply;

  constructor(uint256 _initialSupply) public {
    balances[msg.sender] = totalSupply = _initialSupply;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    require(balances[msg.sender] - _value >= 0);
    balances[msg.sender] -= _value;
    balances[_to] += _value;
    return true;
  }

  function balanceOf(address _owner) public view returns (uint256 balance) {
    return balances[_owner];
  }
}

```

## Security Considerations - Random Numbers

All good games require some level of randomness. So how do we generate random numbers in Solidity?

The real answer here is, you can't. Well, at least you can't do it safely.

Let's look at why.

### Random number generation via `keccak256`

The best source of randomness we have in Solidity is the `keccak256` hash function.

We could do something like the following to generate a random number:

```
// Generate a random number between 1 and 100:
uint randNonce = 0;
uint random = uint(keccak256(abi.encodePacked(now, msg.sender, randNonce))) % 100;
randNonce++;
uint random2 = uint(keccak256(abi.encodePacked(now, msg.sender, randNonce))) % 100;
```

What this would do is take the timestamp of `now`, the `msg.sender`, and an incrementing `nonce` (a number that is only ever used once, so we don't run the same hash function with the same input parameters twice).

It would then "pack" the inputs and use `keccak` to convert them to a random hash. Next, it would convert that hash to a `uint`, and then use `% 100` to take only the last 2 digits. This will give us a totally random number between 0 and 99.

### This method is vulnerable to attack by a dishonest node

In Ethereum, when you call a function on a contract, you broadcast it to a node or nodes on the network as a **_transaction_**. The nodes on the network then collect a bunch of transactions, try to be the first to solve a computationally-intensive mathematical problem as a "Proof of Work", and then publish that group of transactions along with their Proof of Work (PoW) as a **_block_** to the rest of the network.

Once a node has solved the PoW, the other nodes stop trying to solve the PoW, verify that the other node's list of transactions are valid, and then accept the block and move on to trying to solve the next block.

**This makes our random number function exploitable.**

Let's say we had a coin flip contract — heads you double your money, tails you lose everything. Let's say it used the above random function to determine heads or tails. (`random >= 50` is heads, `random < 50` is tails).

If I were running a node, I could publish a transaction **only to my own node** and not share it. I could then run the coin flip function to see if I won — and if I lost, choose not to include that transaction in the next block I'm solving. I could keep doing this indefinitely until I finally won the coin flip and solved the next block, and profit.

## So how do we generate random numbers safely in Ethereum?

Because the entire contents of the blockchain are visible to all participants, this is a hard problem, and its solution is beyond the scope of this tutorial. You can read <a href="https://ethereum.stackexchange.com/questions/191/how-can-i-securely-generate-a-random-number-in-my-smart-contract" target=_new>this StackOverflow thread</a> for some ideas. One idea would be to use an **_oracle_** to access a random number function from outside of the Ethereum blockchain.

Of course, since tens of thousands of Ethereum nodes on the network are competing to solve the next block, my odds of solving the next block are extremely low. It would take me a lot of time or computing resources to exploit this profitably — but if the reward were high enough (like if I could bet $100,000,000 on the coin flip function), it would be worth it for me to attack.

So while this random number generation is NOT secure on Ethereum, in practice unless our random function has a lot of money on the line, the users of your game likely won't have enough resources to attack it.

Because we're just building a simple game for demo purposes in this tutorial and there's no real money on the line, we're going to accept the tradeoffs of using a random number generator that is simple to implement, knowing that it isn't totally secure.

In our other repositories, we may cover using **_oracles_** (a secure way to pull data in from outside of Ethereum) to generate secure random numbers from outside the blockchain.

## Configuration

### Install Truffle cli

_Skip if you have already installed._

```
npm install -g truffle
```

### Install Dependencies

```
yarn install
```

## Test and Attack!💥

### Run Tests

```
truffle develop
test
```

You should take ownership of the target contract successfully.

```
truffle(develop)> test
Using network 'develop'.


Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.



  Contract: Hacker
    √ should steal countless of tokens (377ms)


  1 passing (440ms)

```
