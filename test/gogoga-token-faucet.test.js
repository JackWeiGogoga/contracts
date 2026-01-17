const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
    time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GogogaTokenFaucet", function () {
    // Fixture to deploy both token and faucet contracts
    async function deployTokenFaucetFixture() {
        const [owner, user1, user2, user3] = await ethers.getSigners();

        // Deploy GogogaToken
        const GogogaToken = await ethers.getContractFactory("GogogaToken");
        const token = await GogogaToken.deploy();

        // Deploy GogogaTokenFaucet
        // Request amount: 100 tokens, Cooldown: 1 hour (3600 seconds)
        const requestAmount = ethers.parseEther("100");
        const cooldownTime = 3600; // 1 hour

        const GogogaTokenFaucet = await ethers.getContractFactory(
            "GogogaTokenFaucet"
        );
        const faucet = await GogogaTokenFaucet.deploy(
            token.target,
            requestAmount,
            cooldownTime
        );

        // Transfer tokens to faucet contract
        const faucetAmount = ethers.parseEther("10000"); // 10k tokens
        await token.transfer(faucet.target, faucetAmount);

        return {
            token,
            faucet,
            owner,
            user1,
            user2,
            user3,
            requestAmount,
            cooldownTime,
        };
    }

    describe("Deployment", function () {
        it("Should set the correct token address", async function () {
            const { token, faucet } = await loadFixture(
                deployTokenFaucetFixture
            );
            expect(await faucet.faucetToken()).to.equal(token.target);
        });

        it("Should set the correct request amount", async function () {
            const { faucet, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );
            expect(await faucet.requestAmount()).to.equal(requestAmount);
        });

        it("Should set the correct cooldown time", async function () {
            const { faucet, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );
            expect(await faucet.cooldownTime()).to.equal(cooldownTime);
        });

        it("Should set the correct owner", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );
            expect(await faucet.owner()).to.equal(owner.address);
        });

        it("Should initialize with zero max claim per address", async function () {
            const { faucet } = await loadFixture(deployTokenFaucetFixture);
            expect(await faucet.maxClaimPerAddress()).to.equal(0);
        });

        it("Should not be paused initially", async function () {
            const { faucet } = await loadFixture(deployTokenFaucetFixture);
            expect(await faucet.paused()).to.be.false;
        });

        it("Should initialize with zero total distributed", async function () {
            const { faucet } = await loadFixture(deployTokenFaucetFixture);
            expect(await faucet.totalDistributed()).to.equal(0);
        });

        it("Should revert if token address is zero", async function () {
            const GogogaTokenFaucet = await ethers.getContractFactory(
                "GogogaTokenFaucet"
            );
            await expect(
                GogogaTokenFaucet.deploy(
                    ethers.ZeroAddress,
                    ethers.parseEther("100"),
                    3600
                )
            ).to.be.revertedWithCustomError(
                GogogaTokenFaucet,
                "InvalidTokenAddress"
            );
        });

        it("Should revert if request amount is zero", async function () {
            const { token } = await loadFixture(deployTokenFaucetFixture);
            const GogogaTokenFaucet = await ethers.getContractFactory(
                "GogogaTokenFaucet"
            );
            await expect(
                GogogaTokenFaucet.deploy(token.target, 0, 3600)
            ).to.be.revertedWithCustomError(
                GogogaTokenFaucet,
                "InvalidRequestAmount"
            );
        });

        it("Should revert if cooldown time is zero", async function () {
            const { token } = await loadFixture(deployTokenFaucetFixture);
            const GogogaTokenFaucet = await ethers.getContractFactory(
                "GogogaTokenFaucet"
            );
            await expect(
                GogogaTokenFaucet.deploy(
                    token.target,
                    ethers.parseEther("100"),
                    0
                )
            ).to.be.revertedWithCustomError(
                GogogaTokenFaucet,
                "InvalidCooldownTime"
            );
        });
    });

    describe("Requesting Tokens", function () {
        it("Should allow users to request tokens", async function () {
            const { token, faucet, user1, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            const tx = faucet.connect(user1).requestTokens();

            await expect(tx).to.emit(faucet, "TokensRequested");

            await expect(tx).to.changeTokenBalances(
                token,
                [faucet.target, user1.address],
                [-requestAmount, requestAmount]
            );
        });

        it("Should update lastRequestTime", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            const tx = await faucet.connect(user1).requestTokens();
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            expect(await faucet.lastRequestTime(user1.address)).to.equal(
                block.timestamp
            );
        });

        it("Should update totalClaimed for user", async function () {
            const { faucet, user1, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(user1).requestTokens();

            expect(await faucet.totalClaimed(user1.address)).to.equal(
                requestAmount
            );
        });

        it("Should update totalDistributed", async function () {
            const { faucet, user1, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(user1).requestTokens();

            expect(await faucet.totalDistributed()).to.equal(requestAmount);
        });

        it("Should allow multiple users to request", async function () {
            const { faucet, user1, user2, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(user1).requestTokens();
            await faucet.connect(user2).requestTokens();

            expect(await faucet.totalDistributed()).to.equal(
                requestAmount * 2n
            );
        });

        it("Should emit TokensRequested event with correct parameters", async function () {
            const { faucet, user1, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            const tx = await faucet.connect(user1).requestTokens();
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(faucet, "TokensRequested")
                .withArgs(user1.address, requestAmount, block.timestamp);
        });

        it("Should revert if faucet has insufficient balance", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Withdraw all tokens
            const balance = await faucet
                .faucetToken()
                .then((addr) =>
                    ethers
                        .getContractAt("GogogaToken", addr)
                        .then((t) => t.balanceOf(faucet.target))
                );
            await faucet.connect(owner).withdrawTokens(balance);

            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(
                faucet,
                "InsufficientFaucetBalance"
            );
        });

        it("Should revert when paused", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(owner).pause();

            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "EnforcedPause");
        });
    });

    describe("Cooldown Mechanism", function () {
        it("Should enforce cooldown period", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            // First request succeeds
            await faucet.connect(user1).requestTokens();

            // Second request immediately should fail
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "CooldownNotExpired");
        });

        it("Should allow request after cooldown period", async function () {
            const { faucet, user1, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            // First request
            await faucet.connect(user1).requestTokens();

            // Increase time by cooldown period
            await time.increase(cooldownTime);

            // Second request should succeed
            await expect(faucet.connect(user1).requestTokens()).to.not.be
                .reverted;
        });

        it("Should calculate correct remaining time", async function () {
            const { faucet, user1, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(user1).requestTokens();

            // Move forward 1800 seconds (half of cooldown)
            await time.increase(1800);

            const remaining = await faucet.getTimeUntilNextRequest(
                user1.address
            );
            expect(remaining).to.be.closeTo(BigInt(cooldownTime - 1800), 5n); // Allow 5 second tolerance
        });

        it("Should return zero remaining time after cooldown", async function () {
            const { faucet, user1, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(user1).requestTokens();

            // Move forward past cooldown
            await time.increase(cooldownTime + 100);

            const remaining = await faucet.getTimeUntilNextRequest(
                user1.address
            );
            expect(remaining).to.equal(0);
        });

        it("Should allow different users to request independently", async function () {
            const { faucet, user1, user2 } = await loadFixture(
                deployTokenFaucetFixture
            );

            // User1 requests
            await faucet.connect(user1).requestTokens();

            // User2 can request immediately (different cooldown)
            await expect(faucet.connect(user2).requestTokens()).to.not.be
                .reverted;
        });

        it("Should handle multiple request cycles", async function () {
            const { faucet, user1, cooldownTime, requestAmount } =
                await loadFixture(deployTokenFaucetFixture);

            // First request
            await faucet.connect(user1).requestTokens();
            await time.increase(cooldownTime);

            // Second request
            await faucet.connect(user1).requestTokens();
            await time.increase(cooldownTime);

            // Third request
            await faucet.connect(user1).requestTokens();

            expect(await faucet.totalClaimed(user1.address)).to.equal(
                requestAmount * 3n
            );
        });
    });

    describe("Max Claim Limit", function () {
        it("Should allow setting max claim per address", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            const maxClaim = ethers.parseEther("500");
            const tx = await faucet
                .connect(owner)
                .setMaxClaimPerAddress(maxClaim);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(faucet, "MaxClaimPerAddressUpdated")
                .withArgs(0, maxClaim, block.timestamp);

            expect(await faucet.maxClaimPerAddress()).to.equal(maxClaim);
        });

        it("Should enforce max claim limit", async function () {
            const { faucet, owner, user1, requestAmount, cooldownTime } =
                await loadFixture(deployTokenFaucetFixture);

            // Set max claim to 250 tokens (2.5 requests)
            const maxClaim = ethers.parseEther("250");
            await faucet.connect(owner).setMaxClaimPerAddress(maxClaim);

            // First request (100 tokens)
            await faucet.connect(user1).requestTokens();
            await time.increase(cooldownTime);

            // Second request (200 tokens total)
            await faucet.connect(user1).requestTokens();
            await time.increase(cooldownTime);

            // Third request should fail (would be 300 tokens)
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "MaxClaimLimitReached");
        });

        it("Should allow setting max claim to zero (no limit)", async function () {
            const { faucet, owner, user1, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Set and then remove limit
            await faucet
                .connect(owner)
                .setMaxClaimPerAddress(ethers.parseEther("500"));
            await faucet.connect(owner).setMaxClaimPerAddress(0);

            // Multiple requests should work
            for (let i = 0; i < 5; i++) {
                await faucet.connect(user1).requestTokens();
                await time.increase(cooldownTime);
            }

            expect(await faucet.totalClaimed(user1.address)).to.equal(
                ethers.parseEther("500")
            );
        });

        it("Should calculate remaining claim amount correctly", async function () {
            const { faucet, owner, user1, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            const maxClaim = ethers.parseEther("500");
            await faucet.connect(owner).setMaxClaimPerAddress(maxClaim);

            await faucet.connect(user1).requestTokens();

            const remaining = await faucet.getRemainingClaimAmount(
                user1.address
            );
            expect(remaining).to.equal(maxClaim - requestAmount);
        });

        it("Should return max uint256 when no limit set", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            const remaining = await faucet.getRemainingClaimAmount(
                user1.address
            );
            expect(remaining).to.equal(ethers.MaxUint256);
        });

        it("Should not allow non-owner to set max claim", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet
                    .connect(user1)
                    .setMaxClaimPerAddress(ethers.parseEther("500"))
            ).to.be.revertedWithCustomError(
                faucet,
                "OwnableUnauthorizedAccount"
            );
        });
    });

    describe("Configuration Updates", function () {
        it("Should allow owner to update request amount", async function () {
            const { faucet, owner, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            const newAmount = ethers.parseEther("200");
            const tx = await faucet.connect(owner).setRequestAmount(newAmount);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(faucet, "RequestAmountUpdated")
                .withArgs(requestAmount, newAmount, block.timestamp);

            expect(await faucet.requestAmount()).to.equal(newAmount);
        });

        it("Should apply new request amount to next request", async function () {
            const { token, faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            const newAmount = ethers.parseEther("200");
            await faucet.connect(owner).setRequestAmount(newAmount);

            await expect(
                faucet.connect(user1).requestTokens()
            ).to.changeTokenBalance(token, user1.address, newAmount);
        });

        it("Should revert if new request amount is zero", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet.connect(owner).setRequestAmount(0)
            ).to.be.revertedWithCustomError(faucet, "InvalidRequestAmount");
        });

        it("Should allow owner to update cooldown time", async function () {
            const { faucet, owner, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            const newCooldown = 7200; // 2 hours
            const tx = await faucet.connect(owner).setCooldownTime(newCooldown);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(faucet, "CooldownTimeUpdated")
                .withArgs(cooldownTime, newCooldown, block.timestamp);

            expect(await faucet.cooldownTime()).to.equal(newCooldown);
        });

        it("Should apply new cooldown time to next request", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            const newCooldown = 1800; // 30 minutes
            await faucet.connect(owner).setCooldownTime(newCooldown);

            await faucet.connect(user1).requestTokens();

            // Should fail before new cooldown
            await time.increase(1000);
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "CooldownNotExpired");

            // Should succeed after new cooldown
            await time.increase(1000);
            await expect(faucet.connect(user1).requestTokens()).to.not.be
                .reverted;
        });

        it("Should revert if new cooldown time is zero", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet.connect(owner).setCooldownTime(0)
            ).to.be.revertedWithCustomError(faucet, "InvalidCooldownTime");
        });

        it("Should not allow non-owner to update request amount", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet.connect(user1).setRequestAmount(ethers.parseEther("200"))
            ).to.be.revertedWithCustomError(
                faucet,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should not allow non-owner to update cooldown time", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet.connect(user1).setCooldownTime(7200)
            ).to.be.revertedWithCustomError(
                faucet,
                "OwnableUnauthorizedAccount"
            );
        });
    });

    describe("Fund and Withdraw", function () {
        it("Should allow anyone to fund the faucet", async function () {
            const { token, faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Transfer some tokens to user1 first
            await token.transfer(user1.address, ethers.parseEther("1000"));

            // User1 approves and funds faucet
            const fundAmount = ethers.parseEther("500");
            await token.connect(user1).approve(faucet.target, fundAmount);

            const tx = faucet.connect(user1).fundFaucet(fundAmount);

            await expect(tx).to.emit(faucet, "FaucetFunded");

            await expect(tx).to.changeTokenBalances(
                token,
                [user1.address, faucet.target],
                [-fundAmount, fundAmount]
            );
        });

        it("Should emit FaucetFunded event with correct parameters", async function () {
            const { token, faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await token.transfer(user1.address, ethers.parseEther("1000"));

            const fundAmount = ethers.parseEther("500");
            await token.connect(user1).approve(faucet.target, fundAmount);

            const tx = await faucet.connect(user1).fundFaucet(fundAmount);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(faucet, "FaucetFunded")
                .withArgs(user1.address, fundAmount, block.timestamp);
        });

        it("Should allow owner to withdraw tokens", async function () {
            const { token, faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            const withdrawAmount = ethers.parseEther("5000");
            const tx = faucet.connect(owner).withdrawTokens(withdrawAmount);

            await expect(tx).to.emit(faucet, "TokensWithdrawn");

            await expect(tx).to.changeTokenBalances(
                token,
                [faucet.target, owner.address],
                [-withdrawAmount, withdrawAmount]
            );
        });

        it("Should withdraw all tokens if amount exceeds balance", async function () {
            const { token, faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            const faucetBalance = await token.balanceOf(faucet.target);
            const hugeAmount = ethers.parseEther("1000000");

            await expect(
                faucet.connect(owner).withdrawTokens(hugeAmount)
            ).to.changeTokenBalance(token, owner.address, faucetBalance);
        });

        it("Should revert if no tokens to withdraw", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Withdraw all tokens first
            const balance = await faucet
                .faucetToken()
                .then((addr) =>
                    ethers
                        .getContractAt("GogogaToken", addr)
                        .then((t) => t.balanceOf(faucet.target))
                );
            await faucet.connect(owner).withdrawTokens(balance);

            // Try to withdraw again
            await expect(
                faucet.connect(owner).withdrawTokens(ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(faucet, "NoTokensToWithdraw");
        });

        it("Should not allow non-owner to withdraw tokens", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet.connect(user1).withdrawTokens(ethers.parseEther("100"))
            ).to.be.revertedWithCustomError(
                faucet,
                "OwnableUnauthorizedAccount"
            );
        });
    });

    describe("Token Rescue", function () {
        it("Should allow owner to rescue accidentally sent tokens", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Deploy a different token
            const OtherToken = await ethers.getContractFactory("GogogaToken");
            const otherToken = await OtherToken.deploy();

            // Send tokens to faucet contract
            const amount = ethers.parseEther("1000");
            await otherToken.transfer(faucet.target, amount);

            // Rescue tokens
            await expect(
                faucet.connect(owner).rescueTokens(otherToken.target)
            ).to.emit(faucet, "TokensRescued");

            expect(await otherToken.balanceOf(owner.address)).to.equal(
                ethers.parseEther("1000000") // Original 1M tokens
            );
        });

        it("Should not allow rescuing the faucet token", async function () {
            const { token, faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet.connect(owner).rescueTokens(token.target)
            ).to.be.revertedWithCustomError(faucet, "CannotRescueFaucetToken");
        });

        it("Should not allow non-owner to rescue tokens", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            const OtherToken = await ethers.getContractFactory("GogogaToken");
            const otherToken = await OtherToken.deploy();

            await expect(
                faucet.connect(user1).rescueTokens(otherToken.target)
            ).to.be.revertedWithCustomError(
                faucet,
                "OwnableUnauthorizedAccount"
            );
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow owner to pause", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(faucet.connect(owner).pause())
                .to.emit(faucet, "Paused")
                .withArgs(owner.address);

            expect(await faucet.paused()).to.be.true;
        });

        it("Should allow owner to unpause", async function () {
            const { faucet, owner } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(owner).pause();

            await expect(faucet.connect(owner).unpause())
                .to.emit(faucet, "Unpaused")
                .withArgs(owner.address);

            expect(await faucet.paused()).to.be.false;
        });

        it("Should not allow non-owner to pause", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                faucet.connect(user1).pause()
            ).to.be.revertedWithCustomError(
                faucet,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should not allow non-owner to unpause", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(owner).pause();

            await expect(
                faucet.connect(user1).unpause()
            ).to.be.revertedWithCustomError(
                faucet,
                "OwnableUnauthorizedAccount"
            );
        });

        it("Should prevent requesting when paused", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(owner).pause();

            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "EnforcedPause");
        });

        it("Should allow requesting after unpausing", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(owner).pause();
            await faucet.connect(owner).unpause();

            await expect(faucet.connect(user1).requestTokens()).to.not.be
                .reverted;
        });
    });

    describe("View Functions", function () {
        it("Should return correct faucet info", async function () {
            const { token, faucet, requestAmount, cooldownTime } =
                await loadFixture(deployTokenFaucetFixture);

            const info = await faucet.getFaucetInfo();

            expect(info.tokenAddress).to.equal(token.target);
            expect(info.tokenSymbol).to.equal("GOGOGA");
            expect(info.tokenDecimals).to.equal(18);
            expect(info.faucetBalance).to.equal(ethers.parseEther("10000"));
            expect(info.amountPerRequest).to.equal(requestAmount);
            expect(info.cooldown).to.equal(cooldownTime);
            expect(info.maxClaimLimit).to.equal(0);
            expect(info.totalTokensDistributed).to.equal(0);
            expect(info.isPaused).to.be.false;
        });

        it("Should return correct user info", async function () {
            const { faucet, user1, requestAmount, cooldownTime } =
                await loadFixture(deployTokenFaucetFixture);

            // Before any request
            let userInfo = await faucet.getUserInfo(user1.address);
            expect(userInfo.lastRequest).to.equal(0);
            expect(userInfo.totalClaimedAmount).to.equal(0);
            expect(userInfo.timeUntilNext).to.equal(0);
            expect(userInfo.canClaim).to.be.true;

            // After request
            await faucet.connect(user1).requestTokens();

            userInfo = await faucet.getUserInfo(user1.address);
            expect(userInfo.totalClaimedAmount).to.equal(requestAmount);
            expect(userInfo.canClaim).to.be.false;
            expect(userInfo.timeUntilNext).to.be.closeTo(
                BigInt(cooldownTime),
                5n
            );
        });

        it("Should correctly report if user can request tokens", async function () {
            const { faucet, user1, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Before any request
            expect(await faucet.canRequestTokens(user1.address)).to.be.true;

            // After request (during cooldown)
            await faucet.connect(user1).requestTokens();
            expect(await faucet.canRequestTokens(user1.address)).to.be.false;

            // After cooldown
            await time.increase(cooldownTime);
            expect(await faucet.canRequestTokens(user1.address)).to.be.true;
        });

        it("Should return false for canRequestTokens when paused", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(owner).pause();

            expect(await faucet.canRequestTokens(user1.address)).to.be.false;
        });

        it("Should return false for canRequestTokens when insufficient balance", async function () {
            const { faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Withdraw all tokens
            const balance = await faucet
                .faucetToken()
                .then((addr) =>
                    ethers
                        .getContractAt("GogogaToken", addr)
                        .then((t) => t.balanceOf(faucet.target))
                );
            await faucet.connect(owner).withdrawTokens(balance);

            expect(await faucet.canRequestTokens(user1.address)).to.be.false;
        });

        it("Should reflect updated values after requests", async function () {
            const { faucet, user1, user2, requestAmount } = await loadFixture(
                deployTokenFaucetFixture
            );

            await faucet.connect(user1).requestTokens();
            await faucet.connect(user2).requestTokens();

            const info = await faucet.getFaucetInfo();
            expect(info.totalTokensDistributed).to.equal(requestAmount * 2n);
            expect(info.faucetBalance).to.equal(
                ethers.parseEther("10000") - requestAmount * 2n
            );
        });
    });

    describe("Receive and Fallback", function () {
        it("Should revert on direct ETH transfer via receive", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                user1.sendTransaction({
                    to: faucet.target,
                    value: ethers.parseEther("1"),
                })
            ).to.be.revertedWith("This faucet does not accept ETH");
        });

        it("Should revert on fallback with data", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await expect(
                user1.sendTransaction({
                    to: faucet.target,
                    value: ethers.parseEther("1"),
                    data: "0x12345678",
                })
            ).to.be.revertedWith("This faucet does not accept ETH");
        });
    });

    describe("Integration Tests", function () {
        it("Should handle complete faucet lifecycle", async function () {
            const { token, faucet, owner, user1, user2, cooldownTime } =
                await loadFixture(deployTokenFaucetFixture);

            // Users request tokens
            await faucet.connect(user1).requestTokens();
            await faucet.connect(user2).requestTokens();

            // Wait and request again
            await time.increase(cooldownTime);
            await faucet.connect(user1).requestTokens();

            // Owner updates configuration
            await faucet
                .connect(owner)
                .setRequestAmount(ethers.parseEther("150"));
            await faucet.connect(owner).setCooldownTime(1800);

            // More requests with new settings
            await time.increase(1800);
            await faucet.connect(user2).requestTokens();

            // Verify final state
            expect(await faucet.totalDistributed()).to.equal(
                ethers.parseEther("450")
            ); // 100 + 100 + 100 + 150
        });

        it("Should handle pause, fund, and resume", async function () {
            const { token, faucet, owner, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Initial request
            await faucet.connect(user1).requestTokens();

            // Pause
            await faucet.connect(owner).pause();

            // Fund while paused
            await token.approve(faucet.target, ethers.parseEther("5000"));
            await faucet.connect(owner).fundFaucet(ethers.parseEther("5000"));

            // Update settings
            await faucet
                .connect(owner)
                .setRequestAmount(ethers.parseEther("200"));

            // Unpause
            await faucet.connect(owner).unpause();

            // Request with new settings (after cooldown)
            await time.increase(3600);
            await expect(faucet.connect(user1).requestTokens()).to.not.be
                .reverted;

            expect(await token.balanceOf(user1.address)).to.equal(
                ethers.parseEther("300")
            ); // 100 + 200
        });

        it("Should handle max claim limit enforcement across multiple requests", async function () {
            const { faucet, owner, user1, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Set max claim to exactly 3 requests
            await faucet
                .connect(owner)
                .setMaxClaimPerAddress(ethers.parseEther("300"));

            // Make 3 successful requests
            for (let i = 0; i < 3; i++) {
                await faucet.connect(user1).requestTokens();
                await time.increase(cooldownTime);
            }

            // Fourth request should fail
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWithCustomError(faucet, "MaxClaimLimitReached");
        });

        it("Should handle emergency withdrawal scenario", async function () {
            const { token, faucet, owner, user1, user2 } = await loadFixture(
                deployTokenFaucetFixture
            );

            // Users request tokens
            await faucet.connect(user1).requestTokens();
            await faucet.connect(user2).requestTokens();

            // Emergency: pause and withdraw all tokens
            await faucet.connect(owner).pause();

            const remainingBalance = await token.balanceOf(faucet.target);
            await faucet.connect(owner).withdrawTokens(remainingBalance);

            expect(await token.balanceOf(faucet.target)).to.equal(0);
        });
    });

    describe("Gas Usage", function () {
        it("Should report gas usage for requestTokens", async function () {
            const { faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            const tx = await faucet.connect(user1).requestTokens();
            const receipt = await tx.wait();

            console.log(
                "       Gas used for requestTokens:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(150000n);
        });

        it("Should report gas usage for fundFaucet", async function () {
            const { token, faucet, user1 } = await loadFixture(
                deployTokenFaucetFixture
            );

            await token.transfer(user1.address, ethers.parseEther("1000"));
            await token
                .connect(user1)
                .approve(faucet.target, ethers.parseEther("500"));

            const tx = await faucet
                .connect(user1)
                .fundFaucet(ethers.parseEther("500"));
            const receipt = await tx.wait();

            console.log(
                "       Gas used for fundFaucet:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(100000n);
        });

        it("Should report gas usage for second request (with existing data)", async function () {
            const { faucet, user1, cooldownTime } = await loadFixture(
                deployTokenFaucetFixture
            );

            // First request
            await faucet.connect(user1).requestTokens();

            // Wait for cooldown
            await time.increase(cooldownTime);

            // Second request (updating existing mappings)
            const tx = await faucet.connect(user1).requestTokens();
            const receipt = await tx.wait();

            console.log(
                "       Gas used for second request:",
                receipt.gasUsed.toString()
            );
            expect(receipt.gasUsed).to.be.lessThan(130000n);
        });
    });
});
