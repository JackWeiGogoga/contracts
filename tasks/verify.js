const { task } = require("hardhat/config");

/**
 * Hardhat task to verify a deployed contract on Etherscan
 * Usage: npx hardhat verify-contract --address <CONTRACT_ADDRESS> [--args <ARGS>] [--contract <CONTRACT_NAME>]
 *
 * Examples:
 * 1. Verify CrowdfundingFactory (no constructor args):
 *    npx hardhat verify-contract --address 0x123... --network sepolia
 *
 * 2. Verify Crowdfunding with constructor args:
 *    npx hardhat verify-contract --address 0x456... --args '["0xOwnerAddress","Campaign Name","Description","ipfs://icon",1000000000000000000,30,10000000000000000]' --network sepolia
 *
 * 3. Verify specific contract:
 *    npx hardhat verify-contract --address 0x789... --contract contracts/crowdfunding/Crowdfunding.sol:Crowdfunding --network sepolia
 */
task("verify-contract", "Verifies a deployed contract on Etherscan")
    .addParam("address", "The deployed contract address")
    .addOptionalParam(
        "args",
        "Constructor arguments as JSON array string",
        "[]"
    )
    .addOptionalParam(
        "contract",
        "Fully qualified contract name (e.g., contracts/Crowdfunding.sol:Crowdfunding)"
    )
    .setAction(async (taskArgs, hre) => {
        const { address, args, contract } = taskArgs;

        // 验证是否配置了 Etherscan API Key
        if (!process.env.ETHERSCAN_KEY) {
            console.error(
                "❌ Error: ETHERSCAN_KEY not found in environment variables"
            );
            console.log("Please set ETHERSCAN_KEY in your .env file");
            return;
        }

        // 解析构造函数参数
        let constructorArguments;
        try {
            constructorArguments = JSON.parse(args);
        } catch (error) {
            console.error(
                "❌ Error: Invalid JSON format for constructor arguments"
            );
            console.log('Example: --args \'["arg1",123,"arg3"]\'');
            return;
        }

        console.log("\n📝 Starting contract verification...");
        console.log("═══════════════════════════════════════");
        console.log(`Network:           ${hre.network.name}`);
        console.log(`Chain ID:          ${hre.network.config.chainId}`);
        console.log(`Contract Address:  ${address}`);
        if (contract) {
            console.log(`Contract:          ${contract}`);
        }
        if (constructorArguments.length > 0) {
            console.log(
                `Constructor Args:  ${JSON.stringify(
                    constructorArguments,
                    null,
                    2
                )}`
            );
        }
        console.log("═══════════════════════════════════════\n");

        try {
            // 等待几秒钟确保合约已在区块链上确认
            console.log("⏳ Waiting for contract to be indexed...");
            await new Promise((resolve) => setTimeout(resolve, 3000));

            const verifyParams = {
                address: address,
                constructorArguments: constructorArguments,
            };

            // 如果指定了合约名称，添加到参数中
            if (contract) {
                verifyParams.contract = contract;
            }

            await hre.run("verify:verify", verifyParams);

            console.log("\n✅ Contract verified successfully!");
            console.log(
                `🔗 View on Etherscan: ${getEtherscanUrl(
                    hre.network.config.chainId,
                    address
                )}`
            );
        } catch (error) {
            if (error.message.includes("Already Verified")) {
                console.log("\n✅ Contract is already verified!");
                console.log(
                    `🔗 View on Etherscan: ${getEtherscanUrl(
                        hre.network.config.chainId,
                        address
                    )}`
                );
            } else {
                console.error("\n❌ Verification failed:");
                console.error(error.message);

                // 提供有用的错误提示
                if (error.message.includes("constructor arguments")) {
                    console.log(
                        "\n💡 Tip: Make sure constructor arguments are correct"
                    );
                    console.log(
                        'Example: --args \'["0x...","name","desc","icon",1000,30,100]\''
                    );
                } else if (error.message.includes("does not have bytecode")) {
                    console.log(
                        "\n💡 Tip: Make sure the contract is deployed at the specified address"
                    );
                }
            }
        }
    });

/**
 * Get Etherscan URL based on chain ID
 */
function getEtherscanUrl(chainId, address) {
    const explorers = {
        1: "https://etherscan.io",
        11155111: "https://sepolia.etherscan.io",
        5: "https://goerli.etherscan.io",
        137: "https://polygonscan.com",
        80001: "https://mumbai.polygonscan.com",
    };

    const baseUrl = explorers[chainId] || "https://etherscan.io";
    return `${baseUrl}/address/${address}#code`;
}

/**
 * Task to verify CrowdfundingFactory contract
 * Usage: npx hardhat verify-factory --address <CONTRACT_ADDRESS> --network sepolia
 */
task(
    "verify-factory",
    "Verifies a CrowdfundingFactory contract (no constructor args)"
)
    .addParam("address", "The deployed CrowdfundingFactory contract address")
    .setAction(async (taskArgs, hre) => {
        console.log("\n🏭 Verifying CrowdfundingFactory contract...\n");

        await hre.run("verify-contract", {
            address: taskArgs.address,
            args: "[]",
            contract:
                "contracts/crowdfunding/CrowdfundingFactory.sol:CrowdfundingFactory",
        });
    });

/**
 * Task to verify Crowdfunding campaign contract
 * Usage: npx hardhat verify-campaign --address <CONTRACT_ADDRESS> --owner <OWNER> --name <NAME> --description <DESC> --icon <ICON> --goal <GOAL> --duration <DAYS> --min <MIN> --network sepolia
 */
task("verify-campaign", "Verifies a Crowdfunding campaign contract")
    .addParam("address", "The deployed Crowdfunding contract address")
    .addParam("owner", "Campaign owner address")
    .addParam("name", "Campaign name")
    .addParam("description", "Campaign description")
    .addParam("icon", "Campaign icon (IPFS hash or URL)")
    .addParam(
        "goal",
        "Funding goal in wei (e.g., 1000000000000000000 for 1 ETH)"
    )
    .addParam("duration", "Duration in days")
    .addParam("min", "Minimum contribution in wei")
    .setAction(async (taskArgs, hre) => {
        const { address, owner, name, description, icon, goal, duration, min } =
            taskArgs;

        console.log("\n📢 Verifying Crowdfunding campaign contract...\n");

        const constructorArgs = [
            owner,
            name,
            description,
            icon,
            goal,
            duration,
            min,
        ];

        await hre.run("verify-contract", {
            address: address,
            args: JSON.stringify(constructorArgs),
            contract: "contracts/crowdfunding/Crowdfunding.sol:Crowdfunding",
        });
    });

task(
    "verify-gogoga-token",
    "Verifies a GogogaToken contract (no constructor args)"
)
    .addParam("address", "The deployed GogogaToken contract address")
    .setAction(async (taskArgs, hre) => {
        console.log("\n🏭 Verifying GogogaToken contract...\n");

        await hre.run("verify-contract", {
            address: taskArgs.address,
            args: "[]",
            contract: "contracts/gogoga-token/GogogaToken.sol:GogogaToken",
        });
    });

module.exports = {};
