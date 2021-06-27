// SPDX-License-Identifier: MIT
pragma solidity >=0.8.5 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LevelOne is Ownable {
  /// @notice The kind of hand we can bet, explicitly convertable to uint8.
  enum Hand {
    rock,
    paper,
    scissors
  }

  /**
   * Events
   *
   * @param player - The address of player
   * @param playerHand - The hand of player
   * @param hostHand - The hand of host
   * @param amount - The amount of Ether used to bet
   */
  event Won(address indexed player, Hand playerHand, Hand hostHand, uint256 amount);
  event Draw(address indexed player, Hand playerHand, Hand hostHand, uint256 amount);
  event Lost(address indexed player, Hand playerHand, Hand hostHand, uint256 amount);

  /**
   * The nonce used to generate random.
   * @dev Not secure! Never! 😞 Hacker can read the value on storage, even though it's private.
   * That means Hacker may create a hacking contract which never lose, by simulating our random function.
   */
  uint256 private randNonce = 0;

  /**
   * The minimal bet fee to play game.
   * Player needs to pay Ether to bet.
   * Before betting, player may need to check host's balance to see if it has enough Ether to pay when player wins.
   */
  uint256 public constant MINIMAL_BET_FEE = 1e9;

  /**
   * Play a bet.
   * Player needs to send Ether to bet, the amount is required greater than the bet fee.
   * Also, Host needs to have as sufficient Ether as at least the double of amount to return when lose.
   * If Player won, returns the double amount of Ether used to bet.
   * If Player lost, do nothing.
   * If draw, returns just the amount of Ether used to bet.
   */
  function bet(Hand _playerHand) external payable {
    require(msg.value >= MINIMAL_BET_FEE, "LevelOne: Insufficient bet bee.");
    /// @dev Bet fee has been included to the host balance already at the point.
    require(address(this).balance >= msg.value * 2, "LevelOne: Insufficient host fund.");
    Hand hostHand = getRandomHand();
    int8 result = compareHand(_playerHand, hostHand);
    if (result == 0) {
      // equal
      // Return player's Ether
      returnFund(msg.value);
      emit Draw(msg.sender, _playerHand, hostHand, msg.value);
      return;
    } else if (result > 0) {
      // player won! 😄
      // Loser host!!!!!! 😫 😫 😫. Return double of player's Ether
      /// @dev safe for overflow, because we compile in v0.8.0
      returnFund(msg.value * 2);
      emit Won(msg.sender, _playerHand, hostHand, msg.value);
      return;
    }

    // host won, keep the Ether 💰
    // Nothing to do.
    emit Lost(msg.sender, _playerHand, hostHand, msg.value);
  }

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

  /**
   * Get the host's hand based on random number.
   *
   * @return a different hand every time called.
   */
  function getRandomHand() internal returns (Hand) {
    uint256 rand = randMod(90);
    if (rand < 30) {
      return Hand.rock;
    } else if (rand < 60) {
      return Hand.paper;
    }
    return Hand.scissors;
  }

  /**
   * Generate random number between 0 to _modulus.
   * Not secure! 😞
   *
   * @param _modulus - The max - 1 of the random number range
   */
  function randMod(uint256 _modulus) internal returns (uint256) {
    return uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, ++randNonce))) % _modulus;
  }

  /**
   * Return Ether to player.
   *
   * @param _amount - The amount of Ether to return depends on the match result
   */
  function returnFund(uint256 _amount) private {
    payable(msg.sender).transfer(_amount);
  }

  /**
   * Receive Ether, that will be used to pay winning players.
   */
  receive() external payable {}

  /**
   * Withdraw Ether to owner, the only way to take back Ether for owner.
   *
   * @param _amount - The amount to withdraw
   */
  function withdraw(uint256 _amount) external onlyOwner {
    require(address(this).balance >= _amount, "LevelOne: Insufficient balance to withdraw.");
    address payable _owner = payable(address(uint160(owner())));
    _owner.transfer(_amount);
  }
}
