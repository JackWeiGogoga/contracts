const { task } = require("hardhat/config");

task("deploy-gogoga-token-sale", "Deploys the GogogaTokenSale contract")
    .addParam("token", "Address of the token to sell")
    .addParam(
        "price",
        "Token price in ETH (e.g., 0.001 = 1 token costs 0.001 ETH)"
    )
    .addParam(
        "fund",
        "Amount of tokens to transfer to sale contract (e.g., 100000)"
    )
    .setAction(async (taskArgs, hre) => {
        // Validate required parameters
        if (!taskArgs.token) {
            throw new Error("❌ Missing required parameter: --token");
        }
        if (!taskArgs.price) {
            throw new Error("❌ Missing required parameter: --price");
        }
        if (!taskArgs.fund) {
            throw new Error("❌ Missing required parameter: --fund");
        }

        // Validate parameter values
        if (parseFloat(taskArgs.price) <= 0) {
            throw new Error("❌ Price must be greater than 0");
        }
        if (parseFloat(taskArgs.fund) <= 0) {
            throw new Error("❌ Fund amount must be greater than 0");
        }
        console.log("\n🚀 Starting GogogaTokenSale deployment...\n");
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
        console.log(`� Using token contract at: ${tokenAddress}`);

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

        // Step 2: Deploy GogogaTokenSale
        const tokenPrice = hre.ethers.parseEther(taskArgs.price);
        console.log("📦 Deploying GogogaTokenSale contract...");
        console.log("⚙️  Constructor Parameters:");
        console.log(`   Token Address: ${tokenAddress}`);
        console.log(`   Token Price: ${taskArgs.price} ETH per token`);

        const saleFactory = await hre.ethers.getContractFactory(
            "GogogaTokenSale"
        );
        const saleContract = await saleFactory.deploy(tokenAddress, tokenPrice);
        await saleContract.waitForDeployment();

        const saleAddress = saleContract.target;
        console.log(`✅ GogogaTokenSale deployed successfully!`);
        console.log(`📍 Contract address: ${saleAddress}\n`);

        // Step 3: Get sale contract information
        const saleTokenAddress = await saleContract.saleToken();
        const priceInEth = await saleContract.tokenPriceInEth();
        const minPurchase = await saleContract.minPurchaseAmount();
        const maxPurchase = await saleContract.maxPurchaseAmount();
        const owner = await saleContract.owner();

        console.log("📊 Sale Contract Information:");
        console.log(`   Sale Token: ${saleTokenAddress}`);
        console.log(
            `   Token Price: ${hre.ethers.formatEther(priceInEth)} ETH`
        );
        console.log(
            `   Min Purchase: ${hre.ethers.formatEther(minPurchase)} ETH`
        );
        console.log(
            `   Max Purchase: ${hre.ethers.formatEther(maxPurchase)} ETH`
        );
        console.log(`   Owner: ${owner}`);
        console.log(`   Contract Paused: ${await saleContract.paused()}\n`);

        // Step 4: Fund the sale contract with tokens
        const fundAmount = hre.ethers.parseUnits(taskArgs.fund, tokenDecimals);
        console.log(
            `💰 Transferring ${taskArgs.fund} ${tokenSymbol} to sale contract...`
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

        const tx = await tokenContract.transfer(saleAddress, fundAmount);
        console.log(`   Transaction hash: ${tx.hash}`);
        await tx.wait();

        const saleBalance = await tokenContract.balanceOf(saleAddress);
        console.log(
            `✅ Transfer successful! Sale contract balance: ${hre.ethers.formatUnits(
                saleBalance,
                tokenDecimals
            )} ${tokenSymbol}\n`
        );

        // Step 5: Calculate example purchase scenarios
        console.log("💡 Example Purchase Scenarios:");
        const exampleAmounts = ["0.01", "0.1", "1", "10"];
        for (const ethAmount of exampleAmounts) {
            const eth = hre.ethers.parseEther(ethAmount);
            const tokens = await saleContract.calculateTokenAmount(eth);
            console.log(
                `   ${ethAmount} ETH → ${hre.ethers.formatUnits(
                    tokens,
                    tokenDecimals
                )} ${tokenSymbol}`
            );
        }
        console.log();

        // Step 6: Verify on Etherscan if on Sepolia testnet
        if (
            hre.network.config.chainId === 11155111 &&
            process.env.ETHERSCAN_KEY
        ) {
            console.log(
                "⏳ Waiting for block confirmations before verification..."
            );
            await saleContract.deploymentTransaction().wait(5);

            console.log("🔍 Verifying GogogaTokenSale on Etherscan...");
            await etherscanVerify(saleAddress, [tokenAddress, tokenPrice], hre);
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

        // Step 7: Print deployment summary
        console.log("\n" + "=".repeat(70));
        console.log("🎉 Deployment Summary");
        console.log("=".repeat(70));
        console.log(`Network:              ${hre.network.name}`);
        console.log(`Deployer:             ${deployer.address}`);
        console.log(`Token Contract:       ${tokenAddress}`);
        console.log(`Sale Contract:        ${saleAddress}`);
        console.log(`Token:                ${tokenName} (${tokenSymbol})`);
        console.log(
            `Price:                ${taskArgs.price} ETH per ${tokenSymbol}`
        );
        console.log(
            `Min Purchase:         ${hre.ethers.formatEther(minPurchase)} ETH`
        );
        console.log(
            `Max Purchase:         ${hre.ethers.formatEther(maxPurchase)} ETH`
        );
        console.log(
            `Sale Contract Tokens: ${hre.ethers.formatUnits(
                saleBalance,
                tokenDecimals
            )} ${tokenSymbol}`
        );
        console.log("\n✨ Deployment completed successfully!\n");

        console.log("📝 Next Steps:");
        console.log("   1. Users can now buy tokens from the sale contract");
        console.log(`   2. Token Sale URL: ${saleAddress}`);
        console.log(`   3. Ensure the sale contract is not paused`);
        console.log();

        // Return contracts for potential further use
        return {
            token: tokenContract,
            sale: saleContract,
            tokenAddress: tokenAddress,
            saleAddress: saleAddress,
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
