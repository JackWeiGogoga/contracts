// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GogogaTokenFaucet
 * @dev Standard token faucet contract with security best practices
 *
 * Features:
 * - Time-based cooldown mechanism to prevent abuse
 * - Configurable request amount per user
 * - Pausable for emergency stops
 * - ReentrancyGuard protection
 * - Optional total claim limit per address
 * - Immutable token address (set in constructor)
 * - Comprehensive event logging
 * - Gas optimized with custom errors
 *
 * @author Your Name
 */
contract GogogaTokenFaucet is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice The token being distributed (immutable - set once in constructor)
    IERC20 public immutable faucetToken;

    /// @notice Amount of tokens to give per request
    uint256 public requestAmount;

    /// @notice Cooldown period between requests (in seconds)
    uint256 public cooldownTime;

    /// @notice Maximum total tokens a single address can claim (0 = no limit)
    uint256 public maxClaimPerAddress;

    /// @notice Total tokens distributed by the faucet
    uint256 public totalDistributed;

    /// @notice Mapping to track last request time for each address
    mapping(address => uint256) public lastRequestTime;

    /// @notice Mapping to track total claimed amount per address
    mapping(address => uint256) public totalClaimed;

    // ==================== Events ====================

    /// @notice Emitted when tokens are requested and distributed
    event TokensRequested(address indexed user, uint256 amount, uint256 timestamp);

    /// @notice Emitted when the faucet is funded
    event FaucetFunded(address indexed funder, uint256 amount, uint256 timestamp);

    /// @notice Emitted when request amount is updated
    event RequestAmountUpdated(uint256 oldAmount, uint256 newAmount, uint256 timestamp);

    /// @notice Emitted when cooldown time is updated
    event CooldownTimeUpdated(uint256 oldTime, uint256 newTime, uint256 timestamp);

    /// @notice Emitted when max claim per address is updated
    event MaxClaimPerAddressUpdated(uint256 oldMax, uint256 newMax, uint256 timestamp);

    /// @notice Emitted when owner withdraws tokens
    event TokensWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);

    /// @notice Emitted when emergency tokens are rescued
    event TokensRescued(address indexed token, address indexed owner, uint256 amount, uint256 timestamp);

    // ==================== Custom Errors ====================

    error InvalidTokenAddress();
    error InvalidRequestAmount();
    error InvalidCooldownTime();
    error CooldownNotExpired(uint256 timeRemaining);
    error InsufficientFaucetBalance(uint256 requested, uint256 available);
    error MaxClaimLimitReached(uint256 claimed, uint256 maxAllowed);
    error NoTokensToWithdraw();
    error CannotRescueFaucetToken();

    // ==================== Constructor ====================

    /**
     * @dev Initialize the faucet contract
     * @param _faucetToken Address of the token to distribute
     * @param _requestAmount Amount of tokens per request (with decimals)
     * @param _cooldownTime Cooldown period in seconds between requests
     *
     * Requirements:
     * - Token address must not be zero
     * - Request amount must be greater than zero
     * - Cooldown time must be greater than zero
     */
    constructor(address _faucetToken, uint256 _requestAmount, uint256 _cooldownTime) Ownable(msg.sender) {
        if (_faucetToken == address(0)) revert InvalidTokenAddress();
        if (_requestAmount == 0) revert InvalidRequestAmount();
        if (_cooldownTime == 0) revert InvalidCooldownTime();

        faucetToken = IERC20(_faucetToken);
        requestAmount = _requestAmount;
        cooldownTime = _cooldownTime;
        maxClaimPerAddress = 0; // 0 = no limit by default
    }

    // ==================== External Functions ====================

    /**
     * @notice Request tokens from the faucet
     * @dev Distributes tokens to caller if cooldown period has passed
     *
     * Requirements:
     * - Contract must not be paused
     * - Caller must have waited for cooldown period
     * - Faucet must have sufficient balance
     * - Caller must not exceed max claim limit (if set)
     */
    function requestTokens() external whenNotPaused nonReentrant {
        address user = msg.sender;

        // Check cooldown period
        uint256 timeSinceLastRequest = block.timestamp - lastRequestTime[user];
        if (timeSinceLastRequest < cooldownTime) {
            revert CooldownNotExpired(cooldownTime - timeSinceLastRequest);
        }

        // Check max claim limit per address (if set)
        if (maxClaimPerAddress > 0) {
            uint256 newTotalClaimed = totalClaimed[user] + requestAmount;
            if (newTotalClaimed > maxClaimPerAddress) {
                revert MaxClaimLimitReached(totalClaimed[user], maxClaimPerAddress);
            }
        }

        // Check faucet has enough tokens
        uint256 faucetBalance = faucetToken.balanceOf(address(this));
        if (requestAmount > faucetBalance) {
            revert InsufficientFaucetBalance(requestAmount, faucetBalance);
        }

        // Update state variables BEFORE external calls (CEI pattern)
        lastRequestTime[user] = block.timestamp;
        totalClaimed[user] += requestAmount;
        totalDistributed += requestAmount;

        // Transfer tokens to user (SafeERC20 handles failures)
        faucetToken.safeTransfer(user, requestAmount);

        // Emit event
        emit TokensRequested(user, requestAmount, block.timestamp);
    }

    /**
     * @notice Fund the faucet with tokens
     * @param amount Amount of tokens to deposit
     *
     * Requirements:
     * - Caller must have approved this contract to spend tokens
     */
    function fundFaucet(uint256 amount) external {
        // Transfer tokens from sender to faucet
        faucetToken.safeTransferFrom(msg.sender, address(this), amount);

        emit FaucetFunded(msg.sender, amount, block.timestamp);
    }

    // ==================== Owner Functions ====================

    /**
     * @notice Update request amount
     * @param newAmount New amount of tokens per request
     *
     * Requirements:
     * - Only owner can call
     * - Amount must be greater than 0
     */
    function setRequestAmount(uint256 newAmount) external onlyOwner {
        if (newAmount == 0) revert InvalidRequestAmount();

        uint256 oldAmount = requestAmount;
        requestAmount = newAmount;

        emit RequestAmountUpdated(oldAmount, newAmount, block.timestamp);
    }

    /**
     * @notice Update cooldown time
     * @param newCooldownTime New cooldown period in seconds
     *
     * Requirements:
     * - Only owner can call
     * - Cooldown time must be greater than 0
     */
    function setCooldownTime(uint256 newCooldownTime) external onlyOwner {
        if (newCooldownTime == 0) revert InvalidCooldownTime();

        uint256 oldTime = cooldownTime;
        cooldownTime = newCooldownTime;

        emit CooldownTimeUpdated(oldTime, newCooldownTime, block.timestamp);
    }

    /**
     * @notice Update max claim limit per address
     * @param newMaxClaim New maximum claim amount per address (0 = no limit)
     *
     * Requirements:
     * - Only owner can call
     */
    function setMaxClaimPerAddress(uint256 newMaxClaim) external onlyOwner {
        uint256 oldMax = maxClaimPerAddress;
        maxClaimPerAddress = newMaxClaim;

        emit MaxClaimPerAddressUpdated(oldMax, newMaxClaim, block.timestamp);
    }

    /**
     * @notice Withdraw tokens from faucet
     * @param amount Amount of tokens to withdraw
     *
     * Requirements:
     * - Only owner can call
     * - Must have tokens to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = faucetToken.balanceOf(address(this));
        if (balance == 0) revert NoTokensToWithdraw();

        // Use the smaller of requested amount or available balance
        uint256 withdrawAmount = amount > balance ? balance : amount;

        faucetToken.safeTransfer(owner(), withdrawAmount);

        emit TokensWithdrawn(owner(), withdrawAmount, block.timestamp);
    }

    /**
     * @notice Rescue accidentally sent ERC20 tokens (not the faucet token)
     * @param tokenAddress Address of the token to rescue
     *
     * Requirements:
     * - Only owner can call
     * - Cannot rescue the faucet token (use withdrawTokens instead)
     */
    function rescueTokens(address tokenAddress) external onlyOwner nonReentrant {
        if (tokenAddress == address(faucetToken)) revert CannotRescueFaucetToken();

        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));

        if (balance > 0) {
            token.safeTransfer(owner(), balance);
            emit TokensRescued(tokenAddress, owner(), balance, block.timestamp);
        }
    }

    /**
     * @notice Pause faucet (emergency stop)
     *
     * Requirements:
     * - Only owner can call
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause faucet
     *
     * Requirements:
     * - Only owner can call
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== View Functions ====================

    /**
     * @notice Get time remaining until next request for an address
     * @param user Address to check
     * @return timeRemaining Seconds until next request (0 if can request now)
     */
    function getTimeUntilNextRequest(address user) external view returns (uint256 timeRemaining) {
        uint256 timeSinceLastRequest = block.timestamp - lastRequestTime[user];

        if (timeSinceLastRequest >= cooldownTime) {
            return 0;
        }

        return cooldownTime - timeSinceLastRequest;
    }

    /**
     * @notice Check if an address can request tokens now
     * @param user Address to check
     * @return canRequest True if user can request tokens
     */
    function canRequestTokens(address user) external view returns (bool canRequest) {
        // Check if paused
        if (paused()) return false;

        // Check cooldown
        uint256 timeSinceLastRequest = block.timestamp - lastRequestTime[user];
        if (timeSinceLastRequest < cooldownTime) return false;

        // Check max claim limit (if set)
        if (maxClaimPerAddress > 0) {
            if (totalClaimed[user] + requestAmount > maxClaimPerAddress) return false;
        }

        // Check faucet balance
        uint256 faucetBalance = faucetToken.balanceOf(address(this));
        if (requestAmount > faucetBalance) return false;

        return true;
    }

    /**
     * @notice Get remaining claim amount for an address
     * @param user Address to check
     * @return remainingClaim Amount that can still be claimed (max uint256 if no limit)
     */
    function getRemainingClaimAmount(address user) external view returns (uint256 remainingClaim) {
        if (maxClaimPerAddress == 0) {
            return type(uint256).max; // No limit
        }

        uint256 claimed = totalClaimed[user];
        if (claimed >= maxClaimPerAddress) {
            return 0;
        }

        return maxClaimPerAddress - claimed;
    }

    /**
     * @notice Get comprehensive faucet information
     * @return tokenAddress Address of the faucet token
     * @return tokenSymbol Symbol of the faucet token
     * @return tokenDecimals Decimals of the faucet token
     * @return faucetBalance Tokens available in the faucet
     * @return amountPerRequest Amount distributed per request
     * @return cooldown Cooldown period in seconds
     * @return maxClaimLimit Max claim per address (0 = no limit)
     * @return totalTokensDistributed Total tokens distributed so far
     * @return isPaused Whether faucet is paused
     */
    function getFaucetInfo()
        external
        view
        returns (
            address tokenAddress,
            string memory tokenSymbol,
            uint8 tokenDecimals,
            uint256 faucetBalance,
            uint256 amountPerRequest,
            uint256 cooldown,
            uint256 maxClaimLimit,
            uint256 totalTokensDistributed,
            bool isPaused
        )
    {
        return (
            address(faucetToken),
            _getTokenSymbol(),
            _getTokenDecimals(),
            faucetToken.balanceOf(address(this)),
            requestAmount,
            cooldownTime,
            maxClaimPerAddress,
            totalDistributed,
            paused()
        );
    }

    /**
     * @notice Get user claim information
     * @param user Address to check
     * @return lastRequest Timestamp of last request
     * @return totalClaimedAmount Total amount claimed by user
     * @return timeUntilNext Seconds until next request (0 if can request now)
     * @return canClaim Whether user can claim now
     */
    function getUserInfo(address user)
        external
        view
        returns (uint256 lastRequest, uint256 totalClaimedAmount, uint256 timeUntilNext, bool canClaim)
    {
        uint256 timeSinceLastRequest = block.timestamp - lastRequestTime[user];
        uint256 timeRemaining = timeSinceLastRequest >= cooldownTime ? 0 : cooldownTime - timeSinceLastRequest;

        bool userCanClaim = !paused() && timeSinceLastRequest >= cooldownTime
            && (maxClaimPerAddress == 0 || totalClaimed[user] + requestAmount <= maxClaimPerAddress)
            && requestAmount <= faucetToken.balanceOf(address(this));

        return (lastRequestTime[user], totalClaimed[user], timeRemaining, userCanClaim);
    }

    // ==================== Internal Functions ====================

    /**
     * @dev Safely get token decimals
     */
    function _getTokenDecimals() internal view returns (uint8) {
        // Try to get decimals, default to 18 if not available
        try IERC20Metadata(address(faucetToken)).decimals() returns (uint8 decimals) {
            return decimals;
        } catch {
            return 18;
        }
    }

    /**
     * @dev Safely get token symbol
     */
    function _getTokenSymbol() internal view returns (string memory) {
        try IERC20Metadata(address(faucetToken)).symbol() returns (string memory symbol) {
            return symbol;
        } catch {
            return "UNKNOWN";
        }
    }

    /**
     * @dev Prevent accidental ETH transfers
     */
    receive() external payable {
        revert("This faucet does not accept ETH");
    }

    fallback() external payable {
        revert("This faucet does not accept ETH");
    }
}

/**
 * @dev Interface for ERC20 metadata (symbol, decimals)
 */
interface IERC20Metadata {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}
