// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Crowdfunding Contract
 * @author JackWei
 * @notice A contract for crowdfunding campaigns with tier-based and custom amount funding
 * @dev Implements a flexible crowdfunding system with multiple funding tiers and custom contributions
 */
contract Crowdfunding is Ownable, Pausable {
    // Custom Errors
    error CampaignClosed();
    error TierArraysLengthMismatch();
    error TierAmountMustBeGreaterThanZero();
    error MustSendSomeETH();
    error CustomAmountNotAllowed();
    error BelowMinimumContribution();
    error TierDoesNotExist();
    error IncorrectTierAmount();
    error CampaignNotSuccessful();
    error AlreadyWithdrawn();
    error NoBalanceToWithdraw();
    error TransferFailed();
    error ArraysLengthMismatch();
    error MustAddAtLeastOneTier();
    error CampaignNotFailed();
    error NoContributionToRefund();
    error MinContributionMustBeGreaterThanZero();
    error DaysToAddMustBeGreaterThanZero();
    error NameCannotBeEmpty();
    error DescriptionCannotBeEmpty();

    /// @notice States of a crowdfunding campaign
    enum CampaignState {
        Active, // Campaign is ongoing and accepting funds
        Successful, // Campaign has reached its goal
        Failed // Campaign has ended without reaching its goal
    }

    /// @notice Represents a funding tier with a fixed amount
    struct Tier {
        string name; // Name of the tier
        uint256 amount; // Required contribution amount for this tier
        uint256 backers; // Number of backers who funded this tier
    }

    /// @notice Tracks a backer's contributions
    struct Backer {
        uint256 totalContribution; // Total amount contributed by the backer
        uint256 customContribution; // Amount contributed via custom funding
        mapping(uint256 => bool) fundedTiers; // Mapping of tier index to funded status
    }

    // Special constant for custom amount funding
    uint256 public constant CUSTOM_TIER_INDEX = type(uint256).max;

    // Campaign information
    string public name;
    string public description;
    string public icon; // Cover image URL or IPFS hash
    uint256 public goal;
    uint256 public deadline;
    uint256 public createdAt; // Timestamp when the campaign was created

    // Campaign controls
    bool public withdrawn; // Indicates whether funds have been withdrawn

    // Funding configuration
    uint256 public minContribution; // Minimum contribution amount for custom funding
    bool public allowCustomAmount; // Whether custom amount funding is enabled
    uint256 public customBackerCount; // Number of backers who used custom funding

    // Funding tiers
    Tier[] public tiers;

    // Backer information
    mapping(address => Backer) public backers;
    address[] public backerAddresses; // Array of all backer addresses

    // Events

    /// @notice Emitted when a backer contributes funds to the campaign
    /// @param backer The address of the backer
    /// @param tierIndex The tier index funded (CUSTOM_TIER_INDEX for custom amount)
    /// @param amount The amount contributed in wei
    /// @param totalContribution The backer's total contribution after this fund
    event Funded(address indexed backer, uint256 indexed tierIndex, uint256 amount, uint256 totalContribution);

    /// @notice Emitted when the campaign owner withdraws funds
    /// @param owner The address of the campaign owner
    /// @param amount The amount withdrawn in wei
    /// @param timestamp The timestamp of the withdrawal
    event FundsWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);

    /// @notice Emitted when a backer receives a refund
    /// @param backer The address of the backer
    /// @param amount The amount refunded in wei
    event Refunded(address indexed backer, uint256 amount);

    /// @notice Emitted when a new tier is added
    /// @param tierIndex The index of the new tier
    /// @param name The name of the tier
    /// @param amount The contribution amount for the tier
    event TierAdded(uint256 indexed tierIndex, string name, uint256 amount);

    /// @notice Emitted when a tier is removed
    /// @param tierIndex The index of the removed tier
    /// @param name The name of the removed tier
    event TierRemoved(uint256 indexed tierIndex, string name);

    /// @notice Emitted when the campaign is paused or unpaused
    /// @param isPaused Whether the campaign is now paused
    event CampaignPausedToggled(bool isPaused);

    /// @notice Emitted when the campaign deadline is extended
    /// @param oldDeadline The previous deadline timestamp
    /// @param newDeadline The new deadline timestamp
    /// @param daysAdded The number of days added
    event DeadlineExtended(uint256 oldDeadline, uint256 newDeadline, uint256 daysAdded);

    /// @notice Emitted when the minimum contribution amount is updated
    /// @param oldMinContribution The previous minimum contribution
    /// @param newMinContribution The new minimum contribution
    event MinContributionUpdated(uint256 oldMinContribution, uint256 newMinContribution);

    /// @notice Emitted when custom amount funding is toggled
    /// @param isAllowed Whether custom amount funding is now allowed
    event CustomAmountToggled(bool isAllowed);

    /// @notice Emitted when the campaign icon is updated
    /// @param oldIcon The previous icon URL/hash
    /// @param newIcon The new icon URL/hash
    event IconUpdated(string oldIcon, string newIcon);

    /// @notice Emitted when the campaign name is updated
    /// @param oldName The previous campaign name
    /// @param newName The new campaign name
    event NameUpdated(string oldName, string newName);

    /// @notice Emitted when the campaign description is updated
    /// @param oldDescription The previous campaign description
    /// @param newDescription The new campaign description
    event DescriptionUpdated(string oldDescription, string newDescription);

    // Modifiers

    /// @notice Ensures the campaign is in Active state
    modifier campaignOpen() {
        if (getState() != CampaignState.Active) revert CampaignClosed();
        _;
    }

    /**
     * @notice Creates a new crowdfunding campaign
     * @param _owner The address of the campaign owner
     * @param _name The name of the campaign
     * @param _description A description of the campaign
     * @param _icon Cover image URL or IPFS hash (e.g., ipfs://Qm...)
     * @param _goal The funding goal in wei
     * @param _durationInDays The duration of the campaign in days
     * @param _minContribution The minimum contribution amount (set 0 to disable custom funding)
     * @param _tierNames Array of tier names (can be empty)
     * @param _tierAmounts Array of tier amounts (must match _tierNames length)
     */
    constructor(
        address _owner,
        string memory _name,
        string memory _description,
        string memory _icon,
        uint256 _goal,
        uint256 _durationInDays,
        uint256 _minContribution,
        string[] memory _tierNames,
        uint256[] memory _tierAmounts
    ) Ownable(_owner) {
        if (_tierNames.length != _tierAmounts.length) revert TierArraysLengthMismatch();

        name = _name;
        description = _description;
        icon = _icon;
        goal = _goal;
        createdAt = block.timestamp;
        deadline = block.timestamp + (_durationInDays * 1 days);
        minContribution = _minContribution;
        allowCustomAmount = _minContribution > 0; // Enable if min > 0

        // Add initial tiers
        for (uint256 i = 0; i < _tierNames.length; i++) {
            if (_tierAmounts[i] == 0) revert TierAmountMustBeGreaterThanZero();
            tiers.push(Tier(_tierNames[i], _tierAmounts[i], 0));
            emit TierAdded(i, _tierNames[i], _tierAmounts[i]);
        }
    }

    /**
     * @notice Dynamically calculates the current state of the campaign
     * @dev Best practice: state is derived from conditions, not stored
     * @return The current state of the campaign
     */
    function getState() public view returns (CampaignState) {
        // If funds have been withdrawn, campaign is successful
        if (withdrawn) {
            return CampaignState.Successful;
        }

        // Deadline has passed
        if (block.timestamp >= deadline) {
            return address(this).balance >= goal ? CampaignState.Successful : CampaignState.Failed;
        }

        // Deadline not passed, but goal reached
        if (address(this).balance >= goal) {
            return CampaignState.Successful;
        }

        // Campaign is ongoing
        return CampaignState.Active;
    }

    /**
     * @notice Calculates the campaign state excluding the current transaction
     * @dev In payable functions, msg.value is already added to balance, so we exclude it
     * @return The state of the campaign before the current transaction
     */
    function getStateBeforeCurrentTx() internal view returns (CampaignState) {
        uint256 balanceBeforeTx = address(this).balance - msg.value;

        if (block.timestamp >= deadline) {
            return balanceBeforeTx >= goal ? CampaignState.Successful : CampaignState.Failed;
        }

        if (balanceBeforeTx >= goal) {
            return CampaignState.Successful;
        }

        return CampaignState.Active;
    }

    /**
     * @notice Contributes funds to the campaign
     * @dev Supports both tier-based and custom amount funding
     * @param _tierIndex The index of the tier to fund, or CUSTOM_TIER_INDEX for custom amount
     */
    function fund(uint256 _tierIndex) public payable whenNotPaused {
        // Check the state before the current transaction
        if (getStateBeforeCurrentTx() != CampaignState.Active) revert CampaignClosed();
        if (msg.value == 0) revert MustSendSomeETH();

        // Track new backer
        if (backers[msg.sender].totalContribution == 0) {
            backerAddresses.push(msg.sender);
        }

        // Custom amount funding
        if (_tierIndex == CUSTOM_TIER_INDEX) {
            if (!allowCustomAmount) revert CustomAmountNotAllowed();
            if (msg.value < minContribution) revert BelowMinimumContribution();

            // Track custom contribution separately
            if (backers[msg.sender].customContribution == 0) {
                customBackerCount++;
            }
            backers[msg.sender].customContribution += msg.value;
            backers[msg.sender].totalContribution += msg.value;

            emit Funded(msg.sender, CUSTOM_TIER_INDEX, msg.value, backers[msg.sender].totalContribution);
        }
        // Tier-based funding
        else {
            if (_tierIndex >= tiers.length) revert TierDoesNotExist();
            if (msg.value != tiers[_tierIndex].amount) revert IncorrectTierAmount();

            tiers[_tierIndex].backers++;
            backers[msg.sender].totalContribution += msg.value;
            backers[msg.sender].fundedTiers[_tierIndex] = true;

            emit Funded(msg.sender, _tierIndex, msg.value, backers[msg.sender].totalContribution);
        }
    }

    /**
     * @notice Withdraws funds from a successful campaign
     * @dev Can only be called by the owner once, and only if the campaign was successful
     */
    function withdraw() public onlyOwner {
        if (getState() != CampaignState.Successful) revert CampaignNotSuccessful();
        if (withdrawn) revert AlreadyWithdrawn();
        if (address(this).balance == 0) revert NoBalanceToWithdraw();

        withdrawn = true;
        uint256 balance = address(this).balance;

        (bool success,) = payable(owner()).call{value: balance}("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(owner(), balance, block.timestamp);
    }

    /**
     * @notice Returns the current balance of the contract
     * @return The balance in wei
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Adds a new funding tier to the campaign
     * @param _name The name of the tier
     * @param _amount The contribution amount required for this tier
     */
    function addTier(string memory _name, uint256 _amount) public onlyOwner {
        if (_amount == 0) revert TierAmountMustBeGreaterThanZero();
        uint256 tierIndex = tiers.length;
        tiers.push(Tier(_name, _amount, 0));
        emit TierAdded(tierIndex, _name, _amount);
    }

    /**
     * @notice Adds multiple funding tiers at once
     * @dev More gas efficient than calling addTier multiple times
     * @param _names Array of tier names
     * @param _amounts Array of tier amounts (must match _names length)
     */
    function addTiers(string[] memory _names, uint256[] memory _amounts) public onlyOwner {
        if (_names.length != _amounts.length) revert ArraysLengthMismatch();
        if (_names.length == 0) revert MustAddAtLeastOneTier();

        for (uint256 i = 0; i < _names.length; i++) {
            if (_amounts[i] == 0) revert TierAmountMustBeGreaterThanZero();
            uint256 tierIndex = tiers.length;
            tiers.push(Tier(_names[i], _amounts[i], 0));
            emit TierAdded(tierIndex, _names[i], _amounts[i]);
        }
    }

    /**
     * @notice Removes a funding tier from the campaign
     * @dev Swaps the tier with the last element and pops the array
     * @param _index The index of the tier to remove
     */
    function removeTier(uint256 _index) external onlyOwner {
        if (_index >= tiers.length) revert TierDoesNotExist();
        string memory tierName = tiers[_index].name;
        tiers[_index] = tiers[tiers.length - 1];
        tiers.pop();
        emit TierRemoved(_index, tierName);
    }

    /**
     * @notice Refunds a backer's contribution if the campaign failed
     * @dev Can only be called if the campaign has failed and the caller has contributions
     */
    function refund() public {
        if (getState() != CampaignState.Failed) revert CampaignNotFailed();
        uint256 amount = backers[msg.sender].totalContribution;
        if (amount == 0) revert NoContributionToRefund();

        // Reset contributions
        backers[msg.sender].totalContribution = 0;
        backers[msg.sender].customContribution = 0;

        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Refunded(msg.sender, amount);
    }

    /**
     * @notice Checks if a backer has funded a specific tier
     * @param _backer The address of the backer
     * @param _tierIndex The index of the tier
     * @return Whether the backer has funded the specified tier
     */
    function hasFundedTier(address _backer, uint256 _tierIndex) public view returns (bool) {
        return backers[_backer].fundedTiers[_tierIndex];
    }

    /**
     * @notice Returns all funding tiers
     * @return An array of all tiers
     */
    function getTiers() public view returns (Tier[] memory) {
        return tiers;
    }

    /**
     * @notice Returns detailed information about a backer
     * @param _backer The address of the backer
     * @return totalContribution Total amount contributed
     * @return customContribution Amount contributed via custom funding
     */
    function getBackerInfo(address _backer)
        public
        view
        returns (uint256 totalContribution, uint256 customContribution)
    {
        return (backers[_backer].totalContribution, backers[_backer].customContribution);
    }

    /**
     * @notice Returns all backer addresses
     * @return An array of all backer addresses
     */
    function getAllBackers() public view returns (address[] memory) {
        return backerAddresses;
    }

    /**
     * @notice Returns the total number of unique backers
     * @return The count of unique backers
     */
    function getBackerCount() public view returns (uint256) {
        return backerAddresses.length;
    }

    /**
     * @notice Returns campaign statistics
     * @return totalBackers Total number of unique backers
     * @return totalTierBackers Total backers who used tiers
     * @return totalCustomBackers Total backers who used custom funding
     * @return currentBalance Current contract balance
     * @return remainingAmount Amount needed to reach goal
     */
    function getCampaignStats()
        public
        view
        returns (
            uint256 totalBackers,
            uint256 totalTierBackers,
            uint256 totalCustomBackers,
            uint256 currentBalance,
            uint256 remainingAmount
        )
    {
        uint256 balance = address(this).balance;
        uint256 tierBackers = 0;

        for (uint256 i = 0; i < tiers.length; i++) {
            tierBackers += tiers[i].backers;
        }

        return (backerAddresses.length, tierBackers, customBackerCount, balance, balance >= goal ? 0 : goal - balance);
    }

    /**
     * @notice Toggles the custom amount funding feature
     * @dev Can only be called by the owner
     */
    function toggleCustomAmount() public onlyOwner {
        allowCustomAmount = !allowCustomAmount;
        emit CustomAmountToggled(allowCustomAmount);
    }

    /**
     * @notice Updates the minimum contribution amount
     * @param _newMinContribution The new minimum contribution amount
     */
    function updateMinContribution(uint256 _newMinContribution) public onlyOwner {
        if (_newMinContribution == 0) revert MinContributionMustBeGreaterThanZero();
        uint256 oldMinContribution = minContribution;
        minContribution = _newMinContribution;
        emit MinContributionUpdated(oldMinContribution, _newMinContribution);
    }

    /**
     * @notice Pauses the campaign
     * @dev Can only be called by the owner when the campaign is open
     */
    function pause() public onlyOwner campaignOpen {
        _pause();
    }

    /**
     * @notice Unpauses the campaign
     * @dev Can only be called by the owner when the campaign is open
     */
    function unpause() public onlyOwner campaignOpen {
        _unpause();
    }

    /**
     * @notice Extends the campaign deadline
     * @param _daysToAdd The number of days to add to the deadline
     */
    function extendDeadline(uint256 _daysToAdd) public onlyOwner campaignOpen {
        if (_daysToAdd == 0) revert DaysToAddMustBeGreaterThanZero();
        uint256 oldDeadline = deadline;
        deadline += _daysToAdd * 1 days;
        emit DeadlineExtended(oldDeadline, deadline, _daysToAdd);
    }

    /**
     * @notice Updates the campaign name
     * @param _newName New campaign name
     */
    function updateName(string memory _newName) public onlyOwner {
        if (bytes(_newName).length == 0) revert NameCannotBeEmpty();
        string memory oldName = name;
        name = _newName;
        emit NameUpdated(oldName, _newName);
    }

    /**
     * @notice Updates the campaign description
     * @param _newDescription New campaign description
     */
    function updateDescription(string memory _newDescription) public onlyOwner {
        if (bytes(_newDescription).length == 0) revert DescriptionCannotBeEmpty();
        string memory oldDescription = description;
        description = _newDescription;
        emit DescriptionUpdated(oldDescription, _newDescription);
    }

    /**
     * @notice Updates the campaign cover icon
     * @param _newIcon New cover image URL or IPFS hash
     */
    function updateIcon(string memory _newIcon) public onlyOwner {
        string memory oldIcon = icon;
        icon = _newIcon;
        emit IconUpdated(oldIcon, _newIcon);
    }
}
