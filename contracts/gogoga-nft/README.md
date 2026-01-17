# Gogoga NFT - ERC721 智能合约项目

一个功能完善、符合最佳实践的 ERC721 NFT 智能合约项目，适用于作品集展示。

## 🌟 项目特点

### 核心功能

-   ✅ **标准 ERC721 实现** - 基于 OpenZeppelin v5.4.0
-   ✅ **公开铸造** - 支持公开销售
-   ✅ **批量铸造** - 管理员可批量空投
-   ✅ **可暂停** - 紧急情况下可暂停合约
-   ✅ **可销毁** - 持有者可销毁自己的 NFT
-   ✅ **版税支持 (EIP-2981)** - 二级市场版税标准
-   ✅ **元数据管理** - 灵活的 URI 管理
-   ✅ **ReentrancyGuard** - 防止重入攻击

### 安全特性

-   🔒 自定义错误（节省 Gas）
-   🔒 完整的访问控制
-   🔒 防重入保护
-   🔒 全面的单元测试覆盖

## 📋 技术栈

-   **Solidity**: ^0.8.20
-   **Framework**: Hardhat
-   **Libraries**: OpenZeppelin Contracts v5.4.0
-   **Testing**: Chai + Ethers.js v6
-   **Network**: 兼容 EVM 链（Ethereum、Polygon、BSC 等）

## 🚀 快速开始

### 前置要求

```bash
Node.js >= 18.0.0
npm >= 9.0.0
```

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
# 运行所有测试
npx hardhat test

# 运行特定测试
npx hardhat test test/gogoga-nft.test.js

# 查看测试覆盖率
npx hardhat coverage
```

### 部署合约

#### 本地部署（用于开发）

```bash
# 启动本地节点
npx hardhat node

# 在另一个终端部署
npx hardhat deploy-gogoga-nft --network localhost
```

#### 测试网部署

首先配置 `.env` 文件：

```env
PRIVATE_KEY=你的私钥
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-api-key
ETHERSCAN_API_KEY=你的Etherscan API密钥
```

然后部署：

```bash
# 部署到 Sepolia 测试网
npx hardhat deploy-gogoga-nft --network sepolia
```

#### 验证合约

```bash
npx hardhat deploy-gogoga-nft --network sepolia <合约地址> \
  "Gogoga NFT" \
  "GGNFT" \
  10000 \
  "80000000000000000" \
  "https://api.gogoga.com/metadata/"
```

## 📖 合约详解

### 构造函数参数

```solidity
constructor(
    string memory name,              // NFT 名称
    string memory symbol,            // NFT 符号
    uint256 _maxSupply,             // 最大供应量
    uint256 _mintPrice,             // 铸造价格（wei）
    string memory baseURI           // 基础 URI
)
```

### 主要函数

#### 铸造函数

```solidity
// 公开铸造
function mint() external payable

// 批量铸造（仅管理员）
function batchMint(address to, uint256 quantity) external onlyOwner
```

#### 管理函数

```solidity
// 设置铸造价格
function setMintPrice(uint256 newPrice) external onlyOwner

// 设置基础 URI
function setBaseURI(string memory baseURI) external onlyOwner

// 设置合约 URI（用于 OpenSea 等市场）
function setContractURI(string memory _contractURI) external onlyOwner

// 设置版税信息（基于 10000，例如 500 = 5%）
function setRoyaltyInfo(address receiver, uint96 feeNumerator) external onlyOwner

// 暂停/恢复合约
function pause() external onlyOwner
function unpause() external onlyOwner

// 提取合约余额
function withdraw() external onlyOwner
```

#### 查询函数

```solidity
// 获取总供应量
function totalSupply() external view returns (uint256)

// 获取剩余可铸造数量
function remainingSupply() external view returns (uint256)

// 版税信息（EIP-2981）
function royaltyInfo(uint256 tokenId, uint256 salePrice)
    external view returns (address receiver, uint256 royaltyAmount)
