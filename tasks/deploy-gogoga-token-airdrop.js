const { task } = require("hardhat/config");
const { generateMerkleTree } = require("../scripts/generate-merkle-tree");
const fs = require("fs");
const path = require("path");

task(
    "deploy-gogoga-token-airdrop",
    "Deploys the GogogaTokenAirdrop contract with Merkle tree"
)
    .addParam("token", "Address of the token to airdrop")
    .addParam(
        "fund",
        "Amount of tokens to transfer to airdrop contract (e.g., 100000)"
    )
    .addParam("airdropFile", "Path to the airdrop list JSON file")
    .addOptionalParam(
        "startTime",
        "Airdrop start timestamp (0 for immediate)",
        "0"
    )
    .addOptionalParam("endTime", "Airdrop end timestamp (0 for no limit)", "0")
    .setAction(async (taskArgs, hre) => {
        // Validate required parameters
        if (!taskArgs.token) {
            throw new Error("❌ Missing required parameter: --token");
        }
        if (!taskArgs.fund) {
            throw new Error("❌ Missing required parameter: --fund");
        }
        if (!taskArgs.airdropFile) {
            throw new Error("❌ Missing required parameter: --airdropFile");
        }

        // Validate parameter values
        if (parseFloat(taskArgs.fund) <= 0) {
            throw new Error("❌ Fund amount must be greater than 0");
        }

        console.log("\n🚀 Starting GogogaTokenAirdrop deployment...\n");
        console.log("📊 Configuration:");
        console.log(`   Network: ${hre.network.name}`);
        console.log(`   Chain ID: ${hre.network.config.chainId}`);

        // Get deployer account
        const [deployer] = await hre.ethers.getSigners();
        console.log("📝 Deploying with account:", deployer.address);

        const balance = await hre.ethers.provider.getBalance(deployer.address);
        console.log(
            "💰 Account balance:",
            hre.ethers.formatEther(balance),
            "ETH\n"
        );

        // Step 1: Get token contract
        const tokenAddress = taskArgs.token;
        console.log(`🪙 Using token contract at: ${tokenAddress}`);

        const tokenContract = await hre.ethers.getContractAt(
            "GogogaToken",
            tokenAddress
        );

        // Get token information
        const tokenName = await tokenContract.name();
        const tokenSymbol = await tokenContract.symbol();
        const tokenDecimals = await tokenContract.decimals();
        const totalSupply = await tokenContract.totalSupply();

        console.log("📊 Token Information:");
        console.log(`   Name: ${tokenName}`);
        console.log(`   Symbol: ${tokenSymbol}`);
        console.log(`   Decimals: ${tokenDecimals}`);
        console.log(
            `   Total Supply: ${hre.ethers.formatUnits(
                totalSupply,
                tokenDecimals
            )} ${tokenSymbol}\n`
        );

        // Step 2: Prepare airdrop list from file
        console.log(`📋 Reading airdrop list from: ${taskArgs.airdropFile}`);

        // Check if file exists
        const airdropFilePath = path.resolve(taskArgs.airdropFile);
        if (!fs.existsSync(airdropFilePath)) {
            throw new Error(`❌ Airdrop file not found: ${airdropFilePath}`);
        }

        // Read and parse the airdrop list file
        let airdropData;
        try {
            const fileContent = fs.readFileSync(airdropFilePath, "utf-8");
            airdropData = JSON.parse(fileContent);
        } catch (error) {
            throw new Error(
                `❌ Failed to read or parse airdrop file: ${error.message}`
            );
        }

        // Validate airdrop data format
        if (typeof airdropData !== "object" || airdropData === null) {
            throw new Error(
                "❌ Airdrop file must contain a JSON object with address-amount pairs"
            );
        }

        // Convert string amounts to BigInt with token decimals
        const airdropList = {};
        for (const [address, amount] of Object.entries(airdropData)) {
            if (!hre.ethers.isAddress(address)) {
                throw new Error(
                    `❌ Invalid address in airdrop list: ${address}`
                );
            }
            if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
                throw new Error(
                    `❌ Invalid amount for address ${address}: ${amount}`
                );
            }
            airdropList[address.toLowerCase()] = hre.ethers.parseUnits(
                amount.toString(),
                tokenDecimals
            );
        }

        console.log(`   Recipients: ${Object.keys(airdropList).length}`);
        const totalAirdropAmount = Object.values(airdropList).reduce(
            (sum, amount) => sum + amount,
            0n
        );
        console.log(
            `   Total Airdrop Amount: ${hre.ethers.formatUnits(
                totalAirdropAmount,
                tokenDecimals
            )} ${tokenSymbol}\n`
        );

        // Step 3: Generate Merkle Tree
        console.log("🌳 Generating Merkle Tree...");
        const { merkleRoot, proofs } = generateMerkleTree(airdropList);
        console.log(`   Merkle Root: ${merkleRoot}`);
        console.log(`   Proofs generated: ${Object.keys(proofs).length}\n`);

        // Step 4: Parse time parameters
        const startTime = parseInt(taskArgs.startTime);
        const endTime = parseInt(taskArgs.endTime);

        console.log("⏰ Time Configuration:");
        if (startTime === 0) {
            console.log("   Start Time: Immediate");
        } else {
            console.log(
                `   Start Time: ${new Date(startTime * 1000).toISOString()}`
            );
        }
        if (endTime === 0) {
            console.log("   End Time: No limit");
        } else {
            console.log(
                `   End Time: ${new Date(endTime * 1000).toISOString()}`
            );
        }
        console.log();

        // Step 5: Deploy GogogaTokenAirdrop
        console.log("📦 Deploying GogogaTokenAirdrop contract...");
        console.log("⚙️  Constructor Parameters:");
        console.log(`   Token Address: ${tokenAddress}`);
        console.log(`   Merkle Root: ${merkleRoot}`);
        console.log(`   Start Time: ${startTime}`);
        console.log(`   End Time: ${endTime}\n`);

        const airdropFactory = await hre.ethers.getContractFactory(
            "GogogaTokenAirdrop"
        );
        const airdropContract = await airdropFactory.deploy(
            tokenAddress,
            merkleRoot,
            startTime,
            endTime
        );
        await airdropContract.waitForDeployment();

        const airdropAddress = airdropContract.target;
        console.log(`✅ GogogaTokenAirdrop deployed successfully!`);
        console.log(`📍 Contract address: ${airdropAddress}\n`);

        // Step 6: Fund the airdrop contract with tokens
        const fundAmount = hre.ethers.parseUnits(taskArgs.fund, tokenDecimals);
        console.log(
            `💰 Transferring ${taskArgs.fund} ${tokenSymbol} to airdrop contract...`
        );

        // Check deployer balance
        const deployerBalance = await tokenContract.balanceOf(deployer.address);
        console.log(
            `   Deployer balance: ${hre.ethers.formatUnits(
                deployerBalance,
                tokenDecimals
            )} ${tokenSymbol}`
        );

        if (deployerBalance < fundAmount) {
            throw new Error(
                `❌ Insufficient token balance! Need ${
                    taskArgs.fund
                } ${tokenSymbol}, but only have ${hre.ethers.formatUnits(
                    deployerBalance,
                    tokenDecimals
                )} ${tokenSymbol}`
            );
        }

        const tx = await tokenContract.transfer(airdropAddress, fundAmount);
        console.log(`   Transaction hash: ${tx.hash}`);
        await tx.wait();

        const airdropBalance = await tokenContract.balanceOf(airdropAddress);
        console.log(
            `✅ Transfer successful! Airdrop contract balance: ${hre.ethers.formatUnits(
                airdropBalance,
                tokenDecimals
            )} ${tokenSymbol}\n`
        );

        // Step 7: Save deployment information
        const deploymentsDir = path.join(__dirname, "../deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }

        const deploymentInfo = {
            network: hre.network.name,
            chainId: hre.network.config.chainId,
            airdropContract: airdropAddress,
            tokenContract: tokenAddress,
            tokenName: tokenName,
            tokenSymbol: tokenSymbol,
            merkleRoot: merkleRoot,
            startTime: startTime,
            endTime: endTime,
            deployer: deployer.address,
            deployTime: new Date().toISOString(),
            totalRecipients: Object.keys(airdropList).length,
            totalAirdropAmount: totalAirdropAmount.toString(),
            fundedAmount: fundAmount.toString(),
            proofs: proofs,
            airdropList: Object.fromEntries(
                Object.entries(airdropList).map(([addr, amt]) => [
                    addr,
                    amt.toString(),
                ])
            ),
        };

        const filename = `airdrop-${hre.network.name}-${Date.now()}.json`;
        const filePath = path.join(deploymentsDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
        console.log(`💾 Deployment info saved to: deployments/${filename}\n`);

        // Step 8: Verify on Etherscan if on Sepolia testnet
        if (
            hre.network.config.chainId === 11155111 &&
            process.env.ETHERSCAN_KEY
        ) {
            console.log(
                "⏳ Waiting for block confirmations before verification..."
            );
            await airdropContract.deploymentTransaction().wait(5);

            console.log("🔍 Verifying GogogaTokenAirdrop on Etherscan...");
            await etherscanVerify(
                airdropAddress,
                [tokenAddress, merkleRoot, startTime, endTime],
                hre
            );
        } else {
            console.log("⏭️  Skipping contract verification.");
            if (
                hre.network.config.chainId === 11155111 &&
                !process.env.ETHERSCAN_KEY
            ) {
                console.log(
                    "💡 Tip: Set ETHERSCAN_KEY in .env to enable verification"
                );
            }
        }

        // Step 9: Print deployment summary
        console.log("\n" + "=".repeat(70));
        console.log("🎉 Deployment Summary");
        console.log("=".repeat(70));
        console.log(`Network:              ${hre.network.name}`);
        console.log(`Deployer:             ${deployer.address}`);
        console.log(`Token Contract:       ${tokenAddress}`);
        console.log(`Airdrop Contract:     ${airdropAddress}`);
        console.log(`Token:                ${tokenName} (${tokenSymbol})`);
        console.log(`Merkle Root:          ${merkleRoot}`);
        console.log(`Recipients:           ${Object.keys(airdropList).length}`);
        console.log(
            `Total Airdrop:        ${hre.ethers.formatUnits(
                totalAirdropAmount,
                tokenDecimals
            )} ${tokenSymbol}`
        );
        console.log(
            `Funded Amount:        ${hre.ethers.formatUnits(
                airdropBalance,
                tokenDecimals
            )} ${tokenSymbol}`
        );
        console.log(
            `Start Time:           ${
                startTime === 0
                    ? "Immediate"
                    : new Date(startTime * 1000).toISOString()
            }`
        );
        console.log(
            `End Time:             ${
                endTime === 0
                    ? "No limit"
                    : new Date(endTime * 1000).toISOString()
            }`
        );
        console.log("\n✨ Deployment completed successfully!\n");

        console.log("📝 Next Steps:");
        console.log(
            "   1. Users can claim their airdrop using the Merkle proofs"
        );
        console.log(`   2. Proofs are saved in: deployments/${filename}`);
        console.log(
            "   3. To claim, users need: address, amount, and proof array"
        );
        console.log(
            `   4. Example claim for first address: check the deployment file\n`
        );

        // Print example claim info for first address
        const firstAddress = Object.keys(airdropList)[0];
        if (firstAddress && proofs[firstAddress]) {
            console.log("💡 Example Claim Info (First Recipient):");
            console.log(`   Address: ${firstAddress}`);
            console.log(
                `   Amount: ${hre.ethers.formatUnits(
                    airdropList[firstAddress],
                    tokenDecimals
                )} ${tokenSymbol}`
            );
            console.log(`   Proof: ${JSON.stringify(proofs[firstAddress])}\n`);
        }

        // Return contracts for potential further use
        return {
            token: tokenContract,
            airdrop: airdropContract,
            tokenAddress: tokenAddress,
            airdropAddress: airdropAddress,
            deploymentInfo: deploymentInfo,
        };
    });

async function etherscanVerify(contractAddress, constructorArguments, hre) {
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: constructorArguments,
        });
        console.log("✅ Contract verified successfully on Etherscan!");
    } catch (error) {
        if (error.message.includes("Already Verified")) {
            console.log("ℹ️  Contract already verified on Etherscan");
        } else {
            console.error("❌ Verification failed:", error.message);
        }
    }
}

module.exports = {};
