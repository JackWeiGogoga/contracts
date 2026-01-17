// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title GogogaTokenAirdrop
 * @dev Merkle tree-based airdrop contract with security best practices
 *
 * Features:
 * - Merkle tree verification for whitelisted addresses
 * - One-time claim per address
 * - Time-bounded airdrop (optional)
 * - Pausable for emergency stops
 * - ReentrancyGuard protection
 * - Owner can update merkle root (for multi-round airdrops)
 * - Withdraw unclaimed tokens after deadline
 *
 * How to use:
 * 1. Generate merkle tree off-chain with (address, amount) pairs
 * 2. Deploy contract with merkle root
 * 3. Transfer tokens to this contract
 * 4. Users claim with merkle proof
 *
 * @author Your Name
 */
contract GogogaTokenAirdrop is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice The token being airdropped
    IERC20 public immutable airdropToken;

    /// @notice Merkle root for verifying claims
    bytes32 public merkleRoot;

    /// @notice Airdrop start time (0 = no start time)
    uint256 public startTime;

    /// @notice Airdrop end time (0 = no end time)
    uint256 public endTime;

    /// @notice Total tokens claimed so far
    uint256 public totalClaimed;

    /// @notice Total number of claims made
    uint256 public totalClaimCount;

    /// @notice Tracks whether an address has claimed
    mapping(address => bool) public hasClaimed;

    /// @notice Tracks amount claimed by each address
    mapping(address => uint256) public claimedAmount;

    // ==================== Events ====================

    /// @notice Emitted when tokens are claimed
    event TokensClaimed(address indexed claimer, uint256 amount, uint256 timestamp);

    /// @notice Emitted when merkle root is updated
    event MerkleRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot, uint256 timestamp);

    /// @notice Emitted when time window is updated
    event TimeWindowUpdated(uint256 startTime, uint256 endTime, uint256 timestamp);

    /// @notice Emitted when unclaimed tokens are withdrawn
    event UnclaimedTokensWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);

    // ==================== Custom Errors ====================

    error InvalidTokenAddress();
    error InvalidMerkleRoot();
    error AirdropNotStarted(uint256 currentTime, uint256 startTime);
    error AirdropEnded(uint256 currentTime, uint256 endTime);
    error AlreadyClaimed(address claimer);
    error InvalidProof();
    error InsufficientContractBalance(uint256 requested, uint256 available);
    error AirdropStillActive();
    error NoTokensToWithdraw();
    error InvalidTimeWindow();

    // ==================== Constructor ====================

    /**
     * @dev Initialize the airdrop contract
     * @param _airdropToken Address of the token to airdrop
     * @param _merkleRoot Merkle root for claim verification
     * @param _startTime Airdrop start time (0 = immediate)
     * @param _endTime Airdrop end time (0 = no deadline)
     *
     * Requirements:
     * - Token address must not be zero
     * - Merkle root must not be zero
     * - If both times are set, endTime must be after startTime
     */
    constructor(address _airdropToken, bytes32 _merkleRoot, uint256 _startTime, uint256 _endTime) Ownable(msg.sender) {
        if (_airdropToken == address(0)) revert InvalidTokenAddress();
        if (_merkleRoot == bytes32(0)) revert InvalidMerkleRoot();
        if (_endTime > 0 && _startTime > 0 && _endTime <= _startTime) {
            revert InvalidTimeWindow();
        }

        airdropToken = IERC20(_airdropToken);
        merkleRoot = _merkleRoot;
        startTime = _startTime;
        endTime = _endTime;
    }

    // ==================== External Functions ====================

    /**
     * @notice Claim airdrop tokens
     * @param amount Amount of tokens to claim
     * @param merkleProof Merkle proof for verification
     *
     * Requirements:
     * - Contract must not be paused
     * - Must be within time window (if set)
     * - Must not have claimed before
     * - Must provide valid merkle proof
     * - Contract must have enough tokens
     */
    function claim(uint256 amount, bytes32[] calldata merkleProof) external whenNotPaused nonReentrant {
        // Check time window
        if (startTime > 0 && block.timestamp < startTime) {
            revert AirdropNotStarted(block.timestamp, startTime);
        }
        if (endTime > 0 && block.timestamp > endTime) {
            revert AirdropEnded(block.timestamp, endTime);
        }

        // Check if already claimed
        if (hasClaimed[msg.sender]) {
            revert AlreadyClaimed(msg.sender);
        }

        // Verify merkle proof
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            revert InvalidProof();
        }

        // Check contract has enough tokens
        uint256 contractBalance = airdropToken.balanceOf(address(this));
        if (amount > contractBalance) {
            revert InsufficientContractBalance(amount, contractBalance);
        }

        // Update state BEFORE transfer (CEI pattern)
        hasClaimed[msg.sender] = true;
        claimedAmount[msg.sender] = amount;
        totalClaimed += amount;
        totalClaimCount++;

        // Transfer tokens
        airdropToken.safeTransfer(msg.sender, amount);

        emit TokensClaimed(msg.sender, amount, block.timestamp);
    }

    // ==================== Owner Functions ====================

    /**
     * @notice Update merkle root (for new airdrop rounds)
     * @param newMerkleRoot New merkle root
     *
     * Requirements:
     * - Only owner can call
     * - New root must not be zero
     */
    function updateMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        if (newMerkleRoot == bytes32(0)) revert InvalidMerkleRoot();

        bytes32 oldRoot = merkleRoot;
        merkleRoot = newMerkleRoot;

        emit MerkleRootUpdated(oldRoot, newMerkleRoot, block.timestamp);
    }

    /**
     * @notice Update airdrop time window
     * @param _startTime New start time (0 = immediate)
     * @param _endTime New end time (0 = no deadline)
     *
     * Requirements:
     * - Only owner can call
     * - If both set, endTime must be after startTime
     */
    function updateTimeWindow(uint256 _startTime, uint256 _endTime) external onlyOwner {
        if (_endTime > 0 && _startTime > 0 && _endTime <= _startTime) {
            revert InvalidTimeWindow();
        }

        startTime = _startTime;
        endTime = _endTime;

        emit TimeWindowUpdated(_startTime, _endTime, block.timestamp);
    }

    /**
     * @notice Withdraw unclaimed tokens after airdrop ends
     * @dev Can only withdraw after endTime (if set)
     *
     * Requirements:
     * - Only owner can call
     * - Airdrop must have ended (if endTime is set)
     * - Must have tokens to withdraw
     */
    function withdrawUnclaimedTokens() external onlyOwner nonReentrant {
        // If endTime is set, must wait until it passes
        if (endTime > 0 && block.timestamp <= endTime) {
            revert AirdropStillActive();
        }

        uint256 balance = airdropToken.balanceOf(address(this));
        if (balance == 0) revert NoTokensToWithdraw();

        airdropToken.safeTransfer(owner(), balance);

        emit UnclaimedTokensWithdrawn(owner(), balance, block.timestamp);
    }

    /**
     * @notice Pause claiming (emergency stop)
     *
     * Requirements:
     * - Only owner can call
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause claiming
     *
     * Requirements:
     * - Only owner can call
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== View Functions ====================

    /**
     * @notice Check if an address can claim
     * @param account Address to check
     * @param amount Amount to claim
     * @param merkleProof Merkle proof
     * @return able Whether the address can claim
     * @return reason Reason if cannot claim
     */
    function canClaim(address account, uint256 amount, bytes32[] calldata merkleProof)
        external
        view
        returns (bool able, string memory reason)
    {
        // Check if already claimed
        if (hasClaimed[account]) {
            return (false, "Already claimed");
        }

        // Check time window
        if (startTime > 0 && block.timestamp < startTime) {
            return (false, "Airdrop not started");
        }
        if (endTime > 0 && block.timestamp > endTime) {
            return (false, "Airdrop ended");
        }

        // Check if paused
        if (paused()) {
            return (false, "Contract paused");
        }

        // Verify merkle proof
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            return (false, "Invalid proof");
        }

        // Check contract balance
        uint256 contractBalance = airdropToken.balanceOf(address(this));
        if (amount > contractBalance) {
            return (false, "Insufficient contract balance");
        }

        return (true, "");
    }

    /**
     * @notice Get comprehensive contract information
     * @return tokenAddress Address of the airdrop token
     * @return root Current merkle root
     * @return start Airdrop start time
     * @return end Airdrop end time
     * @return claimed Total tokens claimed
     * @return claimCount Total number of claims
     * @return balance Remaining tokens in contract
     * @return isPaused Whether contract is paused
     * @return isActive Whether airdrop is currently active
     */
    function getAirdropInfo()
        external
        view
        returns (
            address tokenAddress,
            bytes32 root,
            uint256 start,
            uint256 end,
            uint256 claimed,
            uint256 claimCount,
            uint256 balance,
            bool isPaused,
            bool isActive
        )
    {
        bool active = true;
        if (startTime > 0 && block.timestamp < startTime) active = false;
        if (endTime > 0 && block.timestamp > endTime) active = false;

        return (
            address(airdropToken),
            merkleRoot,
            startTime,
            endTime,
            totalClaimed,
            totalClaimCount,
            airdropToken.balanceOf(address(this)),
            paused(),
            active
        );
    }

    /**
     * @notice Get claim status for an address
     * @param account Address to check
     * @return claimed Whether the address has claimed
     * @return amount Amount claimed (0 if not claimed)
     */
    function getClaimStatus(address account) external view returns (bool claimed, uint256 amount) {
        return (hasClaimed[account], claimedAmount[account]);
    }

    // ==================== Security ====================

    /**
     * @dev Prevent accidental ETH transfers
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }

    fallback() external payable {
        revert("This contract does not accept ETH");
    }
}
