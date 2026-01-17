// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GogogaToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    // Custom errors (more gas efficient than require statements)
    error CannotMintToZeroAddress();
    error ExceedsMaxSupply(uint256 requested, uint256 available);

    uint256 public constant MAX_SUPPLY = 1000000000 * 10 ** 18;

    constructor() ERC20("GogogaToken", "GOGOGA") Ownable(msg.sender) {
        // Initial mint 1 million tokens to deployer
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @dev Mint tokens to a specified address. Only owner can call this function.
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (including decimals, e.g., 1 token = 1 * 10**18)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) {
            revert CannotMintToZeroAddress();
        }

        uint256 newTotalSupply = totalSupply() + amount;
        if (newTotalSupply > MAX_SUPPLY) {
            revert ExceedsMaxSupply({requested: newTotalSupply, available: MAX_SUPPLY});
        }

        _mint(to, amount);
    }

    /**
     * @dev Pause all token transfers. Only owner can call this function.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause all token transfers. Only owner can call this function.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
