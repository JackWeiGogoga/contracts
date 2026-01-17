const { task } = require("hardhat/config");

task("deploy-crowdfunding", "Deploys the contract").setAction(
    async (taskArgs, hre) => {
        const crowdfundingFactoryFactory = await hre.ethers.getContractFactory(
            "CrowdfundingFactory"
        );
        console.log("contract deploying...");
        const contract = await crowdfundingFactoryFactory.deploy();
        await contract.waitForDeployment();
        console.log(
            `contract has been deployed successfully, contract address is ${contract.target}`
        );

        if (
            hre.network.config.chainId === 11155111 &&
            process.env.ETHERSCAN_KEY
        ) {
            console.log("verifying contract...");
            await contract.deploymentTransaction().wait(5);
            await etherscanVerify(contract.target);
        } else {
            console.log("skipping contract verification.");
        }
    }
);

async function etherscanVerify(txHash) {
    await hre.run("verify:verify", {
        address: txHash,
        constructorArguments: [],
    });
    console.log("contract has been verified successfully!");
}

module.exports = {};
