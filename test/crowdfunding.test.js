const { assert, expect } = require("chai");
const { ethers } = require("hardhat");
const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("test crowdfunding contract", function () {
    const CUSTOM_TIER_INDEX = ethers.MaxUint256; // type(uint256).max

    // Fixture to deploy CrowdfundingFactory
    async function deployCrowdfundingFactoryFixture() {
        const [deployer, addr1, addr2, addr3] = await ethers.getSigners();

        const contractFactory = await ethers.getContractFactory(
            "CrowdfundingFactory"
        );
        const crowdfunding = await contractFactory.deploy();
        await crowdfunding.waitForDeployment();

        return { crowdfunding, deployer, addr1, addr2, addr3 };
    }

    it("test if the owner is the same as the deployer", async function () {
        const { crowdfunding, deployer } = await loadFixture(
            deployCrowdfundingFactoryFixture
        );

        const owner = await crowdfunding.owner();
        assert.equal(owner, deployer.address);
    });

    it("create new campaign with tier-only mode", async function () {
        const { crowdfunding, deployer } = await loadFixture(
            deployCrowdfundingFactoryFixture
        );

        // 创建仅档位模式的活动 (minContribution = 0)
        await crowdfunding.connect(deployer).createCampaign(
            "test campaign",
            "test",
            "ipfs://test-icon",
            100,
            1,
            0,
            [], // 初始无 tiers
            [] // 初始无 tiers
        );

        const allCampaigns = await crowdfunding.getAllCampaigns();
        assert.equal(allCampaigns.length, 1);

        const userCampaigns = await crowdfunding.getUserCampaigns(
            deployer.address
        );
        assert.equal(userCampaigns.length, 1);
        assert.equal(userCampaigns[0].name, "test campaign");
        expect(userCampaigns[0].campaignAddress).to.not.be.null;

        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 验证合约的基本属性
        assert.equal(await campaignContract.owner(), deployer.address);
        assert.equal(await campaignContract.name(), "test campaign");
        assert.equal(await campaignContract.description(), "test");
        assert.equal(await campaignContract.goal(), 100);
        assert.equal(await campaignContract.minContribution(), 0);
        assert.equal(await campaignContract.allowCustomAmount(), false); // minContribution = 0 禁用自定义

        const deadline = await campaignContract.deadline();
        const expectedDeadline =
            BigInt(Math.floor(Date.now() / 1000)) + BigInt(1 * 24 * 60 * 60);
        const timeDiff =
            deadline > expectedDeadline
                ? deadline - expectedDeadline
                : expectedDeadline - deadline;
        expect(timeDiff).to.be.lessThan(10);

        console.log("Campaign verified successfully:");
        console.log("  - Address:", userCampaigns[0].campaignAddress);
        console.log("  - Owner:", await campaignContract.owner());
        console.log("  - Name:", await campaignContract.name());
        console.log("  - Description:", await campaignContract.description());
        console.log("  - Goal:", await campaignContract.goal());
        console.log(
            "  - Min Contribution:",
            await campaignContract.minContribution()
        );
        console.log(
            "  - Allow Custom:",
            await campaignContract.allowCustomAmount()
        );
        console.log(
            "  - Deadline:",
            new Date(Number(deadline) * 1000).toISOString()
        );
    });

    it("test addTier and fund", async function () {
        const {
            crowdfunding,
            deployer: owner,
            addr1: backer1,
            addr2: backer2,
        } = await loadFixture(deployCrowdfundingFactoryFixture);

        // 创建一个众筹活动，目标 1 ETH，持续 7 天，仅档位模式
        await crowdfunding.connect(owner).createCampaign(
            "Tech Project",
            "A revolutionary tech project",
            "ipfs://tech-project-icon",
            ethers.parseEther("1"),
            7,
            0, // 禁用自定义金额
            [], // 初始无 tiers
            [] // 初始无 tiers
        );

        const userCampaigns = await crowdfunding.getUserCampaigns(
            owner.address
        );
        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 1. 测试 addTier - 添加多个档位
        await campaignContract
            .connect(owner)
            .addTier("Bronze Supporter", ethers.parseEther("0.1"));
        await campaignContract
            .connect(owner)
            .addTier("Silver Supporter", ethers.parseEther("0.5"));
        await campaignContract
            .connect(owner)
            .addTier("Gold Supporter", ethers.parseEther("1"));

        const tiers = await campaignContract.getTiers();
        assert.equal(tiers.length, 3);
        assert.equal(tiers[0].name, "Bronze Supporter");
        assert.equal(tiers[0].amount, ethers.parseEther("0.1"));
        assert.equal(tiers[0].backers, 0);

        console.log("\nTiers added successfully:");
        console.log("  - Bronze:", ethers.formatEther(tiers[0].amount), "ETH");
        console.log("  - Silver:", ethers.formatEther(tiers[1].amount), "ETH");
        console.log("  - Gold:", ethers.formatEther(tiers[2].amount), "ETH");

        // 2. 测试错误情况：金额不正确应该失败
        await expect(
            campaignContract.connect(backer1).fund(1, {
                value: ethers.parseEther("0.1"), // 错误的金额
            })
        ).to.be.revertedWithCustomError(
            campaignContract,
            "IncorrectTierAmount"
        );

        console.log("\n✅ Incorrect amount test passed!");

        // 3. 测试 fund - backer1 资助 Bronze 档位
        const bronzeTierIndex = 0;
        const bronzeAmount = tiers[bronzeTierIndex].amount;

        await campaignContract.connect(backer1).fund(bronzeTierIndex, {
            value: bronzeAmount,
        });

        const tiersAfterFund1 = await campaignContract.getTiers();
        assert.equal(tiersAfterFund1[bronzeTierIndex].backers, 1);

        // 验证 backer 信息（现在返回两个值）
        const [backer1Total, backer1Custom] =
            await campaignContract.getBackerInfo(backer1.address);
        assert.equal(backer1Total, bronzeAmount);
        assert.equal(backer1Custom, 0); // 没有自定义捐赠

        // 验证合约余额
        let balance = await campaignContract.getBalance();
        assert.equal(balance, bronzeAmount);

        console.log("\nBacker1 funded Bronze tier:");
        console.log("  - Amount:", ethers.formatEther(bronzeAmount), "ETH");
        console.log(
            "  - Contract Balance:",
            ethers.formatEther(balance),
            "ETH"
        );

        // 4. 测试 fund - backer2 资助 Gold 档位
        const goldTierIndex = 2;
        const goldAmount = tiers[goldTierIndex].amount;

        await campaignContract.connect(backer2).fund(goldTierIndex, {
            value: goldAmount,
        });

        const tiersAfterFund2 = await campaignContract.getTiers();
        assert.equal(tiersAfterFund2[goldTierIndex].backers, 1);

        const [backer2Total, backer2Custom] =
            await campaignContract.getBackerInfo(backer2.address);
        assert.equal(backer2Total, goldAmount);
        assert.equal(backer2Custom, 0);

        balance = await campaignContract.getBalance();
        const expectedBalance = bronzeAmount + goldAmount;
        assert.equal(balance, expectedBalance);

        console.log("\nBacker2 funded Gold tier:");
        console.log("  - Amount:", ethers.formatEther(goldAmount), "ETH");
        console.log(
            "  - Total Contract Balance:",
            ethers.formatEther(balance),
            "ETH"
        );

        // 5. 验证 hasFundedTier
        const backer1FundedBronze = await campaignContract.hasFundedTier(
            backer1.address,
            bronzeTierIndex
        );
        const backer2FundedGold = await campaignContract.hasFundedTier(
            backer2.address,
            goldTierIndex
        );
        assert.equal(backer1FundedBronze, true);
        assert.equal(backer2FundedGold, true);

        // 6. 验证 backer 数量
        const backerCount = await campaignContract.getBackerCount();
        assert.equal(backerCount, 2);

        console.log("\n✅ All addTier and fund tests passed!");
    });

    it("test custom amount funding", async function () {
        const {
            crowdfunding,
            deployer: owner,
            addr1: backer1,
            addr2: backer2,
            addr3: backer3,
        } = await loadFixture(deployCrowdfundingFactoryFixture);

        // 创建支持自定义金额的活动
        const minContribution = ethers.parseEther("0.01"); // 最小 0.01 ETH
        await crowdfunding.connect(owner).createCampaign(
            "Open Source Project",
            "Support our development",
            "ipfs://opensource-icon",
            ethers.parseEther("2"),
            30,
            minContribution, // 启用自定义金额
            [], // 初始无 tiers
            [] // 初始无 tiers
        );

        const userCampaigns = await crowdfunding.getUserCampaigns(
            owner.address
        );
        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 验证自定义金额已启用
        assert.equal(await campaignContract.allowCustomAmount(), true);
        assert.equal(await campaignContract.minContribution(), minContribution);

        console.log("\nCustom amount campaign created:");
        console.log(
            "  - Min Contribution:",
            ethers.formatEther(minContribution),
            "ETH"
        );
        console.log(
            "  - Custom Enabled:",
            await campaignContract.allowCustomAmount()
        );

        // 1. 测试低于最小金额应该失败
        await expect(
            campaignContract.connect(backer1).fund(CUSTOM_TIER_INDEX, {
                value: ethers.parseEther("0.005"), // 低于最小值
            })
        ).to.be.revertedWithCustomError(
            campaignContract,
            "BelowMinimumContribution"
        );

        console.log("\n✅ Below minimum test passed!");

        // 2. 测试自定义金额捐赠
        const custom1Amount = ethers.parseEther("0.05");
        await campaignContract.connect(backer1).fund(CUSTOM_TIER_INDEX, {
            value: custom1Amount,
        });

        const [backer1Total, backer1Custom] =
            await campaignContract.getBackerInfo(backer1.address);
        assert.equal(backer1Total, custom1Amount);
        assert.equal(backer1Custom, custom1Amount);

        console.log("\nBacker1 custom funding:");
        console.log("  - Amount:", ethers.formatEther(custom1Amount), "ETH");

        // 3. 测试不同金额的自定义捐赠
        const custom2Amount = ethers.parseEther("0.15");
        await campaignContract.connect(backer2).fund(CUSTOM_TIER_INDEX, {
            value: custom2Amount,
        });

        const [backer2Total, backer2Custom] =
            await campaignContract.getBackerInfo(backer2.address);
        assert.equal(backer2Total, custom2Amount);
        assert.equal(backer2Custom, custom2Amount);

        console.log("Backer2 custom funding:");
        console.log("  - Amount:", ethers.formatEther(custom2Amount), "ETH");

        // 4. 测试同一个人多次自定义捐赠
        const custom3Amount = ethers.parseEther("0.02");
        await campaignContract.connect(backer1).fund(CUSTOM_TIER_INDEX, {
            value: custom3Amount,
        });

        const [backer1Total2, backer1Custom2] =
            await campaignContract.getBackerInfo(backer1.address);
        assert.equal(backer1Total2, custom1Amount + custom3Amount);
        assert.equal(backer1Custom2, custom1Amount + custom3Amount);

        console.log("Backer1 second custom funding:");
        console.log(
            "  - Additional:",
            ethers.formatEther(custom3Amount),
            "ETH"
        );
        console.log("  - Total:", ethers.formatEther(backer1Total2), "ETH");

        // 5. 验证统计数据
        const [
            totalBackers,
            tierBackers,
            customBackers,
            currentBalance,
            remaining,
        ] = await campaignContract.getCampaignStats();

        assert.equal(totalBackers, 2); // backer1 和 backer2
        assert.equal(tierBackers, 0); // 没有人使用档位
        assert.equal(customBackers, 2); // 两个自定义捐赠者
        assert.equal(
            currentBalance,
            custom1Amount + custom2Amount + custom3Amount
        );

        console.log("\nCampaign stats:");
        console.log("  - Total Backers:", totalBackers.toString());
        console.log("  - Tier Backers:", tierBackers.toString());
        console.log("  - Custom Backers:", customBackers.toString());
        console.log(
            "  - Current Balance:",
            ethers.formatEther(currentBalance),
            "ETH"
        );

        console.log("\n✅ All custom amount tests passed!");
    });

    it("test hybrid mode (tiers + custom amount)", async function () {
        const {
            crowdfunding,
            deployer: owner,
            addr1: backer1,
            addr2: backer2,
            addr3: backer3,
        } = await loadFixture(deployCrowdfundingFactoryFixture);

        // 创建混合模式活动
        const minContribution = ethers.parseEther("0.01");
        await crowdfunding.connect(owner).createCampaign(
            "Hybrid Campaign",
            "Support with tiers or custom amount",
            "ipfs://hybrid-icon",
            ethers.parseEther("5"),
            14,
            minContribution,
            [], // 初始无 tiers
            [] // 初始无 tiers
        );

        const userCampaigns = await crowdfunding.getUserCampaigns(
            owner.address
        );
        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 添加档位
        await campaignContract
            .connect(owner)
            .addTier("Supporter", ethers.parseEther("0.1"));
        await campaignContract
            .connect(owner)
            .addTier("VIP", ethers.parseEther("0.5"));

        console.log("\nHybrid campaign created with tiers and custom funding");

        // 1. Backer1 使用档位
        await campaignContract.connect(backer1).fund(0, {
            value: ethers.parseEther("0.1"),
        });

        const [backer1Total, backer1Custom] =
            await campaignContract.getBackerInfo(backer1.address);
        assert.equal(backer1Total, ethers.parseEther("0.1"));
        assert.equal(backer1Custom, 0); // 使用档位，没有自定义金额

        console.log("\nBacker1 funded via tier:");
        console.log("  - Total:", ethers.formatEther(backer1Total), "ETH");
        console.log("  - Custom:", ethers.formatEther(backer1Custom), "ETH");

        // 2. Backer2 使用自定义金额
        await campaignContract.connect(backer2).fund(CUSTOM_TIER_INDEX, {
            value: ethers.parseEther("0.25"),
        });

        const [backer2Total, backer2Custom] =
            await campaignContract.getBackerInfo(backer2.address);
        assert.equal(backer2Total, ethers.parseEther("0.25"));
        assert.equal(backer2Custom, ethers.parseEther("0.25"));

        console.log("Backer2 funded via custom:");
        console.log("  - Total:", ethers.formatEther(backer2Total), "ETH");
        console.log("  - Custom:", ethers.formatEther(backer2Custom), "ETH");

        // 3. Backer3 同时使用两种方式
        await campaignContract.connect(backer3).fund(1, {
            value: ethers.parseEther("0.5"),
        });
        await campaignContract.connect(backer3).fund(CUSTOM_TIER_INDEX, {
            value: ethers.parseEther("0.15"),
        });

        const [backer3Total, backer3Custom] =
            await campaignContract.getBackerInfo(backer3.address);
        assert.equal(backer3Total, ethers.parseEther("0.65")); // 0.5 + 0.15
        assert.equal(backer3Custom, ethers.parseEther("0.15")); // 只有自定义部分

        console.log("Backer3 funded via both:");
        console.log("  - Total:", ethers.formatEther(backer3Total), "ETH");
        console.log("  - Custom:", ethers.formatEther(backer3Custom), "ETH");

        // 4. 验证统计数据
        const [
            totalBackers,
            tierBackers,
            customBackers,
            currentBalance,
            remaining,
        ] = await campaignContract.getCampaignStats();

        assert.equal(totalBackers, 3);
        assert.equal(tierBackers, 2); // backer1 和 backer3 使用了档位
        assert.equal(customBackers, 2); // backer2 和 backer3 使用了自定义
        assert.equal(currentBalance, ethers.parseEther("1")); // 0.1 + 0.25 + 0.5 + 0.15

        console.log("\nFinal campaign stats:");
        console.log("  - Total Backers:", totalBackers.toString());
        console.log("  - Tier Backers:", tierBackers.toString());
        console.log("  - Custom Backers:", customBackers.toString());
        console.log("  - Balance:", ethers.formatEther(currentBalance), "ETH");
        console.log("  - Remaining:", ethers.formatEther(remaining), "ETH");

        // 5. 测试 getAllBackers
        const allBackers = await campaignContract.getAllBackers();
        assert.equal(allBackers.length, 3);
        assert.equal(allBackers[0], backer1.address);
        assert.equal(allBackers[1], backer2.address);
        assert.equal(allBackers[2], backer3.address);

        console.log("\nAll backers:", allBackers);

        console.log("\n✅ All hybrid mode tests passed!");
    });

    it("test toggle custom amount feature", async function () {
        const {
            crowdfunding,
            deployer: owner,
            addr1: backer1,
        } = await loadFixture(deployCrowdfundingFactoryFixture);

        // 创建支持自定义金额的活动
        await crowdfunding.connect(owner).createCampaign(
            "Toggle Test",
            "Test toggle feature",
            "ipfs://toggle-test-icon",
            ethers.parseEther("1"),
            7,
            ethers.parseEther("0.01"),
            [], // 初始无 tiers
            [] // 初始无 tiers
        );

        const userCampaigns = await crowdfunding.getUserCampaigns(
            owner.address
        );
        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 验证初始状态
        assert.equal(await campaignContract.allowCustomAmount(), true);

        // 1. Owner 关闭自定义金额功能
        await campaignContract.connect(owner).toggleCustomAmount();
        assert.equal(await campaignContract.allowCustomAmount(), false);

        console.log("\nCustom amount disabled");

        // 2. 尝试自定义捐赠应该失败
        await expect(
            campaignContract.connect(backer1).fund(CUSTOM_TIER_INDEX, {
                value: ethers.parseEther("0.05"),
            })
        ).to.be.revertedWithCustomError(
            campaignContract,
            "CustomAmountNotAllowed"
        );

        console.log("✅ Custom funding blocked when disabled");

        // 3. Owner 重新开启
        await campaignContract.connect(owner).toggleCustomAmount();
        assert.equal(await campaignContract.allowCustomAmount(), true);

        // 4. 现在应该可以捐赠了
        await campaignContract.connect(backer1).fund(CUSTOM_TIER_INDEX, {
            value: ethers.parseEther("0.05"),
        });

        const [total, custom] = await campaignContract.getBackerInfo(
            backer1.address
        );
        assert.equal(total, ethers.parseEther("0.05"));

        console.log("✅ Custom funding works when enabled");

        console.log("\n✅ Toggle custom amount test passed!");
    });

    it("test create campaign with initial tiers", async function () {
        const {
            crowdfunding,
            deployer: owner,
            addr1: backer1,
            addr2: backer2,
        } = await loadFixture(deployCrowdfundingFactoryFixture);

        // 创建活动时就设置初始档位
        const tierNames = ["Bronze", "Silver", "Gold"];
        const tierAmounts = [
            ethers.parseEther("0.1"),
            ethers.parseEther("0.5"),
            ethers.parseEther("1.0"),
        ];

        await crowdfunding
            .connect(owner)
            .createCampaign(
                "Pre-configured Campaign",
                "Campaign with initial tiers",
                "ipfs://preconfig-icon",
                ethers.parseEther("5"),
                30,
                ethers.parseEther("0.01"),
                tierNames,
                tierAmounts
            );

        const userCampaigns = await crowdfunding.getUserCampaigns(
            owner.address
        );
        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 验证初始档位已设置
        const tiers = await campaignContract.getTiers();
        assert.equal(tiers.length, 3);
        assert.equal(tiers[0].name, "Bronze");
        assert.equal(tiers[0].amount, ethers.parseEther("0.1"));
        assert.equal(tiers[1].name, "Silver");
        assert.equal(tiers[1].amount, ethers.parseEther("0.5"));
        assert.equal(tiers[2].name, "Gold");
        assert.equal(tiers[2].amount, ethers.parseEther("1.0"));

        console.log("\n✅ Campaign created with initial tiers:");
        console.log(
            "  - Tier 0:",
            tiers[0].name,
            "-",
            ethers.formatEther(tiers[0].amount),
            "ETH"
        );
        console.log(
            "  - Tier 1:",
            tiers[1].name,
            "-",
            ethers.formatEther(tiers[1].amount),
            "ETH"
        );
        console.log(
            "  - Tier 2:",
            tiers[2].name,
            "-",
            ethers.formatEther(tiers[2].amount),
            "ETH"
        );

        // 测试可以直接使用这些档位进行捐赠
        await campaignContract.connect(backer1).fund(0, {
            value: ethers.parseEther("0.1"),
        });
        await campaignContract.connect(backer2).fund(2, {
            value: ethers.parseEther("1.0"),
        });

        const balance = await campaignContract.getBalance();
        assert.equal(balance, ethers.parseEther("1.1"));

        console.log("\n✅ Backers successfully funded using initial tiers");
        console.log("  - Balance:", ethers.formatEther(balance), "ETH");

        console.log("\n✅ Create campaign with initial tiers test passed!");
    });

    it("test addTiers batch method", async function () {
        const { crowdfunding, deployer: owner } = await loadFixture(
            deployCrowdfundingFactoryFixture
        );

        // 创建活动
        await crowdfunding.connect(owner).createCampaign(
            "Batch Tiers Test",
            "Test batch adding tiers",
            "ipfs://batch-icon",
            ethers.parseEther("10"),
            30,
            0,
            [], // 不设置初始档位
            []
        );

        const userCampaigns = await crowdfunding.getUserCampaigns(
            owner.address
        );
        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 使用批量方法添加多个档位
        const tierNames = ["Tier1", "Tier2", "Tier3", "Tier4"];
        const tierAmounts = [
            ethers.parseEther("0.05"),
            ethers.parseEther("0.1"),
            ethers.parseEther("0.25"),
            ethers.parseEther("0.5"),
        ];

        await campaignContract.connect(owner).addTiers(tierNames, tierAmounts);

        // 验证所有档位已添加
        const tiers = await campaignContract.getTiers();
        assert.equal(tiers.length, 4);

        for (let i = 0; i < tiers.length; i++) {
            assert.equal(tiers[i].name, tierNames[i]);
            assert.equal(tiers[i].amount, tierAmounts[i]);
        }

        console.log("\n✅ Batch added 4 tiers successfully:");
        for (let i = 0; i < tiers.length; i++) {
            console.log(
                `  - ${tiers[i].name}: ${ethers.formatEther(
                    tiers[i].amount
                )} ETH`
            );
        }

        // 测试错误情况：数组长度不匹配
        await expect(
            campaignContract
                .connect(owner)
                .addTiers(
                    ["Tier5"],
                    [ethers.parseEther("1"), ethers.parseEther("2")]
                )
        ).to.be.revertedWithCustomError(
            campaignContract,
            "ArraysLengthMismatch"
        );

        console.log("\n✅ Array length mismatch validation works");

        // 测试错误情况：空数组
        await expect(
            campaignContract.connect(owner).addTiers([], [])
        ).to.be.revertedWithCustomError(
            campaignContract,
            "MustAddAtLeastOneTier"
        );

        console.log("✅ Empty array validation works");

        console.log("\n✅ AddTiers batch method test passed!");
    });

    it("test update minimum contribution", async function () {
        const {
            crowdfunding,
            deployer: owner,
            addr1: backer1,
        } = await loadFixture(deployCrowdfundingFactoryFixture);

        await crowdfunding.connect(owner).createCampaign(
            "Min Update Test",
            "Test min contribution update",
            "ipfs://min-update-icon",
            ethers.parseEther("1"),
            7,
            ethers.parseEther("0.01"),
            [], // 初始无 tiers
            [] // 初始无 tiers
        );

        const userCampaigns = await crowdfunding.getUserCampaigns(
            owner.address
        );
        const campaignContract = await ethers.getContractAt(
            "Crowdfunding",
            userCampaigns[0].campaignAddress
        );

        // 验证初始最小金额
        assert.equal(
            await campaignContract.minContribution(),
            ethers.parseEther("0.01")
        );

        // 1. Owner 更新最小金额
        const newMin = ethers.parseEther("0.05");
        await campaignContract.connect(owner).updateMinContribution(newMin);
        assert.equal(await campaignContract.minContribution(), newMin);

        console.log(
            "\nMin contribution updated to:",
            ethers.formatEther(newMin),
            "ETH"
        );

        // 2. 低于新最小值应该失败
        await expect(
            campaignContract.connect(backer1).fund(CUSTOM_TIER_INDEX, {
                value: ethers.parseEther("0.02"), // 低于新最小值 0.05
            })
        ).to.be.revertedWithCustomError(
            campaignContract,
            "BelowMinimumContribution"
        );

        console.log("✅ Below new minimum rejected");

        // 3. 达到新最小值应该成功
        await campaignContract.connect(backer1).fund(CUSTOM_TIER_INDEX, {
            value: ethers.parseEther("0.05"),
        });

        const [total, custom] = await campaignContract.getBackerInfo(
            backer1.address
        );
        assert.equal(total, ethers.parseEther("0.05"));

        console.log("✅ New minimum accepted");

        console.log("\n✅ Update minimum contribution test passed!");
    });
});
