// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Crowdfunding} from "./Crowdfunding.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Crowdfunding Factory Contract
 * @author JackWei
 * @notice Factory contract for creating and managing multiple crowdfunding campaigns
 * @dev Deploys new Crowdfunding contract instances and tracks all created campaigns
 */
contract CrowdfundingFactory is Ownable, Pausable {
    /// @notice Represents a crowdfunding campaign record
    struct Campaign {
        address campaignAddress; // Address of the deployed campaign contract
        address owner; // Address of the campaign owner
        string name; // Name of the campaign
        uint256 createdAt; // Timestamp when the campaign was created
    }

    // Campaign storage
    Campaign[] public campaigns; // Array of all created campaigns
    mapping(address => Campaign[]) userCampaigns; // Mapping of user address to their campaigns

    // Events

    /// @notice Emitted when a new campaign is created
    /// @param campaignAddress The address of the newly created campaign contract
    /// @param owner The address of the campaign owner
    /// @param name The name of the campaign
    /// @param goal The funding goal in wei
    /// @param deadline The campaign deadline timestamp
    event CampaignCreated(
        address indexed campaignAddress, address indexed owner, string name, uint256 goal, uint256 deadline
    );

    /**
     * @notice Initializes the factory contract
     * @dev Sets the deployer as the factory owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Creates a new crowdfunding campaign
     * @dev Deploys a new Crowdfunding contract and registers it in the factory
     * @param _name The name of the campaign
     * @param _description A description of the campaign
     * @param _icon Campaign icon (IPFS hash or URL)
     * @param _goal The funding goal in wei
     * @param _durationInDays The duration of the campaign in days
     * @param _minContribution The minimum contribution amount (set 0 to disable custom funding)
     * @param _tierNames Array of tier names (can be empty for no initial tiers)
     * @param _tierAmounts Array of tier amounts (must match _tierNames length)
     */
    function createCampaign(
        string memory _name,
        string memory _description,
        string memory _icon,
        uint256 _goal,
        uint256 _durationInDays,
        uint256 _minContribution,
        string[] memory _tierNames,
        uint256[] memory _tierAmounts
    ) external whenNotPaused {
        Crowdfunding newCampaign = new Crowdfunding(
            msg.sender, _name, _description, _icon, _goal, _durationInDays, _minContribution, _tierNames, _tierAmounts
        );
        address campaignAddress = address(newCampaign);

        Campaign memory campaign = Campaign(campaignAddress, msg.sender, _name, block.timestamp);
        campaigns.push(campaign);
        userCampaigns[msg.sender].push(campaign);

        uint256 deadline = block.timestamp + (_durationInDays * 1 days);
        emit CampaignCreated(campaignAddress, msg.sender, _name, _goal, deadline);
    }

    /**
     * @notice Retrieves all campaigns created by a specific user
     * @param _user The address of the user
     * @return An array of campaigns created by the user
     */
    function getUserCampaigns(address _user) external view returns (Campaign[] memory) {
        return userCampaigns[_user];
    }

    /**
     * @notice Retrieves all campaigns created through this factory
     * @return An array of all campaigns
     */
    function getAllCampaigns() external view returns (Campaign[] memory) {
        return campaigns;
    }

    /**
     * @notice Returns the total number of campaigns created
     * @return The total count of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    /**
     * @notice Pauses the factory
     * @dev When paused, new campaigns cannot be created
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses the factory
     * @dev Allows new campaigns to be created again
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
