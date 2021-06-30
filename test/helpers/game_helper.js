const Hand = {
  rock: 0,
  paper: 1,
  scissors: 2,
};

const wonEventSignature = web3.utils.keccak256("Won(address,uint8,uint8,uint256)");

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function getRandomHand() {
  const rand = getRandomInt(90);
  if (rand < 30) {
    return Hand.rock;
  } else if (rand < 60) {
    return Hand.paper;
  }
  return Hand.scissors;
}

function compareHand(a, b) {
  if (a === b) return 0;
  if ((a + 1) % 3 === b) return -1;
  return 1;
}

module.exports = {
  Hand,
  wonEventSignature,
  getRandomInt,
  getRandomHand,
  compareHand,
};
