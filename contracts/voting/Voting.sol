// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Voting
 * @author Your Name
 * @notice A decentralized voting contract with comprehensive features
 * @dev Implements voting with time control, pausable functionality, and extensive query methods
 * Uses OpenZeppelin's Ownable and Pausable for standard security patterns
 */
contract Voting is Ownable, Pausable {
    /// @notice Voting status enumeration
    enum VotingStatus {
        NotStarted,
        Active,
        Ended
    }

    /// @notice Candidate structure
    struct Candidate {
        uint256 id;
        address candidateAddress;
        string name;
        uint256 voteCount;
    }

    /// @notice Voter structure
    struct Voter {
        address voterAddress;
        string name;
        uint256 votedCandidateId;
        uint256 votedAt; // Timestamp when vote was cast
    }

    // ============================================
    // State Variables
    // ============================================

    /// @notice Current voting status
    VotingStatus public votingStatus;

    /// @notice Voting start timestamp
    uint256 public votingStartTime;

    /// @notice Voting end timestamp
    uint256 public votingEndTime;

    /// @notice Candidate mapping: ID => Candidate
    mapping(uint256 => Candidate) public candidates;

    /// @notice Candidate address to ID mapping
    mapping(address => uint256) public candidateAddressToId;

    /// @notice Total number of candidates
    uint256 public candidateCount;

    /// @notice Voter mapping: address => Voter
    mapping(address => Voter) public voters;

    /// @notice Array of all voter addresses
    address[] public votersAddress;

    // ============================================
    // Events
    // ============================================

    /// @notice Emitted when a candidate is registered
    event CandidateRegistered(uint256 indexed candidateId, address indexed candidateAddress, string name);

    /// @notice Emitted when a voter is registered
    event VoterRegistered(address indexed voterAddress, string name);

    /// @notice Emitted when a vote is cast
    event VoteCast(
        address indexed voter, uint256 indexed candidateId, address indexed candidateAddress, uint256 timestamp
    );

    /// @notice Emitted when voting status changes
    event VotingStatusChanged(VotingStatus oldStatus, VotingStatus newStatus, uint256 timestamp);

    // ============================================
    // Errors
    // ============================================

    error CandidateAlreadyExists();
    error CandidateNotFound();
    error VoterAlreadyExists();
    error VoterNotFound();
    error AlreadyVoted();
    error VotingNotActive();
    error VotingAlreadyStarted();
    error VotingAlreadyEnded();
    error VotingNotEnded();
    error InvalidTimeRange();
    error ContractPaused();
    error InvalidAddress();
    error InvalidCandidateId();
    error EmptyName();

    // ============================================
    // Modifiers
    // ============================================

    /// @notice Ensures voting is active
    modifier whenVotingActive() {
        if (votingStatus != VotingStatus.Active) {
            revert VotingNotActive();
        }
        if (block.timestamp < votingStartTime || block.timestamp > votingEndTime) {
            revert VotingNotActive();
        }
        _;
    }

    // ============================================
    // Constructor
    // ============================================

    /**
     * @notice Initialize the voting contract
     * @param initialOwner Address of the contract owner
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        votingStatus = VotingStatus.NotStarted;
    }

    // ============================================
    // Owner Functions
    // ============================================

    /**
     * @notice Register a new candidate
     * @param candidateAddress Address of the candidate
     * @param name Name of the candidate
     * @dev Only owner can call this function before voting starts
     */
    function registerCandidate(address candidateAddress, string memory name) public onlyOwner {
        if (votingStatus != VotingStatus.NotStarted) {
            revert VotingAlreadyStarted();
        }
        if (candidateAddress == address(0)) {
            revert InvalidAddress();
        }
        if (bytes(name).length == 0) {
            revert EmptyName();
        }
        if (candidateAddressToId[candidateAddress] != 0) {
            revert CandidateAlreadyExists();
        }

        candidateCount++;
        candidates[candidateCount] =
            Candidate({id: candidateCount, candidateAddress: candidateAddress, name: name, voteCount: 0});
        candidateAddressToId[candidateAddress] = candidateCount;

        emit CandidateRegistered(candidateCount, candidateAddress, name);
    }

    /**
     * @notice Register a new voter
     * @param voterAddress Address of the voter
     * @param name Name of the voter
     * @dev Only owner can call this function before voting starts
     * Following best practice: no registration allowed after voting begins to ensure fairness
     */
    function registerVoter(address voterAddress, string memory name) public onlyOwner {
        if (votingStatus != VotingStatus.NotStarted) {
            revert VotingAlreadyStarted();
        }
        if (voterAddress == address(0)) {
            revert InvalidAddress();
        }
        if (bytes(name).length == 0) {
            revert EmptyName();
        }
        if (voters[voterAddress].voterAddress != address(0)) {
            revert VoterAlreadyExists();
        }

        voters[voterAddress] = Voter({voterAddress: voterAddress, name: name, votedCandidateId: 0, votedAt: 0});
        votersAddress.push(voterAddress);

        emit VoterRegistered(voterAddress, name);
    }

    /**
     * @notice Batch register multiple voters
     * @param voterAddresses Array of voter addresses
     * @param names Array of voter names
     * @dev Only owner can call this function before voting starts
     * Efficient way to register multiple voters in one transaction
     */
    function registerVoterBatch(address[] memory voterAddresses, string[] memory names) public onlyOwner {
        if (votingStatus != VotingStatus.NotStarted) {
            revert VotingAlreadyStarted();
        }
        if (voterAddresses.length != names.length) {
            revert InvalidAddress();
        }

        for (uint256 i = 0; i < voterAddresses.length; i++) {
            address voterAddress = voterAddresses[i];
            string memory name = names[i];

            if (voterAddress == address(0)) {
                revert InvalidAddress();
            }
            if (bytes(name).length == 0) {
                revert EmptyName();
            }
            if (voters[voterAddress].voterAddress != address(0)) {
                revert VoterAlreadyExists();
            }

            voters[voterAddress] = Voter({voterAddress: voterAddress, name: name, votedCandidateId: 0, votedAt: 0});
            votersAddress.push(voterAddress);

            emit VoterRegistered(voterAddress, name);
        }
    }

    /**
     * @notice Start the voting period
     * @param duration Duration of voting in seconds
     * @dev Only owner can call this function
     */
    function startVoting(uint256 duration) public onlyOwner {
        if (votingStatus != VotingStatus.NotStarted) {
            revert VotingAlreadyStarted();
        }
        if (candidateCount == 0) {
            revert CandidateNotFound();
        }
        if (duration == 0) {
            revert InvalidTimeRange();
        }

        votingStartTime = block.timestamp;
        votingEndTime = block.timestamp + duration;
        votingStatus = VotingStatus.Active;

        emit VotingStatusChanged(VotingStatus.NotStarted, VotingStatus.Active, block.timestamp);
    }

    /**
     * @notice End the voting period
     * @dev Can be called by anyone after voting end time, or by owner at any time during active voting
     * This follows the industry best practice of allowing permissionless settlement after deadline
     */
    function endVoting() public {
        if (votingStatus != VotingStatus.Active) {
            revert VotingNotActive();
        }

        // Owner can end voting at any time during active period
        // Anyone else can only end after the voting end time
        if (msg.sender != owner() && block.timestamp <= votingEndTime) {
            revert VotingNotEnded();
        }

        votingStatus = VotingStatus.Ended;
        emit VotingStatusChanged(VotingStatus.Active, VotingStatus.Ended, block.timestamp);
    }

    /**
     * @notice Check if voting can be ended
     * @return canEnd True if voting can be ended
     * @return reason Human-readable reason
     * @dev Useful for frontend to determine if endVoting() will succeed
     */
    function canEndVoting() public view returns (bool canEnd, string memory reason) {
        if (votingStatus != VotingStatus.Active) {
            return (false, "Voting is not active");
        }
        if (msg.sender == owner()) {
            return (true, "Owner can end voting at any time");
        }
        if (block.timestamp > votingEndTime) {
            return (true, "Voting period has ended, anyone can trigger settlement");
        }
        return (false, "Voting period not ended yet, only owner can end early");
    }

    /**
     * @notice Pause the contract
     * @dev Only owner can call this function. Uses OpenZeppelin's Pausable
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     * @dev Only owner can call this function. Uses OpenZeppelin's Pausable
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    // ============================================
    // Voting Functions
    // ============================================

    /**
     * @notice Vote for a candidate by address
     * @param candidateAddress Address of the candidate to vote for
     */
    function vote(address candidateAddress) public whenNotPaused whenVotingActive {
        uint256 candidateId = candidateAddressToId[candidateAddress];
        if (candidateId == 0) {
            revert CandidateNotFound();
        }
        _vote(candidateId);
    }

    /**
     * @notice Vote for a candidate by ID
     * @param candidateId ID of the candidate to vote for
     */
    function voteById(uint256 candidateId) public whenNotPaused whenVotingActive {
        if (candidateId == 0 || candidateId > candidateCount) {
            revert InvalidCandidateId();
        }
        _vote(candidateId);
    }

    /**
     * @notice Internal vote function
     * @param candidateId ID of the candidate to vote for
     */
    function _vote(uint256 candidateId) private {
        // Check if voter is registered
        if (voters[msg.sender].voterAddress == address(0)) {
            revert VoterNotFound();
        }

        // Check if already voted
        if (voters[msg.sender].votedCandidateId != 0) {
            revert AlreadyVoted();
        }

        // Record vote
        voters[msg.sender].votedCandidateId = candidateId;
        voters[msg.sender].votedAt = block.timestamp;
        candidates[candidateId].voteCount++;

        emit VoteCast(msg.sender, candidateId, candidates[candidateId].candidateAddress, block.timestamp);
    }

    // ============================================
    // Query Functions - Multi-tier Design
    // ============================================

    // Tier 1: Basic Queries (On-chain contract call friendly, gas optimized)

    /**
     * @notice Get total number of candidates
     * @return Total candidate count
     */
    function getCandidateCount() public view returns (uint256) {
        return candidateCount;
    }

    /**
     * @notice Check if an address is a registered candidate
     * @param candidateAddress Address to check
     * @return True if address is a candidate
     */
    function isCandidate(address candidateAddress) public view returns (bool) {
        return candidateAddressToId[candidateAddress] != 0;
    }

    /**
     * @notice Check if an address is a registered voter
     * @param voterAddress Address to check
     * @return True if address is a registered voter
     */
    function isVoter(address voterAddress) public view returns (bool) {
        return voters[voterAddress].voterAddress != address(0);
    }

    /**
     * @notice Get candidate details by ID
     * @param candidateId ID of the candidate
     * @return Candidate struct
     */
    function getCandidate(uint256 candidateId) public view returns (Candidate memory) {
        if (candidateId == 0 || candidateId > candidateCount) {
            revert InvalidCandidateId();
        }
        return candidates[candidateId];
    }

    /**
     * @notice Get candidate details by address
     * @param candidateAddress Address of the candidate
     * @return Candidate struct
     */
    function getCandidateByAddress(address candidateAddress) public view returns (Candidate memory) {
        uint256 candidateId = candidateAddressToId[candidateAddress];
        if (candidateId == 0) {
            revert CandidateNotFound();
        }
        return candidates[candidateId];
    }

    /**
     * @notice Get vote count for a candidate
     * @param candidateId ID of the candidate
     * @return Vote count
     */
    function getCandidateVoteCount(uint256 candidateId) public view returns (uint256) {
        if (candidateId == 0 || candidateId > candidateCount) {
            revert InvalidCandidateId();
        }
        return candidates[candidateId].voteCount;
    }

    // Tier 2: Batch Queries (Frontend UI friendly, reduces RPC calls)

    /**
     * @notice Get multiple candidates with pagination
     * @param offset Starting position (0-based)
     * @param limit Maximum number of results to return
     * @return ids Array of candidate IDs
     * @return addresses Array of candidate addresses
     * @return names Array of candidate names
     * @return voteCounts Array of vote counts
     * @dev Recommended for frontend use
     */
    function getCandidates(uint256 offset, uint256 limit)
        public
        view
        returns (uint256[] memory ids, address[] memory addresses, string[] memory names, uint256[] memory voteCounts)
    {
        uint256 start = offset + 1; // IDs start from 1
        uint256 end = offset + limit + 1;
        if (end > candidateCount + 1) {
            end = candidateCount + 1;
        }

        uint256 size = end > start ? end - start : 0;
        ids = new uint256[](size);
        addresses = new address[](size);
        names = new string[](size);
        voteCounts = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            uint256 candidateId = start + i;
            Candidate storage candidate = candidates[candidateId];
            ids[i] = candidate.id;
            addresses[i] = candidate.candidateAddress;
            names[i] = candidate.name;
            voteCounts[i] = candidate.voteCount;
        }
    }

    /**
     * @notice Get all candidates
     * @return ids Array of candidate IDs
     * @return addresses Array of candidate addresses
     * @return names Array of candidate names
     * @return voteCounts Array of vote counts
     * @dev Use with caution for large number of candidates - may exceed gas limit
     */
    function getAllCandidates()
        public
        view
        returns (uint256[] memory ids, address[] memory addresses, string[] memory names, uint256[] memory voteCounts)
    {
        return getCandidates(0, candidateCount);
    }

    // Tier 3: Voter Queries

    /**
     * @notice Get total number of voters
     * @return Total voter count
     */
    function getVoterCount() public view returns (uint256) {
        return votersAddress.length;
    }

    /**
     * @notice Get voter information (returns struct, modern recommended approach)
     * @param voterAddress Address of the voter
     * @return Voter struct
     */
    function getVoter(address voterAddress) public view returns (Voter memory) {
        return voters[voterAddress];
    }

    /**
     * @notice Get voter information (flattened return, legacy compatible)
     * @param voterAddress Address of the voter
     * @return voterAddr Voter's address
     * @return name Voter's name
     * @return votedCandidateId ID of candidate voted for (0 if not voted)
     * @return votedAt Timestamp when vote was cast (0 if not voted)
     */
    function getVoterDetails(address voterAddress)
        public
        view
        returns (address voterAddr, string memory name, uint256 votedCandidateId, uint256 votedAt)
    {
        Voter storage voter = voters[voterAddress];
        return (voter.voterAddress, voter.name, voter.votedCandidateId, voter.votedAt);
    }

    /**
     * @notice Get multiple voters with pagination
     * @param offset Starting position (0-based)
     * @param limit Maximum number of results to return
     * @return addresses Array of voter addresses
     * @return names Array of voter names
     * @return votedCandidateIds Array of voted candidate IDs
     */
    function getVoters(uint256 offset, uint256 limit)
        public
        view
        returns (address[] memory addresses, string[] memory names, uint256[] memory votedCandidateIds)
    {
        uint256 end = offset + limit;
        if (end > votersAddress.length) {
            end = votersAddress.length;
        }

        uint256 size = end > offset ? end - offset : 0;
        addresses = new address[](size);
        names = new string[](size);
        votedCandidateIds = new uint256[](size);

        for (uint256 i = 0; i < size; i++) {
            address voterAddr = votersAddress[offset + i];
            Voter storage voter = voters[voterAddr];
            addresses[i] = voter.voterAddress;
            names[i] = voter.name;
            votedCandidateIds[i] = voter.votedCandidateId;
        }
    }

    // Tier 4: Results and Statistics

    /**
     * @notice Get the winning candidate(s)
     * @return winnerIds Array of candidate IDs with the highest votes (may be multiple in case of tie)
     * @return winnerAddresses Array of winning candidate addresses
     * @return winnerNames Array of winning candidate names
     * @return highestVoteCount The highest vote count
     */
    function getWinners()
        public
        view
        returns (
            uint256[] memory winnerIds,
            address[] memory winnerAddresses,
            string[] memory winnerNames,
            uint256 highestVoteCount
        )
    {
        if (candidateCount == 0) {
            return (new uint256[](0), new address[](0), new string[](0), 0);
        }

        // Find highest vote count
        highestVoteCount = 0;
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount > highestVoteCount) {
                highestVoteCount = candidates[i].voteCount;
            }
        }

        // Count winners (in case of tie)
        uint256 winnerCount = 0;
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount == highestVoteCount) {
                winnerCount++;
            }
        }

        // Populate winner arrays
        winnerIds = new uint256[](winnerCount);
        winnerAddresses = new address[](winnerCount);
        winnerNames = new string[](winnerCount);

        uint256 index = 0;
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount == highestVoteCount) {
                winnerIds[index] = candidates[i].id;
                winnerAddresses[index] = candidates[i].candidateAddress;
                winnerNames[index] = candidates[i].name;
                index++;
            }
        }
    }

    /**
     * @notice Get voting statistics
     * @return totalVoters Total number of registered voters
     * @return totalVotesCast Total number of votes cast
     * @return totalCandidates Total number of candidates
     * @return participationRate Participation rate in basis points (10000 = 100%)
     */
    function getVotingStatistics()
        public
        view
        returns (uint256 totalVoters, uint256 totalVotesCast, uint256 totalCandidates, uint256 participationRate)
    {
        totalVoters = votersAddress.length;
        totalCandidates = candidateCount;

        // Count votes cast
        totalVotesCast = 0;
        for (uint256 i = 0; i < votersAddress.length; i++) {
            if (voters[votersAddress[i]].votedCandidateId != 0) {
                totalVotesCast++;
            }
        }

        // Calculate participation rate in basis points
        participationRate = totalVoters > 0 ? (totalVotesCast * 10000) / totalVoters : 0;
    }

    /**
     * @notice Check if voting time has expired
     * @return True if current time is past voting end time
     */
    function isVotingExpired() public view returns (bool) {
        return votingStatus == VotingStatus.Active && block.timestamp > votingEndTime;
    }

    /**
     * @notice Get remaining voting time in seconds
     * @return Remaining time in seconds (0 if voting not active or expired)
     */
    function getRemainingTime() public view returns (uint256) {
        if (votingStatus != VotingStatus.Active || block.timestamp >= votingEndTime) {
            return 0;
        }
        return votingEndTime - block.timestamp;
    }
}
