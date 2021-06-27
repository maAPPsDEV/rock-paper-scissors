const LevelOne = artifacts.require("LevelOne");

module.exports = function (_deployer) {
  // Use deployer to state migration tasks.
  _deployer.deploy(LevelOne);
};
