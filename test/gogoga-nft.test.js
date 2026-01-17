const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ============ Test Constants (should match contract constants) ============
const PRESET_MAX_SUPPLY = 4;
const CUSTOM_START_ID = 4;
const DEFAULT_MAX_SUPPLY = 8; // PRESET_MAX_SUPPLY preset + PRESET_MAX_SUPPLY custom

describe("GogogaNFT", function () {
    async function deployGogogaNFTFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();

        const name = "Gogoga NFT";
        const symbol = "GGNFT";
        const maxSupply = DEFAULT_MAX_SUPPLY;
        const presetMintPrice = ethers.parseEther("0.1");
        const customMintPrice = ethers.parseEther("0.2");
        const presetBaseURI = "https://api.gogoga.com/metadata/";

        const GogogaNFT = await ethers.getContractFactory("GogogaNFT");
        const nft = await GogogaNFT.deploy(
            name,
            symbol,
            maxSupply,
            presetMintPrice,
            customMintPrice,
            presetBaseURI
        );

        return {
            nft,
            owner,
            addr1,
            addr2,
            addr3,
            presetMintPrice,
            customMintPrice,
            maxSupply,
        };
    }

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            const { nft } = await loadFixture(deployGogogaNFTFixture);
            expect(await nft.name()).to.equal("Gogoga NFT");
            expect(await nft.symbol()).to.equal("GGNFT");
        });

        it("Should set the correct max supply", async function () {
            const { nft, maxSupply } = await loadFixture(
                deployGogogaNFTFixture
            );
            expect(await nft.maxSupply()).to.equal(maxSupply);
        });

        it("Should set the correct mint prices", async function () {
            const { nft, presetMintPrice, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );
            expect(await nft.presetMintPrice()).to.equal(presetMintPrice);
            expect(await nft.customMintPrice()).to.equal(customMintPrice);
        });

        it("Should set the correct owner", async function () {
            const { nft, owner } = await loadFixture(deployGogogaNFTFixture);
            expect(await nft.owner()).to.equal(owner.address);
        });

        it("Should set the correct constants", async function () {
            const { nft } = await loadFixture(deployGogogaNFTFixture);
            expect(await nft.PRESET_MAX_SUPPLY()).to.equal(PRESET_MAX_SUPPLY);
            expect(await nft.CUSTOM_START_ID()).to.equal(CUSTOM_START_ID);
        });

        it("Should revert if max supply is less than or equal to preset limit", async function () {
            const GogogaNFT = await ethers.getContractFactory("GogogaNFT");

            await expect(
                GogogaNFT.deploy(
                    "Test",
                    "TEST",
                    PRESET_MAX_SUPPLY, // equal to PRESET_MAX_SUPPLY
                    ethers.parseEther("0.1"),
                    ethers.parseEther("0.2"),
                    "https://test.com/"
                )
            ).to.be.reverted;

            await expect(
                GogogaNFT.deploy(
                    "Test",
                    "TEST",
                    PRESET_MAX_SUPPLY - 1, // less than PRESET_MAX_SUPPLY
                    ethers.parseEther("0.1"),
                    ethers.parseEther("0.2"),
                    "https://test.com/"
                )
            ).to.be.reverted;
        });
    });

    describe("Preset NFT Minting", function () {
        it("Should allow preset minting", async function () {
            const { nft, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.connect(addr1).mintPreset({ value: presetMintPrice });

            expect(await nft.ownerOf(0)).to.equal(addr1.address);
            expect(await nft.totalSupply()).to.equal(1);
            expect(await nft.presetSupply()).to.equal(1);
        });

        it("Should revert if payment is insufficient", async function () {
            const { nft, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await expect(
                nft.connect(addr1).mintPreset({ value: presetMintPrice - 1n })
            ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
        });

        it("Should allow multiple preset mints", async function () {
            const { nft, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.connect(addr1).mintPreset({ value: presetMintPrice });
            await nft.connect(addr1).mintPreset({ value: presetMintPrice });
            await nft.connect(addr1).mintPreset({ value: presetMintPrice });

            expect(await nft.totalSupply()).to.equal(3);
            expect(await nft.presetSupply()).to.equal(3);
            expect(await nft.ownerOf(0)).to.equal(addr1.address);
            expect(await nft.ownerOf(1)).to.equal(addr1.address);
            expect(await nft.ownerOf(2)).to.equal(addr1.address);
        });

        it("Should revert when preset supply is reached", async function () {
            const { nft, owner, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            // Mint all preset tokens (0 to PRESET_MAX_SUPPLY-1)
            await nft.batchMintPreset(owner.address, PRESET_MAX_SUPPLY);

            // Verify preset supply is exhausted
            expect(await nft.presetSupply()).to.equal(PRESET_MAX_SUPPLY);

            // Next mint should fail
            await expect(
                nft.connect(addr1).mintPreset({ value: presetMintPrice })
            ).to.be.revertedWithCustomError(nft, "PresetSupplyExceeded");
        });

        it("Should emit PresetMinted event", async function () {
            const { nft, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await expect(
                nft.connect(addr1).mintPreset({ value: presetMintPrice })
            )
                .to.emit(nft, "PresetMinted")
                .withArgs(addr1.address, 0);
        });

        it("Should assign sequential tokenIds starting from 0", async function () {
            const { nft, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.connect(addr1).mintPreset({ value: presetMintPrice });
            await nft.connect(addr1).mintPreset({ value: presetMintPrice });

            expect(await nft.isCustomToken(0)).to.be.false;
            expect(await nft.isCustomToken(1)).to.be.false;
        });
    });

    describe("Custom NFT Minting", function () {
        it("Should allow custom minting with URI", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            const customURI = "ipfs://QmCustomHash123/metadata.json";
            await nft
                .connect(addr1)
                .mintCustom(customURI, { value: customMintPrice });

            expect(await nft.ownerOf(CUSTOM_START_ID)).to.equal(addr1.address);
            expect(await nft.totalSupply()).to.equal(1);
            expect(await nft.customSupply()).to.equal(1);
            expect(await nft.tokenURI(CUSTOM_START_ID)).to.equal(customURI);
        });

        it("Should revert if payment is insufficient", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await expect(
                nft
                    .connect(addr1)
                    .mintCustom("ipfs://test", { value: customMintPrice - 1n })
            ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
        });

        it("Should revert if URI is empty", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await expect(
                nft.connect(addr1).mintCustom("", { value: customMintPrice })
            ).to.be.revertedWithCustomError(nft, "EmptyTokenURI");
        });

        it("Should allow multiple custom mints", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://hash1", { value: customMintPrice });
            await nft
                .connect(addr1)
                .mintCustom("ipfs://hash2", { value: customMintPrice });

            expect(await nft.customSupply()).to.equal(2);
            expect(await nft.ownerOf(CUSTOM_START_ID)).to.equal(addr1.address);
            expect(await nft.ownerOf(CUSTOM_START_ID + 1)).to.equal(
                addr1.address
            );
        });

        it("Should emit CustomMinted event", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            const customURI = "ipfs://QmTest";
            await expect(
                nft
                    .connect(addr1)
                    .mintCustom(customURI, { value: customMintPrice })
            )
                .to.emit(nft, "CustomMinted")
                .withArgs(addr1.address, CUSTOM_START_ID, customURI);
        });

        it("Should assign sequential tokenIds starting from CUSTOM_START_ID", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://1", { value: customMintPrice });
            await nft
                .connect(addr1)
                .mintCustom("ipfs://2", { value: customMintPrice });

            expect(await nft.isCustomToken(CUSTOM_START_ID)).to.be.true;
            expect(await nft.isCustomToken(CUSTOM_START_ID + 1)).to.be.true;
        });

        it("Should revert when custom supply is reached", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            // Mint all custom tokens (maxSupply - CUSTOM_START_ID)
            const customCapacity = DEFAULT_MAX_SUPPLY - CUSTOM_START_ID;
            for (let i = 0; i < customCapacity; i++) {
                await nft.connect(addr1).mintCustom(`ipfs://hash${i}`, {
                    value: customMintPrice,
                });
            }

            // Verify custom supply is at limit
            expect(await nft.customSupply()).to.equal(customCapacity);

            // Next custom mint should fail
            await expect(
                nft.connect(addr1).mintCustom("ipfs://overflow", {
                    value: customMintPrice,
                })
            ).to.be.revertedWithCustomError(nft, "CustomSupplyExceeded");
        });
    });

    describe("Batch Minting", function () {
        it("Should allow owner to batch mint preset NFTs", async function () {
            const { nft, addr1 } = await loadFixture(deployGogogaNFTFixture);

            await nft.batchMintPreset(addr1.address, PRESET_MAX_SUPPLY);

            expect(await nft.totalSupply()).to.equal(PRESET_MAX_SUPPLY);
            expect(await nft.presetSupply()).to.equal(PRESET_MAX_SUPPLY);
            expect(await nft.ownerOf(0)).to.equal(addr1.address);
            expect(await nft.ownerOf(PRESET_MAX_SUPPLY - 1)).to.equal(
                addr1.address
            );
        });

        it("Should not allow non-owner to batch mint", async function () {
            const { nft, addr1 } = await loadFixture(deployGogogaNFTFixture);

            await expect(
                nft
                    .connect(addr1)
                    .batchMintPreset(addr1.address, PRESET_MAX_SUPPLY)
            ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        });

        it("Should revert if batch mint exceeds preset supply", async function () {
            const { nft, addr1 } = await loadFixture(deployGogogaNFTFixture);

            await expect(
                nft.batchMintPreset(addr1.address, PRESET_MAX_SUPPLY + 1)
            ).to.be.revertedWithCustomError(nft, "PresetSupplyExceeded");
        });

        it("Should emit PresetMinted events for each token", async function () {
            const { nft, addr1 } = await loadFixture(deployGogogaNFTFixture);

            const tx = await nft.batchMintPreset(addr1.address, 3);
            const receipt = await tx.wait();

            const events = receipt.logs.filter((log) => {
                try {
                    return nft.interface.parseLog(log).name === "PresetMinted";
                } catch (e) {
                    return false;
                }
            });

            expect(events.length).to.equal(3);
        });
    });

    describe("URI Management", function () {
        it("Should return correct preset token URI", async function () {
            const { nft, owner } = await loadFixture(deployGogogaNFTFixture);

            await nft.batchMintPreset(owner.address, 1);

            expect(await nft.tokenURI(0)).to.equal(
                "https://api.gogoga.com/metadata/0"
            );
        });

        it("Should return correct custom token URI", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            const customURI = "ipfs://QmCustom/metadata.json";
            await nft
                .connect(addr1)
                .mintCustom(customURI, { value: customMintPrice });

            expect(await nft.tokenURI(CUSTOM_START_ID)).to.equal(customURI);
        });

        it("Should allow owner to update preset base URI", async function () {
            const { nft, owner } = await loadFixture(deployGogogaNFTFixture);

            await nft.batchMintPreset(owner.address, 1);
            await nft.setPresetBaseURI("https://new-api.gogoga.com/metadata/");

            expect(await nft.tokenURI(0)).to.equal(
                "https://new-api.gogoga.com/metadata/0"
            );
        });

        it("Should allow owner to update custom token URI", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://old", { value: customMintPrice });

            const newURI = "ipfs://new";
            await nft.updateCustomTokenURI(CUSTOM_START_ID, newURI);

            expect(await nft.tokenURI(CUSTOM_START_ID)).to.equal(newURI);
        });

        it("Should emit PresetBaseURIUpdated event", async function () {
            const { nft } = await loadFixture(deployGogogaNFTFixture);

            const newURI = "https://new-api.gogoga.com/";
            await expect(nft.setPresetBaseURI(newURI))
                .to.emit(nft, "PresetBaseURIUpdated")
                .withArgs(newURI);
        });

        it("Should emit CustomTokenURIUpdated event", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://old", { value: customMintPrice });

            const newURI = "ipfs://new";
            await expect(nft.updateCustomTokenURI(CUSTOM_START_ID, newURI))
                .to.emit(nft, "CustomTokenURIUpdated")
                .withArgs(CUSTOM_START_ID, newURI);
        });
    });

    describe("Pausable", function () {
        it("Should allow owner to pause", async function () {
            const { nft } = await loadFixture(deployGogogaNFTFixture);

            await nft.pause();
            expect(await nft.paused()).to.be.true;
        });

        it("Should allow owner to unpause", async function () {
            const { nft } = await loadFixture(deployGogogaNFTFixture);

            await nft.pause();
            await nft.unpause();
            expect(await nft.paused()).to.be.false;
        });

        it("Should not allow preset minting when paused", async function () {
            const { nft, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.pause();

            await expect(
                nft.connect(addr1).mintPreset({ value: presetMintPrice })
            ).to.be.revertedWithCustomError(nft, "EnforcedPause");
        });

        it("Should not allow custom minting when paused", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.pause();

            await expect(
                nft
                    .connect(addr1)
                    .mintCustom("ipfs://test", { value: customMintPrice })
            ).to.be.revertedWithCustomError(nft, "EnforcedPause");
        });
    });

    describe("Burnable", function () {
        it("Should allow preset token owner to burn", async function () {
            const { nft, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.connect(addr1).mintPreset({ value: presetMintPrice });
            await nft.connect(addr1).burn(0);

            await expect(nft.ownerOf(0)).to.be.revertedWithCustomError(
                nft,
                "ERC721NonexistentToken"
            );
        });

        it("Should allow custom token owner to burn", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://test", { value: customMintPrice });
            await nft.connect(addr1).burn(CUSTOM_START_ID);

            await expect(
                nft.ownerOf(CUSTOM_START_ID)
            ).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to update preset mint price", async function () {
            const { nft } = await loadFixture(deployGogogaNFTFixture);

            const newPrice = ethers.parseEther("0.15");
            await nft.setPresetMintPrice(newPrice);

            expect(await nft.presetMintPrice()).to.equal(newPrice);
        });

        it("Should allow owner to update custom mint price", async function () {
            const { nft } = await loadFixture(deployGogogaNFTFixture);

            const newPrice = ethers.parseEther("0.25");
            await nft.setCustomMintPrice(newPrice);

            expect(await nft.customMintPrice()).to.equal(newPrice);
        });

        it("Should only allow owner to call admin functions", async function () {
            const { nft, addr1 } = await loadFixture(deployGogogaNFTFixture);

            await expect(
                nft.connect(addr1).setPresetMintPrice(ethers.parseEther("0.2"))
            ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");

            await expect(
                nft.connect(addr1).setCustomMintPrice(ethers.parseEther("0.2"))
            ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
        });
    });

    describe("Withdraw", function () {
        it("Should allow owner to withdraw funds from preset mints", async function () {
            const { nft, owner, addr1, presetMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.connect(addr1).mintPreset({ value: presetMintPrice });

            const balanceBefore = await ethers.provider.getBalance(
                owner.address
            );
            const tx = await nft.withdraw();
            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed * receipt.gasPrice;
            const balanceAfter = await ethers.provider.getBalance(
                owner.address
            );

            expect(balanceAfter).to.equal(
                balanceBefore + presetMintPrice - gasCost
            );
        });

        it("Should allow owner to withdraw funds from custom mints", async function () {
            const { nft, owner, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://test", { value: customMintPrice });

            const contractBalance = await ethers.provider.getBalance(
                await nft.getAddress()
            );
            expect(contractBalance).to.equal(customMintPrice);

            await nft.withdraw();

            const finalBalance = await ethers.provider.getBalance(
                await nft.getAddress()
            );
            expect(finalBalance).to.equal(0);
        });

        it("Should allow owner to withdraw mixed funds", async function () {
            const {
                nft,
                owner,
                addr1,
                addr2,
                presetMintPrice,
                customMintPrice,
            } = await loadFixture(deployGogogaNFTFixture);

            await nft.connect(addr1).mintPreset({ value: presetMintPrice });
            await nft
                .connect(addr2)
                .mintCustom("ipfs://test", { value: customMintPrice });

            const totalFunds = presetMintPrice + customMintPrice;
            const contractBalance = await ethers.provider.getBalance(
                await nft.getAddress()
            );
            expect(contractBalance).to.equal(totalFunds);

            await nft.withdraw();
        });
    });

    describe("View Functions", function () {
        it("Should return correct total supply", async function () {
            const { nft, owner, addr1, presetMintPrice, customMintPrice } =
                await loadFixture(deployGogogaNFTFixture);

            await nft.batchMintPreset(owner.address, PRESET_MAX_SUPPLY);
            await nft
                .connect(addr1)
                .mintCustom("ipfs://1", { value: customMintPrice });
            await nft
                .connect(addr1)
                .mintCustom("ipfs://2", { value: customMintPrice });

            expect(await nft.totalSupply()).to.equal(6);
        });

        it("Should return correct preset supply", async function () {
            const { nft, owner } = await loadFixture(deployGogogaNFTFixture);

            await nft.batchMintPreset(owner.address, PRESET_MAX_SUPPLY);

            expect(await nft.presetSupply()).to.equal(PRESET_MAX_SUPPLY);
        });

        it("Should return correct custom supply", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://1", { value: customMintPrice });
            await nft
                .connect(addr1)
                .mintCustom("ipfs://2", { value: customMintPrice });

            expect(await nft.customSupply()).to.equal(2);
        });

        it("Should return correct remaining preset supply", async function () {
            const { nft, owner } = await loadFixture(deployGogogaNFTFixture);

            const mintAmount = 2;
            await nft.batchMintPreset(owner.address, mintAmount);

            expect(await nft.remainingPresetSupply()).to.equal(
                PRESET_MAX_SUPPLY - mintAmount
            );
        });

        it("Should return correct remaining custom supply", async function () {
            const { nft, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft
                .connect(addr1)
                .mintCustom("ipfs://1", { value: customMintPrice });

            // Custom capacity = maxSupply - CUSTOM_START_ID
            const customCapacity = DEFAULT_MAX_SUPPLY - CUSTOM_START_ID;
            expect(await nft.remainingCustomSupply()).to.equal(
                customCapacity - 1
            );
        });

        it("Should correctly identify token type", async function () {
            const { nft, owner, addr1, customMintPrice } = await loadFixture(
                deployGogogaNFTFixture
            );

            await nft.batchMintPreset(owner.address, 1);
            await nft
                .connect(addr1)
                .mintCustom("ipfs://test", { value: customMintPrice });

            // Preset tokens: 0 to PRESET_MAX_SUPPLY-1
            expect(await nft.isCustomToken(0)).to.be.false;
            expect(await nft.isCustomToken(PRESET_MAX_SUPPLY - 1)).to.be.false;

            // Custom tokens: CUSTOM_START_ID and above
            expect(await nft.isCustomToken(CUSTOM_START_ID)).to.be.true;
            expect(await nft.isCustomToken(CUSTOM_START_ID + 1)).to.be.true;
        });
    });
});
