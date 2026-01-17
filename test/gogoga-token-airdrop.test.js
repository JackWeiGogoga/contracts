const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
    time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
    generateMerkleTree,
    verifyProof,
} = require("../scripts/generate-merkle-tree");

describe("GogogaTokenAirdrop", function () {
    // Fixture to deploy token and airdrop contracts
    async function deployAirdropFixture() {
        const [owner, addr1, addr2, addr3, notInList] =
            await ethers.getSigners();

        // 部署代币
        const Token = await ethers.getContractFactory("GogogaToken");
        const token = await Token.deploy();

        // 准备空投列表
        const airdropList = {
            [addr1.address]: ethers.parseEther("100"),
            [addr2.address]: ethers.parseEther("200"),
            [addr3.address]: ethers.parseEther("50"),
        };

        // 生成 merkle tree
        const { merkleRoot, merkleTree, proofs } =
            generateMerkleTree(airdropList);

        // 部署空投合约 (无时间限制)
        const Airdrop = await ethers.getContractFactory("GogogaTokenAirdrop");
        const airdrop = await Airdrop.deploy(
            token.target,
            merkleRoot,
            0, // startTime = 0 (立即开始)
            0 // endTime = 0 (无结束时间)
        );

        // 向空投合约转入代币
        await token.transfer(airdrop.target, ethers.parseEther("1000"));

        return {
            token,
            airdrop,
            owner,
            addr1,
            addr2,
            addr3,
            notInList,
            merkleRoot,
            merkleTree,
            proofs,
            airdropList,
        };
    }

    describe("部署", function () {
        it("应该正确设置代币地址", async function () {
            const { token, airdrop } = await loadFixture(deployAirdropFixture);
            expect(await airdrop.airdropToken()).to.equal(token.target);
        });

        it("应该正确设置 merkle root", async function () {
            const { airdrop, merkleRoot } = await loadFixture(
                deployAirdropFixture
            );
            expect(await airdrop.merkleRoot()).to.equal(merkleRoot);
        });

        it("应该设置正确的 owner", async function () {
            const { airdrop, owner } = await loadFixture(deployAirdropFixture);
            expect(await airdrop.owner()).to.equal(owner.address);
        });

        it("部署时应该拒绝零地址", async function () {
            const { merkleRoot } = await loadFixture(deployAirdropFixture);
            const Airdrop = await ethers.getContractFactory(
                "GogogaTokenAirdrop"
            );
            await expect(
                Airdrop.deploy(ethers.ZeroAddress, merkleRoot, 0, 0)
            ).to.be.revertedWithCustomError(Airdrop, "InvalidTokenAddress");
        });

        it("部署时应该拒绝零 merkle root", async function () {
            const { token } = await loadFixture(deployAirdropFixture);
            const Airdrop = await ethers.getContractFactory(
                "GogogaTokenAirdrop"
            );
            await expect(
                Airdrop.deploy(token.target, ethers.ZeroHash, 0, 0)
            ).to.be.revertedWithCustomError(Airdrop, "InvalidMerkleRoot");
        });
    });

    describe("领取空投", function () {
        it("应该能正确领取空投", async function () {
            const { token, airdrop, addr1, airdropList, proofs } =
                await loadFixture(deployAirdropFixture);

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            const tx = await airdrop.connect(addr1).claim(amount, proof);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(airdrop, "TokensClaimed")
                .withArgs(addr1.address, amount, block.timestamp);

            expect(await token.balanceOf(addr1.address)).to.equal(amount);
            expect(await airdrop.totalClaimed()).to.equal(amount);
            expect(await airdrop.totalClaimCount()).to.equal(1);
        });

        it("不应该允许重复领取", async function () {
            const { airdrop, addr1, airdropList, proofs } = await loadFixture(
                deployAirdropFixture
            );

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            await airdrop.connect(addr1).claim(amount, proof);

            await expect(
                airdrop.connect(addr1).claim(amount, proof)
            ).to.be.revertedWithCustomError(airdrop, "AlreadyClaimed");
        });

        it("应该拒绝无效的 proof", async function () {
            const { airdrop, addr1, addr2, airdropList, proofs } =
                await loadFixture(deployAirdropFixture);

            const amount = airdropList[addr1.address];
            const wrongProof = proofs[addr2.address];

            await expect(
                airdrop.connect(addr1).claim(amount, wrongProof)
            ).to.be.revertedWithCustomError(airdrop, "InvalidProof");
        });

        it("应该拒绝不在白名单中的地址", async function () {
            const { airdrop, notInList, proofs, addr1 } = await loadFixture(
                deployAirdropFixture
            );

            const amount = ethers.parseEther("100");
            const fakeProof = proofs[addr1.address];

            await expect(
                airdrop.connect(notInList).claim(amount, fakeProof)
            ).to.be.revertedWithCustomError(airdrop, "InvalidProof");
        });

        it("多个用户应该能各自领取", async function () {
            const { token, airdrop, addr1, addr2, airdropList, proofs } =
                await loadFixture(deployAirdropFixture);

            // addr1 领取
            await airdrop
                .connect(addr1)
                .claim(airdropList[addr1.address], proofs[addr1.address]);

            // addr2 领取
            await airdrop
                .connect(addr2)
                .claim(airdropList[addr2.address], proofs[addr2.address]);

            expect(await token.balanceOf(addr1.address)).to.equal(
                airdropList[addr1.address]
            );
            expect(await token.balanceOf(addr2.address)).to.equal(
                airdropList[addr2.address]
            );
            expect(await airdrop.totalClaimCount()).to.equal(2);
        });
    });

    describe("时间窗口", function () {
        it("应该拒绝在开始时间之前领取", async function () {
            const { token, addr1, merkleRoot, airdropList, proofs } =
                await loadFixture(deployAirdropFixture);

            const currentTime = await time.latest();
            const startTime = currentTime + 3600; // 1小时后
            const endTime = startTime + 86400; // 开始后24小时

            const Airdrop = await ethers.getContractFactory(
                "GogogaTokenAirdrop"
            );
            const timedAirdrop = await Airdrop.deploy(
                token.target,
                merkleRoot,
                startTime,
                endTime
            );

            await token.transfer(
                timedAirdrop.target,
                ethers.parseEther("1000")
            );

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            await expect(
                timedAirdrop.connect(addr1).claim(amount, proof)
            ).to.be.revertedWithCustomError(timedAirdrop, "AirdropNotStarted");
        });

        it("应该在时间窗口内允许领取", async function () {
            const { token, addr1, merkleRoot, airdropList, proofs } =
                await loadFixture(deployAirdropFixture);

            const currentTime = await time.latest();
            const startTime = currentTime + 100;
            const endTime = startTime + 86400;

            const Airdrop = await ethers.getContractFactory(
                "GogogaTokenAirdrop"
            );
            const timedAirdrop = await Airdrop.deploy(
                token.target,
                merkleRoot,
                startTime,
                endTime
            );

            await token.transfer(
                timedAirdrop.target,
                ethers.parseEther("1000")
            );

            // 前进到开始时间
            await time.increaseTo(startTime + 1);

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            await expect(
                timedAirdrop.connect(addr1).claim(amount, proof)
            ).to.emit(timedAirdrop, "TokensClaimed");
        });

        it("应该拒绝在结束时间之后领取", async function () {
            const { token, addr1, merkleRoot, airdropList, proofs } =
                await loadFixture(deployAirdropFixture);

            const currentTime = await time.latest();
            const startTime = currentTime + 100;
            const endTime = startTime + 3600;

            const Airdrop = await ethers.getContractFactory(
                "GogogaTokenAirdrop"
            );
            const timedAirdrop = await Airdrop.deploy(
                token.target,
                merkleRoot,
                startTime,
                endTime
            );

            await token.transfer(
                timedAirdrop.target,
                ethers.parseEther("1000")
            );

            // 前进到结束时间之后
            await time.increaseTo(endTime + 1);

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            await expect(
                timedAirdrop.connect(addr1).claim(amount, proof)
            ).to.be.revertedWithCustomError(timedAirdrop, "AirdropEnded");
        });
    });

    describe("暂停功能", function () {
        it("owner 应该能暂停合约", async function () {
            const { airdrop } = await loadFixture(deployAirdropFixture);

            await airdrop.pause();
            expect(await airdrop.paused()).to.be.true;
        });

        it("暂停时不应该允许领取", async function () {
            const { airdrop, addr1, airdropList, proofs } = await loadFixture(
                deployAirdropFixture
            );

            await airdrop.pause();

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            await expect(
                airdrop.connect(addr1).claim(amount, proof)
            ).to.be.revertedWithCustomError(airdrop, "EnforcedPause");
        });

        it("非 owner 不应该能暂停", async function () {
            const { airdrop, addr1 } = await loadFixture(deployAirdropFixture);

            await expect(
                airdrop.connect(addr1).pause()
            ).to.be.revertedWithCustomError(
                airdrop,
                "OwnableUnauthorizedAccount"
            );
        });

        it("恢复后应该能正常领取", async function () {
            const { airdrop, addr1, airdropList, proofs } = await loadFixture(
                deployAirdropFixture
            );

            await airdrop.pause();
            await airdrop.unpause();

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            await expect(airdrop.connect(addr1).claim(amount, proof)).to.emit(
                airdrop,
                "TokensClaimed"
            );
        });
    });

    describe("管理功能", function () {
        it("owner 应该能更新 merkle root", async function () {
            const { airdrop, merkleRoot } = await loadFixture(
                deployAirdropFixture
            );

            const newRoot = ethers.hexlify(ethers.randomBytes(32));

            const tx = await airdrop.updateMerkleRoot(newRoot);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(airdrop, "MerkleRootUpdated")
                .withArgs(merkleRoot, newRoot, block.timestamp);

            expect(await airdrop.merkleRoot()).to.equal(newRoot);
        });

        it("owner 应该能更新时间窗口", async function () {
            const { airdrop } = await loadFixture(deployAirdropFixture);

            const currentTime = await time.latest();
            const newStart = currentTime + 3600;
            const newEnd = newStart + 86400;

            const tx = await airdrop.updateTimeWindow(newStart, newEnd);
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);

            await expect(tx)
                .to.emit(airdrop, "TimeWindowUpdated")
                .withArgs(newStart, newEnd, block.timestamp);

            expect(await airdrop.startTime()).to.equal(newStart);
            expect(await airdrop.endTime()).to.equal(newEnd);
        });

        it("owner 应该能在空投结束后提取未领取代币", async function () {
            const { token, owner, merkleRoot } = await loadFixture(
                deployAirdropFixture
            );

            const currentTime = await time.latest();
            const endTime = currentTime + 3600;

            const Airdrop = await ethers.getContractFactory(
                "GogogaTokenAirdrop"
            );
            const timedAirdrop = await Airdrop.deploy(
                token.target,
                merkleRoot,
                0,
                endTime
            );

            await token.transfer(
                timedAirdrop.target,
                ethers.parseEther("1000")
            );

            // 前进到结束时间之后
            await time.increaseTo(endTime + 1);

            const ownerBalanceBefore = await token.balanceOf(owner.address);
            await timedAirdrop.withdrawUnclaimedTokens();
            const ownerBalanceAfter = await token.balanceOf(owner.address);

            expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(
                ethers.parseEther("1000")
            );
        });

        it("不应该在空投期间提取代币", async function () {
            const { token, merkleRoot } = await loadFixture(
                deployAirdropFixture
            );

            const currentTime = await time.latest();
            const endTime = currentTime + 3600;

            const Airdrop = await ethers.getContractFactory(
                "GogogaTokenAirdrop"
            );
            const timedAirdrop = await Airdrop.deploy(
                token.target,
                merkleRoot,
                0,
                endTime
            );

            await token.transfer(
                timedAirdrop.target,
                ethers.parseEther("1000")
            );

            await expect(
                timedAirdrop.withdrawUnclaimedTokens()
            ).to.be.revertedWithCustomError(timedAirdrop, "AirdropStillActive");
        });
    });

    describe("查询功能", function () {
        it("应该能查询空投信息", async function () {
            const { token, airdrop, merkleRoot } = await loadFixture(
                deployAirdropFixture
            );

            const info = await airdrop.getAirdropInfo();

            expect(info.tokenAddress).to.equal(token.target);
            expect(info.root).to.equal(merkleRoot);
            expect(info.claimed).to.equal(0);
            expect(info.claimCount).to.equal(0);
            expect(info.balance).to.equal(ethers.parseEther("1000"));
            expect(info.isActive).to.be.true;
        });

        it("应该能查询领取状态", async function () {
            const { airdrop, addr1, airdropList, proofs } = await loadFixture(
                deployAirdropFixture
            );

            const [claimed1, amount1] = await airdrop.getClaimStatus(
                addr1.address
            );
            expect(claimed1).to.be.false;
            expect(amount1).to.equal(0);

            // 领取后再查询
            await airdrop
                .connect(addr1)
                .claim(airdropList[addr1.address], proofs[addr1.address]);

            const [claimed2, amount2] = await airdrop.getClaimStatus(
                addr1.address
            );
            expect(claimed2).to.be.true;
            expect(amount2).to.equal(airdropList[addr1.address]);
        });

        it("应该能检查是否可以领取", async function () {
            const { airdrop, addr1, airdropList, proofs } = await loadFixture(
                deployAirdropFixture
            );

            const amount = airdropList[addr1.address];
            const proof = proofs[addr1.address];

            const [canClaim, reason] = await airdrop.canClaim(
                addr1.address,
                amount,
                proof
            );
            expect(canClaim).to.be.true;
            expect(reason).to.equal("");

            // 领取后不应该能再领取
            await airdrop.connect(addr1).claim(amount, proof);

            const [canClaim2, reason2] = await airdrop.canClaim(
                addr1.address,
                amount,
                proof
            );
            expect(canClaim2).to.be.false;
            expect(reason2).to.equal("Already claimed");
        });
    });
});
