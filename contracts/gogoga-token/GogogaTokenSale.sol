// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GogogaTokenSale
 * @dev Standard token sale contract with security best practices
 *
 * Features:
 * - Buy GOGOGA tokens with ETH at a fixed rate
 * - Pausable for emergency stops
 * - ReentrancyGuard protection
 * - Pull payment pattern for ETH withdrawals
 * - Minimum and maximum purchase limits
 * - Immutable token address (set in constructor)
 * - Comprehensive event logging
 * - Gas optimized with custom errors
 *
 * @author Your Name
 */
contract GogogaTokenSale is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice The token being sold (immutable - set once in constructor)
    IERC20 public immutable saleToken;

    /// @notice Price: how much ETH needed to buy 1 token (with decimals)
    /// @dev Example: 0.001 ether = 1 token costs 0.001 ETH
    uint256 public tokenPriceInEth;

    /// @notice Total amount of tokens sold
    uint256 public totalTokensSold;

    /// @notice Total ETH raised
    uint256 public totalEthRaised;

    /// @notice Minimum ETH amount per purchase
    uint256 public minPurchaseAmount;

    /// @notice Maximum ETH amount per purchase (0 = no limit)
    uint256 public maxPurchaseAmount;

    /// @notice Accumulated ETH waiting to be withdrawn by owner
    uint256 public pendingWithdrawals;

    // ==================== Events ====================

    /// @notice Emitted when tokens are purchased
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 timestamp);

    /// @notice Emitted when token price is updated
    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);

    /// @notice Emitted when purchase limits are updated
    event PurchaseLimitsUpdated(uint256 minAmount, uint256 maxAmount, uint256 timestamp);

    /// @notice Emitted when owner withdraws ETH
    event EthWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);

    /// @notice Emitted when owner withdraws remaining tokens
    event TokensWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);

    /// @notice Emitted when emergency tokens are rescued
    event TokensRescued(address indexed token, address indexed owner, uint256 amount, uint256 timestamp);

    // ==================== Custom Errors ====================

    error InvalidTokenAddress();
    error InvalidPrice();
    error InvalidPurchaseAmount();
    error BelowMinimumPurchase(uint256 sent, uint256 minimum);
    error AboveMaximumPurchase(uint256 sent, uint256 maximum);
    error InsufficientTokenBalance(uint256 requested, uint256 available);
    error NoEthToWithdraw();
    error NoTokensToWithdraw();
    error CannotRescueSaleToken();
    error EthTransferFailed();

    // ==================== Constructor ====================

    /**
     * @dev Initialize the token sale contract
     * @param _saleToken Address of the token to sell
     * @param _tokenPrice Token price in ETH (e.g., 0.001 ether means 1 token costs 0.001 ETH)
     *
     * Requirements:
     * - Token address must not be zero
     * - Price must be greater than zero
     */
    constructor(address _saleToken, uint256 _tokenPrice) Ownable(msg.sender) {
        if (_saleToken == address(0)) revert InvalidTokenAddress();
        if (_tokenPrice == 0) revert InvalidPrice();

        saleToken = IERC20(_saleToken);
        tokenPriceInEth = _tokenPrice;
        minPurchaseAmount = 0.001 ether; // Default: 0.001 ETH minimum
        maxPurchaseAmount = 10 ether; // Default: 10 ETH maximum
    }

    // ==================== External Functions ====================

    /**
     * @notice Buy tokens with ETH
     * @dev Calculates token amount based on ETH sent and current price
     *
     * Requirements:
     * - Contract must not be paused
     * - ETH amount must be within min/max limits
     * - Contract must have enough tokens
     */
    function buyTokens() external payable whenNotPaused nonReentrant {
        // Check purchase amount limits
        if (msg.value == 0) revert InvalidPurchaseAmount();
        if (msg.value < minPurchaseAmount) {
            revert BelowMinimumPurchase(msg.value, minPurchaseAmount);
        }
        if (maxPurchaseAmount > 0 && msg.value > maxPurchaseAmount) {
            revert AboveMaximumPurchase(msg.value, maxPurchaseAmount);
        }

        // Calculate token amount to send
        uint256 tokenDecimals = _getTokenDecimals();
        uint256 tokenAmount = (msg.value * (10 ** tokenDecimals)) / tokenPriceInEth;

        // Check contract has enough tokens
        uint256 contractBalance = saleToken.balanceOf(address(this));
        if (tokenAmount > contractBalance) {
            revert InsufficientTokenBalance(tokenAmount, contractBalance);
        }

        // Update state variables BEFORE external calls (CEI pattern)
        totalTokensSold += tokenAmount;
        totalEthRaised += msg.value;
        pendingWithdrawals += msg.value;

        // Transfer tokens to buyer (SafeERC20 handles failures)
        saleToken.safeTransfer(msg.sender, tokenAmount);

        // Emit event
        emit TokensPurchased(msg.sender, msg.value, tokenAmount, block.timestamp);
    }

    // ==================== Owner Functions ====================

    /**
     * @notice Update token price
     * @param newPrice New price in ETH per token
     *
     * Requirements:
     * - Only owner can call
     * - Price must be greater than 0
     */
    function updateTokenPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert InvalidPrice();

        uint256 oldPrice = tokenPriceInEth;
        tokenPriceInEth = newPrice;

        emit PriceUpdated(oldPrice, newPrice, block.timestamp);
    }

    /**
     * @notice Update purchase limits
     * @param _minAmount Minimum ETH per purchase
     * @param _maxAmount Maximum ETH per purchase (0 = no limit)
     *
     * Requirements:
     * - Only owner can call
     */
    function updatePurchaseLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        minPurchaseAmount = _minAmount;
        maxPurchaseAmount = _maxAmount;

        emit PurchaseLimitsUpdated(_minAmount, _maxAmount, block.timestamp);
    }

    /**
     * @notice Withdraw accumulated ETH (Pull payment pattern)
     * @dev Owner withdraws ETH from sales
     *
     * Requirements:
     * - Only owner can call
     * - Must have ETH to withdraw
     */
    function withdrawEth() external onlyOwner nonReentrant {
        uint256 amount = pendingWithdrawals;
        if (amount == 0) revert NoEthToWithdraw();

        // Reset pending withdrawals BEFORE transfer (CEI pattern)
        pendingWithdrawals = 0;

        // Transfer ETH
        (bool success,) = payable(owner()).call{value: amount}("");
        if (!success) revert EthTransferFailed();

        emit EthWithdrawn(owner(), amount, block.timestamp);
    }

    /**
     * @notice Withdraw remaining unsold tokens
     * @dev Owner can withdraw tokens at any time
     *
     * Requirements:
     * - Only owner can call
     * - Must have tokens to withdraw
     */
    function withdrawRemainingTokens() external onlyOwner nonReentrant {
        uint256 balance = saleToken.balanceOf(address(this));
        if (balance == 0) revert NoTokensToWithdraw();

        saleToken.safeTransfer(owner(), balance);

        emit TokensWithdrawn(owner(), balance, block.timestamp);
    }

    /**
     * @notice Rescue accidentally sent ERC20 tokens (not the sale token)
     * @param tokenAddress Address of the token to rescue
     *
     * Requirements:
     * - Only owner can call
     * - Cannot rescue the sale token (use withdrawRemainingTokens instead)
     */
    function rescueTokens(address tokenAddress) external onlyOwner nonReentrant {
        if (tokenAddress == address(saleToken)) revert CannotRescueSaleToken();

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));

        if (balance > 0) {
            token.safeTransfer(owner(), balance);
            emit TokensRescued(tokenAddress, owner(), balance, block.timestamp);
        }
    }

    /**
     * @notice Pause token sales (emergency stop)
     *
     * Requirements:
     * - Only owner can call
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause token sales
     *
     * Requirements:
     * - Only owner can call
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== View Functions ====================

    /**
     * @notice Get comprehensive contract information
     * @return tokenAddress Address of the sale token
     * @return tokenSymbol Symbol of the sale token
     * @return tokenDecimals Decimals of the sale token
     * @return contractTokenBalance Tokens available in this contract
     * @return priceInEth Current price per token in ETH
     * @return totalSold Total tokens sold so far
     * @return totalRaised Total ETH raised so far
     * @return minPurchase Minimum ETH per purchase
     * @return maxPurchase Maximum ETH per purchase
     * @return isPaused Whether sales are paused
     */
    function getContractInfo()
        external
        view
        returns (
            address tokenAddress,
            string memory tokenSymbol,
            uint8 tokenDecimals,
            uint256 contractTokenBalance,
            uint256 priceInEth,
            uint256 totalSold,
            uint256 totalRaised,
            uint256 minPurchase,
            uint256 maxPurchase,
            bool isPaused
        )
    {
        return (
            address(saleToken),
            _getTokenSymbol(),
            _getTokenDecimals(),
            saleToken.balanceOf(address(this)),
            tokenPriceInEth,
            totalTokensSold,
            totalEthRaised,
            minPurchaseAmount,
            maxPurchaseAmount,
            paused()
        );
    }

    /**
     * @notice Calculate how many tokens can be bought with given ETH amount
     * @param ethAmount Amount of ETH
     * @return tokenAmount Amount of tokens that can be purchased
     */
    function calculateTokenAmount(uint256 ethAmount) external view returns (uint256 tokenAmount) {
        uint256 tokenDecimals = _getTokenDecimals();
        tokenAmount = (ethAmount * (10 ** tokenDecimals)) / tokenPriceInEth;
    }

    /**
     * @notice Calculate how much ETH is needed to buy given amount of tokens
     * @param tokenAmount Amount of tokens
     * @return ethAmount Amount of ETH needed
     */
    function calculateEthAmount(uint256 tokenAmount) external view returns (uint256 ethAmount) {
        uint256 tokenDecimals = _getTokenDecimals();
        ethAmount = (tokenAmount * tokenPriceInEth) / (10 ** tokenDecimals);
    }

    // ==================== Internal Functions ====================

    /**
     * @dev Safely get token decimals
     */
    function _getTokenDecimals() internal view returns (uint8) {
        // Try to get decimals, default to 18 if not available
        try IERC20Metadata(address(saleToken)).decimals() returns (uint8 decimals) {
            return decimals;
        } catch {
            return 18;
        }
    }

    /**
     * @dev Safely get token symbol
     */
    function _getTokenSymbol() internal view returns (string memory) {
        try IERC20Metadata(address(saleToken)).symbol() returns (string memory symbol) {
            return symbol;
        } catch {
            return "UNKNOWN";
        }
    }

    /**
     * @dev Prevent accidental ETH transfers
     */
    receive() external payable {
        revert("Use buyTokens() function");
    }

    fallback() external payable {
        revert("Use buyTokens() function");
    }
}

/**
 * @dev Interface for ERC20 metadata (symbol, decimals)
 */
interface IERC20Metadata {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}
