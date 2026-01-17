const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GogogaToken", function () {
    // Fixture to deploy the contract
    async function deployGogogaTokenFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();

        const GogogaToken = await ethers.getContractFactory("GogogaToken");
        const gogogaToken = await GogogaToken.deploy();

        return { gogogaToken, owner, addr1, addr2, addr3 };
    }

    describe("Deployment", function () {
        it("Should set the correct token name and symbol", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            expect(await gogogaToken.name()).to.equal("GogogaToken");
            expect(await gogogaToken.symbol()).to.equal("GOGOGA");
        });

        it("Should set the correct decimals", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            expect(await gogogaToken.decimals()).to.equal(18);
        });

        it("Should set the correct max supply", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            const maxSupply = await gogogaToken.MAX_SUPPLY();
            expect(maxSupply).to.equal(ethers.parseEther("1000000000")); // 1 billion
        });

        it("Should mint initial supply to deployer", async function () {
            const { gogogaToken, owner } = await loadFixture(
                deployGogogaTokenFixture
            );

            const ownerBalance = await gogogaToken.balanceOf(owner.address);
            expect(ownerBalance).to.equal(ethers.parseEther("1000000")); // 1 million
        });

        it("Should set the correct owner", async function () {
            const { gogogaToken, owner } = await loadFixture(
                deployGogogaTokenFixture
            );

            expect(await gogogaToken.owner()).to.equal(owner.address);
        });

        it("Should have correct initial total supply", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            expect(await gogogaToken.totalSupply()).to.equal(
                ethers.parseEther("1000000")
            );
        });
    });

    describe("Minting", function () {
        it("Should allow owner to mint tokens", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const mintAmount = ethers.parseEther("1000");
            await expect(gogogaToken.mint(addr1.address, mintAmount))
                .to.emit(gogogaToken, "Transfer")
                .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

            expect(await gogogaToken.balanceOf(addr1.address)).to.equal(
                mintAmount
            );
        });

        it("Should not allow non-owner to mint tokens", async function () {
            const { gogogaToken, addr1, addr2 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const mintAmount = ethers.parseEther("1000");
            await expect(
                gogogaToken.connect(addr1).mint(addr2.address, mintAmount)
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should not allow minting to zero address", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            const mintAmount = ethers.parseEther("1000");
            await expect(
                gogogaToken.mint(ethers.ZeroAddress, mintAmount)
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "CannotMintToZeroAddress"
            );
        });

        it("Should not allow minting beyond max supply", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const maxSupply = await gogogaToken.MAX_SUPPLY();
            const currentSupply = await gogogaToken.totalSupply();
            const exceedAmount = maxSupply - currentSupply + 1n;

            await expect(
                gogogaToken.mint(addr1.address, exceedAmount)
            ).to.be.revertedWithCustomError(gogogaToken, "ExceedsMaxSupply");
        });

        it("Should allow minting up to max supply", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const maxSupply = await gogogaToken.MAX_SUPPLY();
            const currentSupply = await gogogaToken.totalSupply();
            const remainingSupply = maxSupply - currentSupply;

            await gogogaToken.mint(addr1.address, remainingSupply);
            expect(await gogogaToken.totalSupply()).to.equal(maxSupply);
        });

        it("Should update total supply after minting", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const initialSupply = await gogogaToken.totalSupply();
            const mintAmount = ethers.parseEther("5000");

            await gogogaToken.mint(addr1.address, mintAmount);
            expect(await gogogaToken.totalSupply()).to.equal(
                initialSupply + mintAmount
            );
        });
    });

    describe("Burning", function () {
        it("Should allow token holders to burn their tokens", async function () {
            const { gogogaToken, owner } = await loadFixture(
                deployGogogaTokenFixture
            );

            const burnAmount = ethers.parseEther("1000");
            const initialBalance = await gogogaToken.balanceOf(owner.address);

            await expect(gogogaToken.burn(burnAmount))
                .to.emit(gogogaToken, "Transfer")
                .withArgs(owner.address, ethers.ZeroAddress, burnAmount);

            expect(await gogogaToken.balanceOf(owner.address)).to.equal(
                initialBalance - burnAmount
            );
        });

        it("Should reduce total supply after burning", async function () {
            const { gogogaToken, owner } = await loadFixture(
                deployGogogaTokenFixture
            );

            const burnAmount = ethers.parseEther("1000");
            const initialSupply = await gogogaToken.totalSupply();

            await gogogaToken.burn(burnAmount);
            expect(await gogogaToken.totalSupply()).to.equal(
                initialSupply - burnAmount
            );
        });

        it("Should not allow burning more than balance", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await expect(
                gogogaToken.connect(addr1).burn(ethers.parseEther("1"))
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "ERC20InsufficientBalance"
            );
        });

        it("Should allow burning with approval (burnFrom)", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const burnAmount = ethers.parseEther("1000");
            await gogogaToken.approve(addr1.address, burnAmount);

            await expect(
                gogogaToken.connect(addr1).burnFrom(owner.address, burnAmount)
            )
                .to.emit(gogogaToken, "Transfer")
                .withArgs(owner.address, ethers.ZeroAddress, burnAmount);
        });
    });

    describe("Pausing", function () {
        it("Should allow owner to pause", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            await expect(gogogaToken.pause())
                .to.emit(gogogaToken, "Paused")
                .withArgs(await gogogaToken.owner());

            expect(await gogogaToken.paused()).to.be.true;
        });

        it("Should allow owner to unpause", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            await gogogaToken.pause();
            await expect(gogogaToken.unpause())
                .to.emit(gogogaToken, "Unpaused")
                .withArgs(await gogogaToken.owner());

            expect(await gogogaToken.paused()).to.be.false;
        });

        it("Should not allow non-owner to pause", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await expect(
                gogogaToken.connect(addr1).pause()
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should not allow non-owner to unpause", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await gogogaToken.pause();
            await expect(
                gogogaToken.connect(addr1).unpause()
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should prevent transfers when paused", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await gogogaToken.pause();

            await expect(
                gogogaToken.transfer(addr1.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(gogogaToken, "EnforcedPause");
        });

        it("Should prevent minting when paused", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await gogogaToken.pause();

            await expect(
                gogogaToken.mint(addr1.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(gogogaToken, "EnforcedPause");
        });

        it("Should prevent burning when paused", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            await gogogaToken.pause();

            await expect(
                gogogaToken.burn(ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(gogogaToken, "EnforcedPause");
        });

        it("Should allow transfers after unpausing", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await gogogaToken.pause();
            await gogogaToken.unpause();

            const transferAmount = ethers.parseEther("100");
            await expect(gogogaToken.transfer(addr1.address, transferAmount))
                .to.emit(gogogaToken, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);
        });
    });

    describe("Transfers", function () {
        it("Should transfer tokens between accounts", async function () {
            const { gogogaToken, owner, addr1, addr2 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const transferAmount = ethers.parseEther("100");

            // Transfer from owner to addr1
            await expect(
                gogogaToken.transfer(addr1.address, transferAmount)
            ).to.changeTokenBalances(
                gogogaToken,
                [owner, addr1],
                [-transferAmount, transferAmount]
            );

            // Transfer from addr1 to addr2
            await expect(
                gogogaToken
                    .connect(addr1)
                    .transfer(addr2.address, transferAmount)
            ).to.changeTokenBalances(
                gogogaToken,
                [addr1, addr2],
                [-transferAmount, transferAmount]
            );
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const ownerBalance = await gogogaToken.balanceOf(owner.address);

            await expect(
                gogogaToken.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "ERC20InsufficientBalance"
            );
        });

        it("Should update balances after transfers", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const initialOwnerBalance = await gogogaToken.balanceOf(
                owner.address
            );
            const transferAmount = ethers.parseEther("100");

            await gogogaToken.transfer(addr1.address, transferAmount);

            expect(await gogogaToken.balanceOf(owner.address)).to.equal(
                initialOwnerBalance - transferAmount
            );
            expect(await gogogaToken.balanceOf(addr1.address)).to.equal(
                transferAmount
            );
        });
    });

    describe("Allowances", function () {
        it("Should approve tokens for delegated transfer", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const approveAmount = ethers.parseEther("1000");

            await expect(gogogaToken.approve(addr1.address, approveAmount))
                .to.emit(gogogaToken, "Approval")
                .withArgs(owner.address, addr1.address, approveAmount);

            expect(
                await gogogaToken.allowance(owner.address, addr1.address)
            ).to.equal(approveAmount);
        });

        it("Should transfer tokens using transferFrom", async function () {
            const { gogogaToken, owner, addr1, addr2 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const approveAmount = ethers.parseEther("1000");
            const transferAmount = ethers.parseEther("500");

            await gogogaToken.approve(addr1.address, approveAmount);

            await expect(
                gogogaToken
                    .connect(addr1)
                    .transferFrom(owner.address, addr2.address, transferAmount)
            ).to.changeTokenBalances(
                gogogaToken,
                [owner, addr2],
                [-transferAmount, transferAmount]
            );

            expect(
                await gogogaToken.allowance(owner.address, addr1.address)
            ).to.equal(approveAmount - transferAmount);
        });

        it("Should fail transferFrom without approval", async function () {
            const { gogogaToken, owner, addr1, addr2 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await expect(
                gogogaToken
                    .connect(addr1)
                    .transferFrom(owner.address, addr2.address, 1)
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "ERC20InsufficientAllowance"
            );
        });
    });

    describe("Ownership", function () {
        it("Should transfer ownership", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await expect(gogogaToken.transferOwnership(addr1.address))
                .to.emit(gogogaToken, "OwnershipTransferred")
                .withArgs(owner.address, addr1.address);

            expect(await gogogaToken.owner()).to.equal(addr1.address);
        });

        it("Should prevent non-owners from transferring ownership", async function () {
            const { gogogaToken, addr1, addr2 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await expect(
                gogogaToken.connect(addr1).transferOwnership(addr2.address)
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should allow owner to renounce ownership", async function () {
            const { gogogaToken, owner } = await loadFixture(
                deployGogogaTokenFixture
            );

            await expect(gogogaToken.renounceOwnership())
                .to.emit(gogogaToken, "OwnershipTransferred")
                .withArgs(owner.address, ethers.ZeroAddress);

            expect(await gogogaToken.owner()).to.equal(ethers.ZeroAddress);
        });

        it("Should prevent minting after renouncing ownership", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await gogogaToken.renounceOwnership();

            await expect(
                gogogaToken.mint(addr1.address, ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(
                gogogaToken,
                "OwnableUnauthorizedAccount"
            );
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero amount transfers", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            await expect(gogogaToken.transfer(addr1.address, 0))
                .to.emit(gogogaToken, "Transfer")
                .withArgs(owner.address, addr1.address, 0);
        });

        it("Should handle multiple operations correctly", async function () {
            const { gogogaToken, owner, addr1, addr2 } = await loadFixture(
                deployGogogaTokenFixture
            );

            // Mint
            await gogogaToken.mint(addr1.address, ethers.parseEther("1000"));

            // Transfer
            await gogogaToken
                .connect(addr1)
                .transfer(addr2.address, ethers.parseEther("500"));

            // Burn
            await gogogaToken.connect(addr2).burn(ethers.parseEther("100"));

            expect(await gogogaToken.balanceOf(addr1.address)).to.equal(
                ethers.parseEther("500")
            );
            expect(await gogogaToken.balanceOf(addr2.address)).to.equal(
                ethers.parseEther("400")
            );
        });

        it("Should handle maximum uint256 approval", async function () {
            const { gogogaToken, owner, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const maxUint256 = ethers.MaxUint256;
            await gogogaToken.approve(addr1.address, maxUint256);

            expect(
                await gogogaToken.allowance(owner.address, addr1.address)
            ).to.equal(maxUint256);
        });
    });

    describe("Gas Usage", function () {
        it("Should report gas usage for mint", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const tx = await gogogaToken.mint(
                addr1.address,
                ethers.parseEther("1000")
            );
            const receipt = await tx.wait();

            console.log(
                "       Gas used for mint:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(100000n);
        });

        it("Should report gas usage for transfer", async function () {
            const { gogogaToken, addr1 } = await loadFixture(
                deployGogogaTokenFixture
            );

            const tx = await gogogaToken.transfer(
                addr1.address,
                ethers.parseEther("100")
            );
            const receipt = await tx.wait();

            console.log(
                "       Gas used for transfer:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(100000n);
        });

        it("Should report gas usage for burn", async function () {
            const { gogogaToken } = await loadFixture(deployGogogaTokenFixture);

            const tx = await gogogaToken.burn(ethers.parseEther("100"));
            const receipt = await tx.wait();

            console.log(
                "       Gas used for burn:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(100000n);
        });
    });
});
