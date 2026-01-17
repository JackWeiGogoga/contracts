const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
    time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GogogaTokenSale", function () {
    // Fixture to deploy both token and sale contracts
    async function deployTokenSaleFixture() {
        const [owner, buyer1, buyer2, buyer3] = await ethers.getSigners();

        // Deploy GogogaToken
        const GogogaToken = await ethers.getContractFactory("GogogaToken");
        const token = await GogogaToken.deploy();

        // Deploy GogogaTokenSale with price = 0.001 ETH per token
        const tokenPrice = ethers.parseEther("0.001");
        const GogogaTokenSale = await ethers.getContractFactory(
            "GogogaTokenSale"
        );
        const sale = await GogogaTokenSale.deploy(token.target, tokenPrice);

        // Transfer tokens to sale contract
        const saleAmount = ethers.parseEther("100000"); // 100k tokens
        await token.transfer(sale.target, saleAmount);

        return { token, sale, owner, buyer1, buyer2, buyer3, tokenPrice };
    }

    describe("Deployment", function () {
        it("Should set the correct token address", async function () {
            const { token, sale } = await loadFixture(deployTokenSaleFixture);
            expect(await sale.saleToken()).to.equal(token.target);
        });

        it("Should set the correct token price", async function () {
            const { sale, tokenPrice } = await loadFixture(
                deployTokenSaleFixture
            );
            expect(await sale.tokenPriceInEth()).to.equal(tokenPrice);
        });

        it("Should set the correct owner", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);
            expect(await sale.owner()).to.equal(owner.address);
        });

        it("Should set default min and max purchase amounts", async function () {
            const { sale } = await loadFixture(deployTokenSaleFixture);
            expect(await sale.minPurchaseAmount()).to.equal(
                ethers.parseEther("0.001")
            );
            expect(await sale.maxPurchaseAmount()).to.equal(
                ethers.parseEther("10")
            );
        });

        it("Should not be paused initially", async function () {
            const { sale } = await loadFixture(deployTokenSaleFixture);
            expect(await sale.paused()).to.be.false;
        });

        it("Should initialize with zero sales", async function () {
            const { sale } = await loadFixture(deployTokenSaleFixture);
            expect(await sale.totalTokensSold()).to.equal(0);
            expect(await sale.totalEthRaised()).to.equal(0);
            expect(await sale.pendingWithdrawals()).to.equal(0);
        });

        it("Should revert if token address is zero", async function () {
            const GogogaTokenSale = await ethers.getContractFactory(
                "GogogaTokenSale"
            );
            await expect(
                GogogaTokenSale.deploy(
                    ethers.ZeroAddress,
                    ethers.parseEther("0.001")
                )
            ).to.be.revertedWithCustomError(
                GogogaTokenSale,
                "InvalidTokenAddress"
            );
        });

        it("Should revert if price is zero", async function () {
            const { token } = await loadFixture(deployTokenSaleFixture);
            const GogogaTokenSale = await ethers.getContractFactory(
                "GogogaTokenSale"
            );
            await expect(
                GogogaTokenSale.deploy(token.target, 0)
            ).to.be.revertedWithCustomError(GogogaTokenSale, "InvalidPrice");
        });
    });

    describe("Buying Tokens", function () {
        it("Should allow users to buy tokens", async function () {
            const { token, sale, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            const ethAmount = ethers.parseEther("1"); // 1 ETH
            const expectedTokens = ethers.parseEther("1000"); // 1000 tokens

            const tx = sale.connect(buyer1).buyTokens({ value: ethAmount });

            await expect(tx).to.emit(sale, "TokensPurchased");

            await expect(tx).to.changeTokenBalances(
                token,
                [sale.target, buyer1.address],
                [-expectedTokens, expectedTokens]
            );
        });

        it("Should correctly calculate token amount", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const ethAmount = ethers.parseEther("0.5");
            const expectedTokens = ethers.parseEther("500");

            const tx = await sale
                .connect(buyer1)
                .buyTokens({ value: ethAmount });
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "TokensPurchased"
            );
            expect(event.args.tokenAmount).to.equal(expectedTokens);
        });

        it("Should update totalTokensSold", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const ethAmount = ethers.parseEther("1");
            const expectedTokens = ethers.parseEther("1000");

            await sale.connect(buyer1).buyTokens({ value: ethAmount });

            expect(await sale.totalTokensSold()).to.equal(expectedTokens);
        });

        it("Should update totalEthRaised", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const ethAmount = ethers.parseEther("1");

            await sale.connect(buyer1).buyTokens({ value: ethAmount });

            expect(await sale.totalEthRaised()).to.equal(ethAmount);
        });

        it("Should update pendingWithdrawals", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const ethAmount = ethers.parseEther("1");

            await sale.connect(buyer1).buyTokens({ value: ethAmount });

            expect(await sale.pendingWithdrawals()).to.equal(ethAmount);
        });

        it("Should handle multiple purchases", async function () {
            const { sale, buyer1, buyer2 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("1") });
            await sale
                .connect(buyer2)
                .buyTokens({ value: ethers.parseEther("2") });

            expect(await sale.totalEthRaised()).to.equal(
                ethers.parseEther("3")
            );
            expect(await sale.totalTokensSold()).to.equal(
                ethers.parseEther("3000")
            );
        });

        it("Should revert if ETH amount is zero", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await expect(
                sale.connect(buyer1).buyTokens({ value: 0 })
            ).to.be.revertedWithCustomError(sale, "InvalidPurchaseAmount");
        });

        it("Should revert if below minimum purchase", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const tooSmall = ethers.parseEther("0.0001");

            await expect(
                sale.connect(buyer1).buyTokens({ value: tooSmall })
            ).to.be.revertedWithCustomError(sale, "BelowMinimumPurchase");
        });

        it("Should revert if above maximum purchase", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const tooLarge = ethers.parseEther("11");

            await expect(
                sale.connect(buyer1).buyTokens({ value: tooLarge })
            ).to.be.revertedWithCustomError(sale, "AboveMaximumPurchase");
        });

        it("Should revert if contract has insufficient tokens", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            // First, remove the maximum purchase limit to allow large purchases
            await sale.connect(owner).updatePurchaseLimits(
                ethers.parseEther("0.001"),
                0 // No maximum limit
            );

            // Try to buy more tokens than available
            const hugeAmount = ethers.parseEther("101"); // Would need 101,000 tokens (contract only has 100,000)

            await expect(
                sale.connect(buyer1).buyTokens({ value: hugeAmount })
            ).to.be.revertedWithCustomError(sale, "InsufficientTokenBalance");
        });

        it("Should revert when paused", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale.connect(owner).pause();

            await expect(
                sale
                    .connect(buyer1)
                    .buyTokens({ value: ethers.parseEther("1") })
            ).to.be.revertedWithCustomError(sale, "EnforcedPause");
        });

        it("Should work with minimum purchase amount", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const minAmount = await sale.minPurchaseAmount();

            await expect(sale.connect(buyer1).buyTokens({ value: minAmount }))
                .to.not.be.reverted;
        });

        it("Should work with maximum purchase amount", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const maxAmount = await sale.maxPurchaseAmount();

            await expect(sale.connect(buyer1).buyTokens({ value: maxAmount }))
                .to.not.be.reverted;
        });

        it("Should emit TokensPurchased event with correct parameters", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const ethAmount = ethers.parseEther("1");
            const expectedTokens = ethers.parseEther("1000");

            const tx = await sale
                .connect(buyer1)
                .buyTokens({ value: ethAmount });
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(sale, "TokensPurchased")
                .withArgs(
                    buyer1.address,
                    ethAmount,
                    expectedTokens,
                    block.timestamp
                );
        });
    });

    describe("Price Management", function () {
        it("Should allow owner to update price", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);

            const newPrice = ethers.parseEther("0.002");
            const oldPrice = ethers.parseEther("0.001");

            const tx = await sale.connect(owner).updateTokenPrice(newPrice);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(sale, "PriceUpdated")
                .withArgs(oldPrice, newPrice, block.timestamp);

            expect(await sale.tokenPriceInEth()).to.equal(newPrice);
        });

        it("Should calculate correct token amount after price update", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            // Update price to 0.002 ETH
            await sale
                .connect(owner)
                .updateTokenPrice(ethers.parseEther("0.002"));

            // Now 1 ETH should buy 500 tokens (not 1000)
            const ethAmount = ethers.parseEther("1");
            const expectedTokens = ethers.parseEther("500");

            const tx = await sale
                .connect(buyer1)
                .buyTokens({ value: ethAmount });
            const receipt = await tx.wait();

            const event = receipt.logs.find(
                (log) => log.fragment && log.fragment.name === "TokensPurchased"
            );
            expect(event.args.tokenAmount).to.equal(expectedTokens);
        });

        it("Should not allow non-owner to update price", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await expect(
                sale
                    .connect(buyer1)
                    .updateTokenPrice(ethers.parseEther("0.002"))
            ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount");
        });

        it("Should revert if new price is zero", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);

            await expect(
                sale.connect(owner).updateTokenPrice(0)
            ).to.be.revertedWithCustomError(sale, "InvalidPrice");
        });
    });

    describe("Purchase Limits", function () {
        it("Should allow owner to update purchase limits", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);

            const newMin = ethers.parseEther("0.01");
            const newMax = ethers.parseEther("5");

            const tx = await sale
                .connect(owner)
                .updatePurchaseLimits(newMin, newMax);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(sale, "PurchaseLimitsUpdated")
                .withArgs(newMin, newMax, block.timestamp);

            expect(await sale.minPurchaseAmount()).to.equal(newMin);
            expect(await sale.maxPurchaseAmount()).to.equal(newMax);
        });

        it("Should enforce new minimum limit", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale
                .connect(owner)
                .updatePurchaseLimits(
                    ethers.parseEther("0.1"),
                    ethers.parseEther("10")
                );

            await expect(
                sale
                    .connect(buyer1)
                    .buyTokens({ value: ethers.parseEther("0.05") })
            ).to.be.revertedWithCustomError(sale, "BelowMinimumPurchase");
        });

        it("Should enforce new maximum limit", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale
                .connect(owner)
                .updatePurchaseLimits(
                    ethers.parseEther("0.001"),
                    ethers.parseEther("1")
                );

            await expect(
                sale
                    .connect(buyer1)
                    .buyTokens({ value: ethers.parseEther("2") })
            ).to.be.revertedWithCustomError(sale, "AboveMaximumPurchase");
        });

        it("Should allow setting max to zero (no limit)", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale
                .connect(owner)
                .updatePurchaseLimits(ethers.parseEther("0.001"), 0);

            // Should be able to buy with any amount > min
            await expect(
                sale
                    .connect(buyer1)
                    .buyTokens({ value: ethers.parseEther("50") })
            ).to.not.be.reverted;
        });

        it("Should not allow non-owner to update limits", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await expect(
                sale
                    .connect(buyer1)
                    .updatePurchaseLimits(
                        ethers.parseEther("0.01"),
                        ethers.parseEther("5")
                    )
            ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount");
        });
    });

    describe("ETH Withdrawal", function () {
        it("Should allow owner to withdraw ETH", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            // Buyer purchases tokens
            const ethAmount = ethers.parseEther("5");
            await sale.connect(buyer1).buyTokens({ value: ethAmount });

            // Owner withdraws
            const tx = await sale.connect(owner).withdrawEth();
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(sale, "EthWithdrawn")
                .withArgs(owner.address, ethAmount, block.timestamp);

            await expect(tx).to.changeEtherBalances(
                [sale.target, owner.address],
                [-ethAmount, ethAmount]
            );

            expect(await sale.pendingWithdrawals()).to.equal(0);
        });

        it("Should reset pendingWithdrawals to zero", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("1") });
            await sale.connect(owner).withdrawEth();

            expect(await sale.pendingWithdrawals()).to.equal(0);
        });

        it("Should revert if no ETH to withdraw", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);

            await expect(
                sale.connect(owner).withdrawEth()
            ).to.be.revertedWithCustomError(sale, "NoEthToWithdraw");
        });

        it("Should not allow non-owner to withdraw ETH", async function () {
            const { sale, buyer1, buyer2 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("1") });

            await expect(
                sale.connect(buyer2).withdrawEth()
            ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount");
        });

        it("Should handle multiple withdrawals", async function () {
            const { sale, owner, buyer1, buyer2 } = await loadFixture(
                deployTokenSaleFixture
            );

            // First purchase and withdrawal
            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("1") });
            await sale.connect(owner).withdrawEth();

            // Second purchase and withdrawal
            await sale
                .connect(buyer2)
                .buyTokens({ value: ethers.parseEther("2") });
            await sale.connect(owner).withdrawEth();

            expect(await sale.pendingWithdrawals()).to.equal(0);
        });
    });

    describe("Token Withdrawal", function () {
        it("Should allow owner to withdraw remaining tokens", async function () {
            const { token, sale, owner } = await loadFixture(
                deployTokenSaleFixture
            );

            const saleBalance = await token.balanceOf(sale.target);

            const tx = sale.connect(owner).withdrawRemainingTokens();

            await expect(tx).to.emit(sale, "TokensWithdrawn");

            await expect(tx).to.changeTokenBalances(
                token,
                [sale.target, owner.address],
                [-saleBalance, saleBalance]
            );
        });

        it("Should revert if no tokens to withdraw", async function () {
            const { token, sale, owner } = await loadFixture(
                deployTokenSaleFixture
            );

            // Withdraw all tokens first
            await sale.connect(owner).withdrawRemainingTokens();

            // Try to withdraw again
            await expect(
                sale.connect(owner).withdrawRemainingTokens()
            ).to.be.revertedWithCustomError(sale, "NoTokensToWithdraw");
        });

        it("Should not allow non-owner to withdraw tokens", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await expect(
                sale.connect(buyer1).withdrawRemainingTokens()
            ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount");
        });

        it("Should withdraw correct amount after sales", async function () {
            const { token, sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            const initialBalance = await token.balanceOf(sale.target);

            // Buyer purchases some tokens
            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("10") });

            const soldTokens = ethers.parseEther("10000");
            const remainingTokens = initialBalance - soldTokens;

            const tx = await sale.connect(owner).withdrawRemainingTokens();
            await expect(tx).to.changeTokenBalance(
                token,
                owner.address,
                remainingTokens
            );
        });
    });

    describe("Token Rescue", function () {
        it("Should allow owner to rescue accidentally sent tokens", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);

            // Deploy a different token
            const OtherToken = await ethers.getContractFactory("GogogaToken");
            const otherToken = await OtherToken.deploy();

            // Send tokens to sale contract
            const amount = ethers.parseEther("1000");
            await otherToken.transfer(sale.target, amount);

            // Rescue tokens
            await expect(
                sale.connect(owner).rescueTokens(otherToken.target)
            ).to.emit(sale, "TokensRescued");

            expect(await otherToken.balanceOf(owner.address)).to.equal(
                ethers.parseEther("1000000") // Original 1M tokens (all tokens back after rescue)
            );
        });

        it("Should not allow rescuing the sale token", async function () {
            const { token, sale, owner } = await loadFixture(
                deployTokenSaleFixture
            );

            await expect(
                sale.connect(owner).rescueTokens(token.target)
            ).to.be.revertedWithCustomError(sale, "CannotRescueSaleToken");
        });

        it("Should not allow non-owner to rescue tokens", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const OtherToken = await ethers.getContractFactory("GogogaToken");
            const otherToken = await OtherToken.deploy();

            await expect(
                sale.connect(buyer1).rescueTokens(otherToken.target)
            ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount");
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);

            await expect(sale.connect(owner).pause())
                .to.emit(sale, "Paused")
                .withArgs(owner.address);

            expect(await sale.paused()).to.be.true;
        });

        it("Should allow owner to unpause", async function () {
            const { sale, owner } = await loadFixture(deployTokenSaleFixture);

            await sale.connect(owner).pause();

            await expect(sale.connect(owner).unpause())
                .to.emit(sale, "Unpaused")
                .withArgs(owner.address);

            expect(await sale.paused()).to.be.false;
        });

        it("Should not allow non-owner to pause", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await expect(
                sale.connect(buyer1).pause()
            ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount");
        });

        it("Should not allow non-owner to unpause", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale.connect(owner).pause();

            await expect(
                sale.connect(buyer1).unpause()
            ).to.be.revertedWithCustomError(sale, "OwnableUnauthorizedAccount");
        });

        it("Should prevent buying when paused", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale.connect(owner).pause();

            await expect(
                sale
                    .connect(buyer1)
                    .buyTokens({ value: ethers.parseEther("1") })
            ).to.be.revertedWithCustomError(sale, "EnforcedPause");
        });

        it("Should allow buying after unpausing", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale.connect(owner).pause();
            await sale.connect(owner).unpause();

            await expect(
                sale
                    .connect(buyer1)
                    .buyTokens({ value: ethers.parseEther("1") })
            ).to.not.be.reverted;
        });
    });

    describe("View Functions", function () {
        it("Should return correct contract info", async function () {
            const { token, sale, tokenPrice } = await loadFixture(
                deployTokenSaleFixture
            );

            const info = await sale.getContractInfo();

            expect(info.tokenAddress).to.equal(token.target);
            expect(info.tokenSymbol).to.equal("GOGOGA");
            expect(info.tokenDecimals).to.equal(18);
            expect(info.priceInEth).to.equal(tokenPrice);
            expect(info.minPurchase).to.equal(ethers.parseEther("0.001"));
            expect(info.maxPurchase).to.equal(ethers.parseEther("10"));
            expect(info.isPaused).to.be.false;
        });

        it("Should correctly calculate token amount", async function () {
            const { sale } = await loadFixture(deployTokenSaleFixture);

            const ethAmount = ethers.parseEther("2.5");
            const expectedTokens = ethers.parseEther("2500");

            expect(await sale.calculateTokenAmount(ethAmount)).to.equal(
                expectedTokens
            );
        });

        it("Should correctly calculate ETH amount", async function () {
            const { sale } = await loadFixture(deployTokenSaleFixture);

            const tokenAmount = ethers.parseEther("5000");
            const expectedEth = ethers.parseEther("5");

            expect(await sale.calculateEthAmount(tokenAmount)).to.equal(
                expectedEth
            );
        });

        it("Should reflect updated values after sales", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("3") });

            const info = await sale.getContractInfo();

            expect(info.totalSold).to.equal(ethers.parseEther("3000"));
            expect(info.totalRaised).to.equal(ethers.parseEther("3"));
        });
    });

    describe("Receive and Fallback", function () {
        it("Should revert on direct ETH transfer via receive", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await expect(
                buyer1.sendTransaction({
                    to: sale.target,
                    value: ethers.parseEther("1"),
                })
            ).to.be.revertedWith("Use buyTokens() function");
        });

        it("Should revert on fallback with data", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            await expect(
                buyer1.sendTransaction({
                    to: sale.target,
                    value: ethers.parseEther("1"),
                    data: "0x12345678",
                })
            ).to.be.revertedWith("Use buyTokens() function");
        });
    });

    describe("Integration Tests", function () {
        it("Should handle complete sale lifecycle", async function () {
            const { token, sale, owner, buyer1, buyer2 } = await loadFixture(
                deployTokenSaleFixture
            );

            // Multiple buyers purchase tokens
            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("5") });
            await sale
                .connect(buyer2)
                .buyTokens({ value: ethers.parseEther("3") });

            // Owner withdraws ETH
            await sale.connect(owner).withdrawEth();

            // Update price
            await sale
                .connect(owner)
                .updateTokenPrice(ethers.parseEther("0.002"));

            // More purchases at new price
            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("2") });

            // Verify final state
            expect(await sale.totalEthRaised()).to.equal(
                ethers.parseEther("10")
            );
            expect(await sale.totalTokensSold()).to.equal(
                ethers.parseEther("9000")
            ); // 5000 + 3000 + 1000
        });

        it("Should handle pause, update, and resume", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            // Initial purchase
            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("1") });

            // Pause
            await sale.connect(owner).pause();

            // Update settings while paused
            await sale
                .connect(owner)
                .updateTokenPrice(ethers.parseEther("0.0005"));
            await sale
                .connect(owner)
                .updatePurchaseLimits(
                    ethers.parseEther("0.01"),
                    ethers.parseEther("20")
                );

            // Unpause
            await sale.connect(owner).unpause();

            // Purchase with new settings
            await expect(
                sale
                    .connect(buyer1)
                    .buyTokens({ value: ethers.parseEther("1") })
            ).to.not.be.reverted;

            // Should get 2000 tokens now (price is 0.0005)
            expect(await sale.totalTokensSold()).to.equal(
                ethers.parseEther("3000")
            ); // 1000 + 2000
        });

        it("Should handle edge case: buying all available tokens", async function () {
            const { token, sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            // Remove maximum purchase limit to allow buying all tokens
            await sale.connect(owner).updatePurchaseLimits(
                ethers.parseEther("0.001"),
                0 // No maximum limit
            );

            const availableTokens = await token.balanceOf(sale.target);
            // Calculate ETH needed: tokenAmount * tokenPriceInEth / 10^18
            const tokenPriceInEth = ethers.parseEther("0.001");
            const ethNeeded =
                (availableTokens * tokenPriceInEth) / ethers.parseEther("1");

            await sale.connect(buyer1).buyTokens({ value: ethNeeded });

            expect(await token.balanceOf(sale.target)).to.equal(0);
        });
    });

    describe("Gas Usage", function () {
        it("Should report gas usage for buyTokens", async function () {
            const { sale, buyer1 } = await loadFixture(deployTokenSaleFixture);

            const tx = await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("1") });
            const receipt = await tx.wait();

            console.log(
                "       Gas used for buyTokens:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(150000n);
        });

        it("Should report gas usage for withdrawEth", async function () {
            const { sale, owner, buyer1 } = await loadFixture(
                deployTokenSaleFixture
            );

            await sale
                .connect(buyer1)
                .buyTokens({ value: ethers.parseEther("1") });

            const tx = await sale.connect(owner).withdrawEth();
            const receipt = await tx.wait();

            console.log(
                "       Gas used for withdrawEth:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(80000n);
        });
    });
});

// Helper contract for reentrancy attack test
// This would need to be added to the contracts directory for the test to work
