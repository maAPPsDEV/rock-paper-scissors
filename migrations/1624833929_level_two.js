const LevelTwo = artifacts.require("LevelTwo");

module.exports = function (_deployer) {
  // Use deployer to state migration tasks.
  _deployer.deploy(LevelTwo);
};
