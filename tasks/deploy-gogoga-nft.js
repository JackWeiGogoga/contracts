const { task } = require("hardhat/config");

task("deploy-gogoga-nft", "Deploys the GogogaNFT contract")
    .addOptionalParam("name", "NFT collection name", "Gogoga NFT")
    .addOptionalParam("symbol", "NFT collection symbol", "GogogaNFT")
    .addOptionalParam("maxsupply", "Maximum supply of NFTs", "50")
    .addOptionalParam("presetprice", "Preset NFT mint price in ETH", "0.01")
    .addOptionalParam("customprice", "Custom NFT mint price in ETH", "0.02")
    .addOptionalParam(
        "presetbaseuri",
        "Base URI for preset token metadata",
        "https://api.gogoga.com/metadata/"
    )
    .setAction(async (taskArgs, hre) => {
        // Validate parameter values
        if (parseInt(taskArgs.maxsupply) <= 4) {
            throw new Error(
                "❌ Max supply must be greater than 4 (PRESET_MAX_SUPPLY)"
            );
        }
        if (parseFloat(taskArgs.presetprice) < 0) {
            throw new Error(
                "❌ Preset price must be greater than or equal to 0"
            );
        }
        if (parseFloat(taskArgs.customprice) < 0) {
            throw new Error(
                "❌ Custom price must be greater than or equal to 0"
            );
        }

        console.log("\n� Starting GogogaNFT deployment...\n");
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

        // Parse parameters
        const name = taskArgs.name;
        const symbol = taskArgs.symbol;
        const maxSupply = parseInt(taskArgs.maxsupply);
        const presetMintPrice = hre.ethers.parseEther(taskArgs.presetprice);
        const customMintPrice = hre.ethers.parseEther(taskArgs.customprice);
        const presetBaseURI = taskArgs.presetbaseuri;

        // Step 1: Deploy GogogaNFT
        console.log("📦 Deploying GogogaNFT (Hybrid Mode) contract...");
        console.log("⚙️  Constructor Parameters:");
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Max Supply: ${maxSupply}`);
        console.log(`   Preset Mint Price: ${taskArgs.presetprice} ETH`);
        console.log(`   Custom Mint Price: ${taskArgs.customprice} ETH`);
        console.log(`   Preset Base URI: ${presetBaseURI}`);

        const nftFactory = await hre.ethers.getContractFactory("GogogaNFT");
        const nftContract = await nftFactory.deploy(
            name,
            symbol,
            maxSupply,
            presetMintPrice,
            customMintPrice,
            presetBaseURI
        );
        await nftContract.waitForDeployment();

        const nftAddress = nftContract.target;
        console.log(`✅ GogogaNFT deployed successfully!`);
        console.log(`📍 Contract address: ${nftAddress}\n`);

        // Step 2: Get NFT contract information
        const owner = await nftContract.owner();
        const totalSupply = await nftContract.totalSupply();
        const presetSupply = await nftContract.presetSupply();
        const customSupply = await nftContract.customSupply();
        const remainingPresetSupply = await nftContract.remainingPresetSupply();
        const remainingCustomSupply = await nftContract.remainingCustomSupply();
        const contractMaxSupply = await nftContract.maxSupply();
        const contractPresetMintPrice = await nftContract.presetMintPrice();
        const contractCustomMintPrice = await nftContract.customMintPrice();
        const presetMaxSupply = await nftContract.PRESET_MAX_SUPPLY();
        const customStartId = await nftContract.CUSTOM_START_ID();
        const paused = await nftContract.paused();

        console.log("📊 NFT Contract Information:");
        console.log(`   Name: ${await nftContract.name()}`);
        console.log(`   Symbol: ${await nftContract.symbol()}`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Contract Paused: ${paused}`);
        console.log("\n📈 Supply Information:");
        console.log(`   Total Max Supply: ${contractMaxSupply}`);
        console.log(
            `   Preset Max Supply: ${presetMaxSupply} (tokenId: 0-${
                Number(presetMaxSupply) - 1
            })`
        );
        console.log(
            `   Custom Max Supply: ${
                Number(contractMaxSupply) - Number(presetMaxSupply)
            } (tokenId: ${customStartId}+)`
        );
        console.log(`   Current Total Supply: ${totalSupply}`);
        console.log(`   Current Preset Supply: ${presetSupply}`);
        console.log(`   Current Custom Supply: ${customSupply}`);
        console.log(`   Remaining Preset Supply: ${remainingPresetSupply}`);
        console.log(`   Remaining Custom Supply: ${remainingCustomSupply}`);
        console.log("\n💰 Pricing:");
        console.log(
            `   Preset Mint Price: ${hre.ethers.formatEther(
                contractPresetMintPrice
            )} ETH`
        );
        console.log(
            `   Custom Mint Price: ${hre.ethers.formatEther(
                contractCustomMintPrice
            )} ETH\n`
        );

        // Step 3: Verify on Etherscan if on Sepolia testnet
        if (
            hre.network.config.chainId === 11155111 &&
            process.env.ETHERSCAN_KEY
        ) {
            console.log(
                "⏳ Waiting for block confirmations before verification..."
            );
            await nftContract.deploymentTransaction().wait(5);

            console.log("🔍 Verifying GogogaNFT on Etherscan...");
            await etherscanVerify(
                nftAddress,
                [
                    name,
                    symbol,
                    maxSupply,
                    presetMintPrice,
                    customMintPrice,
                    presetBaseURI,
                ],
                hre
            );
        } else {
            console.log("⏭️  Skipping contract verification.");
            if (
                hre.network.config.chainId === 11155111 &&
                !process.env.ETHERSCAN_KEY
            ) {
                console.log(
                    "� Tip: Set ETHERSCAN_KEY in .env to enable verification"
                );
            }
        }

        // Step 4: Print deployment summary
        console.log("\n" + "=".repeat(70));
        console.log("🎉 Deployment Summary");
        console.log("=".repeat(70));
        console.log(`Network:              ${hre.network.name}`);
        console.log(`Deployer:             ${deployer.address}`);
        console.log(`NFT Contract:         ${nftAddress}`);
        console.log(`Collection Name:      ${name} (${symbol})`);
        console.log(`Mode:                 Hybrid (Preset + Custom)`);
        console.log(`Total Max Supply:     ${contractMaxSupply} NFTs`);
        console.log(
            `  - Preset:           ${presetMaxSupply} (tokenId: 0-${
                Number(presetMaxSupply) - 1
            })`
        );
        console.log(
            `  - Custom:           ${
                Number(contractMaxSupply) - Number(presetMaxSupply)
            } (tokenId: ${customStartId}+)`
        );
        console.log(
            `Preset Mint Price:    ${hre.ethers.formatEther(
                contractPresetMintPrice
            )} ETH`
        );
        console.log(
            `Custom Mint Price:    ${hre.ethers.formatEther(
                contractCustomMintPrice
            )} ETH`
        );
        console.log(`Preset Base URI:      ${presetBaseURI}`);
        console.log("\n✨ Deployment completed successfully!\n");

        console.log("📝 Next Steps:");
        console.log(
            "   1. Users can mint preset NFTs: mintPreset() with preset price"
        );
        console.log(
            "   2. Users can mint custom NFTs: mintCustom(customURI) with custom price"
        );
        console.log(
            "   3. Update preset base URI if needed: setPresetBaseURI(string)"
        );
        console.log(
            "   4. Update custom token URI if needed: updateCustomTokenURI(tokenId, newURI)"
        );
        console.log(
            "   5. Batch mint preset NFTs: batchMintPreset(address, quantity)"
        );
        console.log(
            "   6. Update prices: setPresetMintPrice(newPrice) / setCustomMintPrice(newPrice)"
        );
        console.log("   7. Pause/unpause contract: pause() / unpause()");
        console.log();

        // Return contract for potential further use
        return {
            nft: nftContract,
            nftAddress: nftAddress,
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