```

## 🧪 测试用例

测试覆盖以下场景：

1. **部署测试** - 验证初始化参数
2. **公开铸造** - 铸造流程、支付验证、供应量检查
3. **批量铸造** - 批量操作、权限检查
4. **URI 管理** - 基础 URI、单独 URI、合约 URI
5. **暂停功能** - 暂停/恢复操作
6. **销毁功能** - NFT 销毁测试
7. **版税功能** - EIP-2981 标准测试
8. **管理功能** - 各种管理操作
9. **提取功能** - 资金提取测试

运行测试：

```bash
npx hardhat test
```

预期输出：

```
  GogogaNFT
    Deployment
      ✓ Should set the correct name and symbol
      ✓ Should set the correct max supply
      ...
    Public Minting
      ✓ Should not allow public minting when disabled
      ✓ Should allow public minting when enabled
      ...

  58 passing (2s)
```

## 🔧 配置说明

### Hardhat 配置

在 `hardhat.config.js` 中添加网络配置：

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
};
```

## 📊 Gas 优化

本合约采用多种 Gas 优化技术：

1. **自定义错误** - 替代 `require` 字符串，节省约 20% Gas
2. **批量操作** - 支持批量铸造
3. **紧凑存储** - 优化状态变量布局
4. **事件索引** - 合理使用 `indexed` 参数

## 🔐 安全考虑

-   ✅ 使用 OpenZeppelin 审计过的合约库
-   ✅ 实现 ReentrancyGuard 防止重入攻击
-   ✅ 使用 Ownable 进行访问控制
-   ✅ 支付安全：使用 `call` 而非 `transfer`
-   ✅ 输入验证：全面的参数检查
-   ✅ 整数安全：Solidity 0.8+ 内置溢出检查

## 📝 使用示例

### 与合约交互（ethers.js）

```javascript
const { ethers } = require("ethers");

// 连接到合约
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const nft = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

// 公开铸造
const mintPrice = await nft.mintPrice();
await nft.mint({ value: mintPrice });

// 查询 NFT
const tokenURI = await nft.tokenURI(tokenId);
const owner = await nft.ownerOf(tokenId);

// 管理员操作（需要 owner 权限）
await nft.setMintPrice(ethers.parseEther("0.1"));
await nft.pause(); // 暂停铸造
```

### 前端集成示例（React + wagmi）

```javascript
import { useContractWrite, useContractRead } from "wagmi";

// 读取合约数据
const { data: mintPrice } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "mintPrice",
});

// 铸造 NFT
const { write: mint } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "mint",
    value: mintPrice,
});
```

## 🎨 元数据规范

### Token URI 格式

```json
{
    "name": "Gogoga NFT #1",
    "description": "A unique Gogoga NFT",
    "image": "ipfs://QmX.../1.png",
    "attributes": [
        {
            "trait_type": "Background",
            "value": "Blue"
        },
        {
            "trait_type": "Rarity",
            "value": "Legendary"
        }
    ]
}
```

### Contract URI 格式

```json
{
    "name": "Gogoga NFT Collection",
    "description": "An amazing NFT collection",
    "image": "ipfs://QmX.../collection.png",
    "external_link": "https://gogoga.com",
    "seller_fee_basis_points": 500,
    "fee_recipient": "0x..."
}
```

## 🌐 支持的平台

本合约兼容以下 NFT 市场：

-   OpenSea
-   Rarible
-   LooksRare
-   X2Y2
-   等支持 ERC721 标准的平台

## 📜 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

-   GitHub: [@YourUsername](https://github.com/YourUsername)
-   Twitter: [@YourTwitter](https://twitter.com/YourTwitter)
-   Email: your.email@example.com

## 🎯 路线图

-   [x] 基础 ERC721 实现
-   [x] 版税支持
-   [x] 批量操作
-   [ ] 前端 DApp
-   [ ] IPFS 集成
-   [ ] 生成式艺术集成
-   [ ] 多链部署

## 📚 参考资源

-   [ERC721 标准](https://eips.ethereum.org/EIPS/eip-721)
-   [EIP-2981 版税标准](https://eips.ethereum.org/EIPS/eip-2981)
-   [OpenZeppelin 文档](https://docs.openzeppelin.com/)
-   [Hardhat 文档](https://hardhat.org/docs)

---

⭐ 如果这个项目对你有帮助，请给个 Star！
