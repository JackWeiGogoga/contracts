// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title GogogaNFT - Hybrid NFT Collection
 * @notice Supports both preset and custom minting modes
 * @dev TokenId ranges:
 *      - 0 ~ 3: Preset NFTs (using baseURI)
 *      - 4+: Custom NFTs (individual URIs)
 */
contract GogogaNFT is ERC721, ERC721Burnable, Ownable, Pausable, ReentrancyGuard {
    using Strings for uint256;

    // ============ Constants ============

    uint256 public constant PRESET_MAX_SUPPLY = 4;
    uint256 public constant CUSTOM_START_ID = 4;

    // ============ State Variables ============

    uint256 private _nextPresetTokenId;
    uint256 private _nextCustomTokenId;

    uint256 public maxSupply;
    uint256 public presetMintPrice;
    uint256 public customMintPrice;

    string private _presetBaseURI;

    mapping(uint256 => string) private _customTokenURIs;

    // ============ Events ============

    event PresetMinted(address indexed to, uint256 indexed tokenId);
    event CustomMinted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event PresetBaseURIUpdated(string baseURI);
    event CustomTokenURIUpdated(uint256 indexed tokenId, string tokenURI);

    // ============ Errors ============

    error PresetSupplyExceeded();
    error CustomSupplyExceeded();
    error InsufficientPayment();
    error InvalidTokenId();
    error InvalidMaxSupply();
    error EmptyTokenURI();

    // ============ Constructor ============

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        uint256 _presetPrice,
        uint256 _customPrice,
        string memory presetBaseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        require(_maxSupply > PRESET_MAX_SUPPLY, "Max supply must exceed 10000 to allow custom NFTs");

        maxSupply = _maxSupply;
        presetMintPrice = _presetPrice;
        customMintPrice = _customPrice;
        _presetBaseURI = presetBaseURI;
    }

    // ============ Minting Functions ============

    /**
     * @notice Mint preset NFT (tokenId: 0-3)
     */
    function mintPreset() external payable whenNotPaused nonReentrant {
        if (msg.value < presetMintPrice) revert InsufficientPayment();
        if (_nextPresetTokenId >= PRESET_MAX_SUPPLY) revert PresetSupplyExceeded();

        uint256 tokenId = _nextPresetTokenId++;
        _safeMint(msg.sender, tokenId);

        emit PresetMinted(msg.sender, tokenId);
    }

    /**
     * @notice Mint custom NFT (tokenId: 4+)
     * @param customURI Full URI uploaded to IPFS (e.g., "ipfs://QmYYY/metadata.json")
     */
    function mintCustom(string memory customURI) external payable whenNotPaused nonReentrant {
        if (msg.value < customMintPrice) revert InsufficientPayment();
        if (bytes(customURI).length == 0) revert EmptyTokenURI();

        uint256 tokenId = CUSTOM_START_ID + _nextCustomTokenId;
        if (tokenId >= maxSupply) revert CustomSupplyExceeded();

        _nextCustomTokenId++;
        _safeMint(msg.sender, tokenId);
        _customTokenURIs[tokenId] = customURI;

        emit CustomMinted(msg.sender, tokenId, customURI);
    }

    /**
     * @notice Batch mint preset NFTs (owner only)
     */
    function batchMintPreset(address to, uint256 quantity) external onlyOwner {
        if (_nextPresetTokenId + quantity > PRESET_MAX_SUPPLY) revert PresetSupplyExceeded();

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextPresetTokenId++;
            _safeMint(to, tokenId);
            emit PresetMinted(to, tokenId);
        }
    }

    // ============ Admin Functions ============

    function setPresetBaseURI(string memory baseURI) external onlyOwner {
        _presetBaseURI = baseURI;
        emit PresetBaseURIUpdated(baseURI);
    }

    function setPresetMintPrice(uint256 newPrice) external onlyOwner {
        presetMintPrice = newPrice;
    }

    function setCustomMintPrice(uint256 newPrice) external onlyOwner {
        customMintPrice = newPrice;
    }

    /**
     * @notice Update custom token URI (owner only, e.g., for content moderation)
     */
    function updateCustomTokenURI(uint256 tokenId, string memory newURI) external onlyOwner {
        require(tokenId >= CUSTOM_START_ID, "Not a custom token");
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        _customTokenURIs[tokenId] = newURI;
        emit CustomTokenURIUpdated(tokenId, newURI);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        (bool success,) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // ============ View Functions ============

    /**
     * @notice Returns token URI based on tokenId range
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (tokenId >= CUSTOM_START_ID) {
            string memory customURI = _customTokenURIs[tokenId];
            require(bytes(customURI).length > 0, "Custom URI not set");
            return customURI;
        }

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    function _baseURI() internal view override returns (string memory) {
        return _presetBaseURI;
    }

    /**
     * @notice Returns the base URI for preset NFTs
     */
    function getPresetBaseURI() external view returns (string memory) {
        return _presetBaseURI;
    }

    function totalSupply() external view returns (uint256) {
        return _nextPresetTokenId + _nextCustomTokenId;
    }

    function presetSupply() external view returns (uint256) {
        return _nextPresetTokenId;
    }

    function customSupply() external view returns (uint256) {
        return _nextCustomTokenId;
    }

    function remainingPresetSupply() external view returns (uint256) {
        return PRESET_MAX_SUPPLY - _nextPresetTokenId;
    }

    function remainingCustomSupply() external view returns (uint256) {
        return maxSupply - CUSTOM_START_ID - _nextCustomTokenId;
    }

    /**
     * @notice Check if tokenId is a custom token
     */
    function isCustomToken(uint256 tokenId) external pure returns (bool) {
        return tokenId >= CUSTOM_START_ID;
    }
}
