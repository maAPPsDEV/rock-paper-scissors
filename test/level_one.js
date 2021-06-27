const LevelOne = artifacts.require("LevelOne");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("LevelOne", function (/* accounts */) {
  it("should assert true", async function () {
    await LevelOne.deployed();
    return assert.isTrue(true);
  });
});
