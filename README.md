# Smart Contracts Practice

这是一个使用 Hardhat v2 框架的智能合约练习项目，包含众筹、ERC20 生态、NFT 和投票等示例，用于学习和实践 Solidity 开发。

## 技术栈

-   **框架**: Hardhat v2.27+
-   **语言**: Solidity ^0.8.28
-   **工具链**: @nomicfoundation/hardhat-toolbox
-   **依赖**: OpenZeppelin Contracts v5.4+
-   **辅助**: dotenv / axios / merkletreejs（IPFS 上传与空投白名单）

## 项目结构

```
contracts/
├── contracts/
│   ├── crowdfunding/      # 众筹合约 + Factory
│   ├── gogoga-token/      # ERC20 生态（Token/Sale/Airdrop/Faucet）
│   ├── gogoga-nft/        # ERC721 NFT 合约
│   └── voting/            # 投票合约
├── tasks/                 # Hardhat 部署/验证任务
├── scripts/               # 辅助脚本（IPFS/merkle tree）
├── test/                  # Hardhat 测试
├── docs/                  # 文档与指南
└── nft-assets/            # NFT 示例素材
```

## 合约列表

### 1. [Crowdfunding - 众筹合约](./contracts/crowdfunding/)

一个功能完整的众筹合约系统，支持档位资助和自定义金额资助，包含完善的状态管理和退款机制。

> 📖 [查看详细文档](./contracts/crowdfunding/README.md)

### 2. [GogogaToken - ERC20 生态](./contracts/gogoga-token/)

包含 ERC20 Token、固定价格代币售卖、Merkle 空投、Faucet 等合约。

> 📖 [查看详细文档](./contracts/gogoga-token/README.md)

### 3. [Gogoga NFT - ERC721 合约](./contracts/gogoga-nft/)

带有公开铸造、批量空投、EIP-2981 版税和可暂停功能的 NFT 合约。

> 📖 [查看详细文档](./contracts/gogoga-nft/README.md)

### 4. [Voting - 投票合约](./contracts/voting/Voting.sol)

支持候选人/投票人注册、投票时段控制与暂停机制的基础投票系统。

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npx hardhat compile
```

### 运行测试

```bash
npx hardhat test
```

### 部署合约

```bash
npx hardhat deploy-crowdfunding --network <network-name>
npx hardhat deploy-gogoga-token --network <network-name>
npx hardhat deploy-gogoga-token-sale --network <network-name>
npx hardhat deploy-gogoga-token-airdrop --network <network-name>
npx hardhat deploy-gogoga-token-faucet --network <network-name>
npx hardhat deploy-gogoga-nft --network <network-name>
npx hardhat deploy-voting --network <network-name>
```

### 验证合约

```bash
npx hardhat verify-contract --address <contract-address> --network <network-name>
```

### 脚本与文档

-   IPFS 上传与网关配置: `docs/IPFS_UPLOAD_GUIDE.md`
-   生成 Merkle Tree: `scripts/generate-merkle-tree.js`
-   上传文件到 IPFS: `scripts/upload-to-ipfs.js`

## 环境变量

在 `.env` 中配置以下变量以支持测试网部署与验证：

```
INKR_URL=<sepolia-rpc-url>
PRIVATE_KEY=<deployer-private-key>
ETHERSCAN_KEY=<etherscan-api-key>
```

## License

MIT
