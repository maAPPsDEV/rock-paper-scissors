const LevelTwo = artifacts.require("LevelTwo");
const Hacker = artifacts.require("Hacker");
const { expect } = require("chai");
const { BN, time, expectEvent } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");
const { getRandomHand } = require("./helpers/game_helper");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("LevelTwo", function ([_owner, _hacker, _charlie]) {
  let playerHand;
  let game;
  let hackerContract;

  beforeEach(async function () {
    playerHand = getRandomHand();
    game = await LevelTwo.deployed();
    await game.withdraw(await web3.eth.getBalance(game.address));
    hackerContract = await Hacker.deployed();
  });

  it("should start fomo timer", async function () {
    await game.send(web3.utils.toWei("1", "gwei"));
    const timestamp = Math.floor(Date.now() / 1000);
    const result = await game.bet(playerHand, { value: web3.utils.toWei("1", "gwei") });
    expect(result.receipt.status).to.be.equal(true);
    expect(result.logs[0].args.endTime.toNumber()).to.be.greaterThanOrEqual(timestamp + 3600);
    expect(await game.fomoWinner()).to.be.equal(_owner);
  });

  it("should deposit fomo", async function () {
    await game.send(web3.utils.toWei("1", "gwei"));
    const prevFomo = await game.fomoPool();
    // In order to win, we use Hacker contract here.
    // Read storage of the game contract
    const randNonce = await web3.eth.getStorageAt(
      game.address, // address of the contract
      1, // index of slot - uint256 private randNonce = 0;
    );
    let result = await hackerContract.attack(game.address, randNonce, { from: _hacker, value: web3.utils.toWei("1", "gwei") });
    expect(result.receipt.status).to.equal(true);
    expect(await game.fomoPool()).to.be.bignumber.equal(prevFomo.add(new BN(web3.utils.toWei("2", "gwei")).mul(new BN(5)).div(new BN(100))));
  });

  it("should extend fomo timer", async function () {
    expect(await game.fomoWinner()).to.be.equal(_owner);
    const prevFomoEndTime = await game.fomoEndTime();
    await game.send(web3.utils.toWei("10", "gwei"));
    const result = await game.bet(playerHand, { value: web3.utils.toWei("10", "gwei"), from: _charlie });
    expect(result.receipt.status).to.be.equal(true);
    expect((await game.fomoEndTime()).gte(prevFomoEndTime.add(new BN(3600)))).to.be.equal(true);
    expect(await game.fomoWinner()).to.be.equal(_charlie);
  });

  it("should withdraw fomo to winner", async function () {
    const fomoWinner = await game.fomoWinner();
    const prevFomo = await game.fomoPool();

    // time travelling
    await time.increase(time.duration.hours(2));

    await game.send(web3.utils.toWei("1", "gwei"));
    const result = await game.bet(playerHand, { value: web3.utils.toWei("1", "gwei") });
    expect(result.receipt.status).to.be.equal(true);
    expectEvent(result.receipt, "FomoWithdraw", { winner: fomoWinner, amount: prevFomo });
  });
});
