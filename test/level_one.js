const LevelOne = artifacts.require("LevelOne");
const utils = require("./helpers/utils");
const { expect } = require("chai");
const { BN } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { getRandomHand, compareHand } = require("./helpers/game_helper");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */

contract("LevelOne", function (/* accounts */) {
  let playerHand;
  let game;

  beforeEach(async function () {
    playerHand = getRandomHand();
    game = await LevelOne.deployed();
    await game.withdraw(await web3.eth.getBalance(game.address));
  });

  context("fund", function () {
    it("should revert when player send insufficent fee", async function () {
      await utils.shouldThrow(game.bet(playerHand, { value: web3.utils.toWei("1000", "wei") }));
    });

    it("should revert when host has insufficient fund", async function () {
      await utils.shouldThrow(game.bet(playerHand, { value: web3.utils.toWei("1", "gwei") }));
    });
  });

  context("game", function () {
    for (i = 0; i < 10; i++) {
      it("should work in fair", async function () {
        await game.send(web3.utils.toWei("1", "gwei"));
        const result = await game.bet(playerHand, { value: web3.utils.toWei("1", "gwei") });
        expect(result.receipt.status).to.be.equal(true);
        expect(result.logs[0].args.playerHand.toNumber()).to.be.equal(playerHand);
        const hostHand = result.receipt.logs[0].args.hostHand.toNumber();
        const matchResult = compareHand(playerHand, hostHand);
        if (matchResult === 0) {
          expect(result.logs[0].event).to.be.equal("Draw");
          expect(await web3.eth.getBalance(game.address)).to.be.bignumber.equal(new BN(web3.utils.toWei("1", "gwei")));
        } else if (matchResult > 0) {
          expect(result.logs[0].event).to.be.equal("Won");
          expect(await web3.eth.getBalance(game.address)).to.be.bignumber.equal(new BN(0));
        } else {
          expect(result.logs[0].event).to.be.equal("Lost");
          expect(await web3.eth.getBalance(game.address)).to.be.bignumber.equal(new BN(web3.utils.toWei("2", "gwei")));
        }
      });
    }
  });
});
