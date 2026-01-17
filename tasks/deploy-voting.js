const { task } = require("hardhat/config");

task("deploy-voting", "Deploys the Voting contract")
    .addOptionalParam("owner", "The owner address (defaults to deployer)")
    .setAction(async (taskArgs, hre) => {
        console.log("\n🚀 Starting Voting contract deployment...\n");
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

        // Determine owner address
        const ownerAddress = taskArgs.owner || deployer.address;
        console.log("👤 Contract owner will be:", ownerAddress);

        // Validate owner address
        if (!hre.ethers.isAddress(ownerAddress)) {
            throw new Error(`Invalid owner address: ${ownerAddress}`);
        }

        // Deploy Voting contract
        const VotingFactory = await hre.ethers.getContractFactory("Voting");
        console.log("📦 Deploying Voting contract...");

        const contract = await VotingFactory.deploy(ownerAddress);
        await contract.waitForDeployment();

        const contractAddress = contract.target;
        console.log(`✅ Contract deployed successfully!`);
        console.log(`📍 Contract address: ${contractAddress}\n`);

        // Get contract information
        const owner = await contract.owner();
        const votingStatus = await contract.votingStatus();
        const candidateCount = await contract.candidateCount();
        const voterCount = await contract.getVoterCount();
        const isPaused = await contract.paused();

        const statusNames = ["NotStarted", "Active", "Ended"];

        console.log("📊 Contract Information:");
        console.log(`   Owner: ${owner}`);
        console.log(`   Status: ${statusNames[votingStatus]}`);
        console.log(`   Candidates: ${candidateCount}`);
        console.log(`   Registered Voters: ${voterCount}`);
        console.log(`   Paused: ${isPaused}\n`);

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
            await etherscanVerify(contractAddress, ownerAddress, hre);
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
        console.log(`Owner: ${owner}`);
        console.log(`Initial Status: ${statusNames[votingStatus]}`);
        console.log("=".repeat(60) + "\n");

        console.log("📝 Next Steps:");
        console.log("   1. Register candidates using registerCandidate()");
        console.log(
            "   2. Register voters using registerVoter() or registerVoterBatch()"
        );
        console.log("   3. Start voting using startVoting(durationInSeconds)");
        console.log("   4. Voters can cast votes using vote() or voteById()");
        console.log("   5. End voting using endVoting()\n");

        // Return contract for potential further use
        return contract;
    });

async function etherscanVerify(contractAddress, ownerAddress, hre) {
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: [ownerAddress],
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
