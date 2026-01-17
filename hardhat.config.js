require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("./tasks");

const { ETHERSCAN_KEY, INKR_URL, PRIVATE_KEY } = process.env;

module.exports = {
    solidity: {
        version: "0.8.28",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200, // 标准值：平衡部署成本和运行成本
            },
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        sepolia: {
            url: `${INKR_URL}`,
            accounts: [`0x${PRIVATE_KEY}`],
            chainId: 11155111,
        },
    },
    etherscan: {
        apiKey: `${ETHERSCAN_KEY}`,
    },
};
