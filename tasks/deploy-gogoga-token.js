const { task } = require("hardhat/config");

task("deploy-gogoga-token", "Deploys the GogogaToken contract").setAction(
    async (taskArgs, hre) => {
        console.log("\n🚀 Starting GogogaToken deployment...\n");
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

        // Deploy GogogaToken
        const gogogaTokenFactory = await hre.ethers.getContractFactory(
            "GogogaToken"
        );
        console.log("📦 Deploying GogogaToken contract...");

        const contract = await gogogaTokenFactory.deploy();
        await contract.waitForDeployment();

        const contractAddress = contract.target;
        console.log(`✅ Contract deployed successfully!`);
        console.log(`📍 Contract address: ${contractAddress}\n`);

        // Get token information
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const totalSupply = await contract.totalSupply();
        const maxSupply = await contract.MAX_SUPPLY();
        const owner = await contract.owner();

        console.log("📊 Token Information:");
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals}`);
        console.log(
            `   Total Supply: ${hre.ethers.formatEther(totalSupply)} ${symbol}`
        );
        console.log(
            `   Max Supply: ${hre.ethers.formatEther(maxSupply)} ${symbol}`
        );
        console.log(`   Owner: ${owner}\n`);

        // Verify on Etherscan if on Sepolia testnet
        if (
            hre.network.config.chainId === 11155111 &&
            process.env.ETHERSCAN_KEY
        ) {
            console.log(
                "⏳ Waiting for block confirmations before verification..."
            );
            await contract.deploymentTransaction().wait(5);
            console.log("🔍 Verifying contract on Etherscan...");
            await etherscanVerify(contractAddress, hre);
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

        console.log("\n" + "=".repeat(60));
        console.log("🎉 Deployment Summary");
        console.log("=".repeat(60));
        console.log(`Contract Address: ${contractAddress}`);
        console.log(`Network: ${hre.network.name}`);
        console.log(`Deployer: ${deployer.address}`);
        console.log(`Token: ${name} (${symbol})`);
        console.log(
            `Total Supply: ${hre.ethers.formatEther(totalSupply)} ${symbol}`
        );
        console.log("=".repeat(60) + "\n");

        // Return contract for potential further use
        return contract;
    }
);

async function etherscanVerify(contractAddress, hre) {
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [],
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
