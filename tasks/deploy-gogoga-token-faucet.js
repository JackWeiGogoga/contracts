const { task } = require("hardhat/config");

task("deploy-gogoga-token-faucet", "Deploys the GogogaTokenFaucet contract")
    .addParam("token", "Address of the token to distribute")
    .addParam(
        "amount",
        "Amount of tokens per request (e.g., 100 = 100 tokens per request)"
    )
    .addParam("cooldown", "Cooldown time in seconds (e.g., 86400 = 24 hours)")
    .addParam(
        "fund",
        "Amount of tokens to transfer to faucet contract (e.g., 10000)"
    )
    .addOptionalParam(
        "maxclaim",
        "Maximum total tokens per address (0 = no limit)",
        "0"
    )
    .setAction(async (taskArgs, hre) => {
        // Validate required parameters
        if (!taskArgs.token) {
            throw new Error("❌ Missing required parameter: --token");
        }
        if (!taskArgs.amount) {
            throw new Error("❌ Missing required parameter: --amount");
        }
        if (!taskArgs.cooldown) {
            throw new Error("❌ Missing required parameter: --cooldown");
        }
        if (!taskArgs.fund) {
            throw new Error("❌ Missing required parameter: --fund");
        }

        // Validate parameter values
        if (parseFloat(taskArgs.amount) <= 0) {
            throw new Error("❌ Request amount must be greater than 0");
        }
        if (parseFloat(taskArgs.cooldown) <= 0) {
            throw new Error("❌ Cooldown time must be greater than 0");
        }
        if (parseFloat(taskArgs.fund) <= 0) {
            throw new Error("❌ Fund amount must be greater than 0");
        }

        console.log("\n🚀 Starting GogogaTokenFaucet deployment...\n");
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

        // Step 2: Deploy GogogaTokenFaucet
        const requestAmount = hre.ethers.parseUnits(
            taskArgs.amount,
            tokenDecimals
        );
        const cooldownTime = parseInt(taskArgs.cooldown);

        console.log("📦 Deploying GogogaTokenFaucet contract...");
        console.log("⚙️  Constructor Parameters:");
        console.log(`   Token Address: ${tokenAddress}`);
        console.log(`   Request Amount: ${taskArgs.amount} ${tokenSymbol}`);
        console.log(
            `   Cooldown Time: ${cooldownTime} seconds (${formatDuration(
                cooldownTime
            )})`
        );

        const faucetFactory = await hre.ethers.getContractFactory(
            "GogogaTokenFaucet"
        );
        const faucetContract = await faucetFactory.deploy(
            tokenAddress,
            requestAmount,
            cooldownTime
        );
        await faucetContract.waitForDeployment();

        const faucetAddress = faucetContract.target;
        console.log(`✅ GogogaTokenFaucet deployed successfully!`);
        console.log(`📍 Contract address: ${faucetAddress}\n`);

        // Step 3: Get faucet contract information
        const faucetTokenAddress = await faucetContract.faucetToken();
        const amountPerRequest = await faucetContract.requestAmount();
        const cooldown = await faucetContract.cooldownTime();
        const maxClaimPerAddress = await faucetContract.maxClaimPerAddress();
        const owner = await faucetContract.owner();

        console.log("📊 Faucet Contract Information:");
        console.log(`   Faucet Token: ${faucetTokenAddress}`);
        console.log(
            `   Amount Per Request: ${hre.ethers.formatUnits(
                amountPerRequest,
                tokenDecimals
            )} ${tokenSymbol}`
        );
        console.log(
            `   Cooldown Time: ${cooldown} seconds (${formatDuration(
                Number(cooldown)
            )})`
        );
        console.log(
            `   Max Claim Per Address: ${
                maxClaimPerAddress === 0n
                    ? "Unlimited"
                    : hre.ethers.formatUnits(
                          maxClaimPerAddress,
                          tokenDecimals
                      ) +
                      " " +
                      tokenSymbol
            }`
        );
        console.log(`   Owner: ${owner}`);
        console.log(`   Contract Paused: ${await faucetContract.paused()}\n`);

        // Step 4: Set max claim per address if specified
        if (taskArgs.maxclaim && taskArgs.maxclaim !== "0") {
            const maxClaim = hre.ethers.parseUnits(
                taskArgs.maxclaim,
                tokenDecimals
            );
            console.log(
                `⚙️  Setting max claim per address to ${taskArgs.maxclaim} ${tokenSymbol}...`
            );
            const setMaxTx = await faucetContract.setMaxClaimPerAddress(
                maxClaim
            );
            console.log(`   Transaction hash: ${setMaxTx.hash}`);
            await setMaxTx.wait();
            console.log(`✅ Max claim per address set successfully!\n`);
        }

        // Step 5: Fund the faucet contract with tokens
        const fundAmount = hre.ethers.parseUnits(taskArgs.fund, tokenDecimals);
        console.log(
            `💰 Transferring ${taskArgs.fund} ${tokenSymbol} to faucet contract...`
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

        const tx = await tokenContract.transfer(faucetAddress, fundAmount);
        console.log(`   Transaction hash: ${tx.hash}`);
        await tx.wait();

        const faucetBalance = await tokenContract.balanceOf(faucetAddress);
        console.log(
            `✅ Transfer successful! Faucet contract balance: ${hre.ethers.formatUnits(
                faucetBalance,
                tokenDecimals
            )} ${tokenSymbol}\n`
        );

        // Step 6: Calculate faucet capacity
        console.log("💡 Faucet Capacity Analysis:");
        const maxRequests = faucetBalance / amountPerRequest;
        console.log(
            `   Total requests available: ${maxRequests.toLocaleString()}`
        );
        console.log(
            `   Tokens per request: ${hre.ethers.formatUnits(
                amountPerRequest,
                tokenDecimals
            )} ${tokenSymbol}`
        );
        console.log(`   Cooldown period: ${formatDuration(Number(cooldown))}`);

        // Calculate daily capacity
        const requestsPerDay = (24 * 60 * 60) / Number(cooldown);
        const amountPerRequestFormatted = Number(
            hre.ethers.formatUnits(amountPerRequest, tokenDecimals)
        );
        const tokensPerUserPerDay = requestsPerDay * amountPerRequestFormatted;
        console.log(
            `   Max requests per user per day: ${requestsPerDay.toFixed(2)}`
        );
        console.log(
            `   Max tokens per user per day: ${tokensPerUserPerDay.toFixed(
                2
            )} ${tokenSymbol}`
        );

        // Calculate how many days the faucet will last for different user counts
        const userCounts = [10, 50, 100, 500];
        const faucetBalanceFormatted = Number(
            hre.ethers.formatUnits(faucetBalance, tokenDecimals)
        );
        console.log("\n   Estimated duration for different user counts:");
        for (const userCount of userCounts) {
            const tokensPerDay = tokensPerUserPerDay * userCount;
            const days = faucetBalanceFormatted / tokensPerDay;
            console.log(`      ${userCount} users: ~${days.toFixed(1)} days`);
        }
        console.log();

        // Step 7: Verify on Etherscan if on Sepolia testnet
        if (
            hre.network.config.chainId === 11155111 &&
            process.env.ETHERSCAN_KEY
        ) {
            console.log(
                "⏳ Waiting for block confirmations before verification..."
            );
            await faucetContract.deploymentTransaction().wait(5);

            console.log("🔍 Verifying GogogaTokenFaucet on Etherscan...");
            await etherscanVerify(
                faucetAddress,
                [tokenAddress, requestAmount, cooldownTime],
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

        // Step 8: Print deployment summary
        console.log("\n" + "=".repeat(70));
        console.log("🎉 Deployment Summary");
        console.log("=".repeat(70));
        console.log(`Network:              ${hre.network.name}`);
        console.log(`Deployer:             ${deployer.address}`);
        console.log(`Token Contract:       ${tokenAddress}`);
        console.log(`Faucet Contract:      ${faucetAddress}`);
        console.log(`Token:                ${tokenName} (${tokenSymbol})`);
        console.log(
            `Amount Per Request:   ${hre.ethers.formatUnits(
                amountPerRequest,
                tokenDecimals
            )} ${tokenSymbol}`
        );
        console.log(
            `Cooldown Time:        ${formatDuration(Number(cooldown))}`
        );
        console.log(
            `Max Claim Per User:   ${
                maxClaimPerAddress === 0n
                    ? "Unlimited"
                    : hre.ethers.formatUnits(
                          maxClaimPerAddress,
                          tokenDecimals
                      ) +
                      " " +
                      tokenSymbol
            }`
        );
        console.log(
            `Faucet Balance:       ${hre.ethers.formatUnits(
                faucetBalance,
                tokenDecimals
            )} ${tokenSymbol}`
        );
        console.log(`Total Requests:       ${maxRequests.toLocaleString()}`);
        console.log("\n✨ Deployment completed successfully!\n");

        console.log("📝 Next Steps:");
        console.log("   1. Users can now request tokens from the faucet");
        console.log(`   2. Faucet URL: ${faucetAddress}`);
        console.log(`   3. Ensure the faucet contract is not paused`);
        console.log(
            `   4. Monitor faucet balance and refill when needed using fundFaucet()`
        );
        console.log();

        // Return contracts for potential further use
        return {
            token: tokenContract,
            faucet: faucetContract,
            tokenAddress: tokenAddress,
            faucetAddress: faucetAddress,
        };
    });

/**
 * Format duration in seconds to human-readable format
 */
function formatDuration(seconds) {
    if (seconds < 60) {
        return `${seconds} seconds`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""}`;
    } else {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        if (hours > 0) {
            return `${days} day${days > 1 ? "s" : ""} ${hours} hour${
                hours > 1 ? "s" : ""
            }`;
        }
        return `${days} day${days > 1 ? "s" : ""}`;
    }
}

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
