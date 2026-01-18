# GogogaToken 生态系统 (GOGOGA)

一个完整且安全的 ERC20 代币生态，包含代币合约、售卖机制、空投系统和水龙头功能。

## 📋 生态概览

本项目提供完整的代币生态，包含四个核心组件：

### 🪙 **GogogaToken** - 主代币合约

- ✅ **ERC20 标准** - 完全符合 ERC20
- ✅ **可增发** - Owner 可向任意地址增发
- ✅ **可销毁** - 持有者可销毁自己的代币
- ✅ **可暂停** - Owner 可紧急暂停/恢复所有转账
- ✅ **可转移所有权** - 支持转移与放弃所有权
- ✅ **最大供应量** - 上限 10 亿，防止无限通胀
- ✅ **Gas 优化** - 基于 OpenZeppelin 审计合约

### 💰 **GogogaTokenSale** - 代币售卖合约

- ✅ **ETH 换币** - 按固定汇率购买 GOGOGA
- ✅ **可暂停售卖** - 紧急停止机制
- ✅ **ReentrancyGuard** - 防重入攻击
- ✅ **Pull Payment** - Owner 安全提取 ETH
- ✅ **购买限额** - 可配置最小/最大购买量
- ✅ **动态定价** - Owner 可更新价格
- ✅ **代币找回** - 误转 ERC20 可找回
- ✅ **完整事件** - 交易过程全量记录

### 🎁 **GogogaTokenAirdrop** - 空投合约

- ✅ **Merkle Tree 校验** - Gas 友好的白名单验证
- ✅ **一次性领取** - 每个地址仅可领取一次
- ✅ **时间窗口** - 可选空投开始/结束时间
- ✅ **可暂停领取** - 紧急停止机制
- ✅ **多轮空投** - 支持更新 Merkle Root
- ✅ **未领取回收** - 到期后可回收未领取代币
- ✅ **领取前校验** - 可查询资格再领取
- ✅ **ReentrancyGuard** - 防重入攻击

### 🚰 **GogogaTokenFaucet** - 水龙头合约

- ✅ **冷却时间** - 可配置等待周期防滥用
- ✅ **可配置数量** - 每次领取的代币数量可调
- ✅ **领取上限** - 可选每地址最大领取量
- ✅ **可暂停发放** - 紧急停止机制
- ✅ **资金管理** - Owner 便捷充值与提取
- ✅ **友好查询** - 可查看资格与剩余时间
- ✅ **ReentrancyGuard** - 防重入攻击
- ✅ **Gas 优化** - 使用自定义错误降低消耗

## 📊 代币信息

| 属性       | 数值                 |
| ---------- | -------------------- |
| 名称       | GogogaToken          |
| 符号       | GOGOGA               |
| 小数位     | 18                   |
| 初始供应量 | 1,000,000 GOGOGA     |
| 最大供应量 | 1,000,000,000 GOGOGA |

## 🚀 快速开始

### 前置要求

```bash
node >= 18.0.0
npm >= 9.0.0
```

### 安装依赖

```bash
# Install dependencies
npm install
```

### 编译合约

```bash
npm run compile
```

## 🧪 测试

### 运行全部测试

```bash
npm test
```

### 仅运行 Gogoga Token 测试

```bash
npm run test:gogoga
```

### 覆盖率

```bash
npm run test:coverage
```

### 期望的测试内容

测试套件包含 **60+ 用例**，覆盖：

- ✅ 部署场景
- ✅ 增发功能
- ✅ 销毁功能
- ✅ 暂停/恢复机制
- ✅ 转账操作
- ✅ 授权管理
- ✅ 所有权控制
- ✅ 边界场景
- ✅ Gas 使用基准

## 📦 部署

### 部署到本地网络

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy
npm run deploy:local
```

### 部署到 Sepolia 测试网

```bash
# Set up your .env file with:
# SEPOLIA_RPC_URL=your_rpc_url
# PRIVATE_KEY=your_private_key

npm run deploy:sepolia
```

### 部署到其他网络

```bash
npx hardhat run scripts/deploy-gogoga-token.js --network <network-name>
```

## 🔧 使用示例

### 🪙 Token 合约 (GogogaToken)

#### 增发代币

```javascript
// Mint 1,000 tokens to an address
await gogogaToken.mint(recipientAddress, ethers.parseEther("1000"));
```

### 销毁代币

```javascript
// Burn 100 of your own tokens
await gogogaToken.burn(ethers.parseEther("100"));

// Burn tokens from another address (requires approval)
await gogogaToken.burnFrom(address, ethers.parseEther("100"));
```

### 暂停转账

```javascript
// Pause all token transfers
await gogogaToken.pause();

// Unpause transfers
await gogogaToken.unpause();
```

### 标准 ERC20 操作

```javascript
// Transfer tokens
await gogogaToken.transfer(recipientAddress, ethers.parseEther("100"));

// Approve spender
await gogogaToken.approve(spenderAddress, ethers.parseEther("1000"));

// Transfer from (requires approval)
await gogogaToken.transferFrom(
  fromAddress,
  toAddress,
  ethers.parseEther("100")
);
```

#### 所有权管理

```javascript
// Transfer ownership
await gogogaToken.transferOwnership(newOwnerAddress);

// Renounce ownership (irreversible)
await gogogaToken.renounceOwnership();
```

---

### 💰 Token 售卖合约 (GogogaTokenSale)

#### 部署售卖合约

```javascript
const tokenAddress = "0x..."; // Your deployed GogogaToken address
const tokenPrice = ethers.parseEther("0.001"); // 1 token costs 0.001 ETH

const TokenSale = await ethers.getContractFactory("GogogaTokenSale");
const tokenSale = await TokenSale.deploy(tokenAddress, tokenPrice);

// Fund the sale contract with tokens
await gogogaToken.transfer(tokenSale.target, ethers.parseEther("1000000"));
```

#### 购买代币

```javascript
// Buy tokens with 1 ETH
await tokenSale.buyTokens({ value: ethers.parseEther("1") });

// Calculate how many tokens you'll get
const ethAmount = ethers.parseEther("1");
const tokenAmount = await tokenSale.calculateTokenAmount(ethAmount);
console.log(`You will receive ${ethers.formatEther(tokenAmount)} tokens`);
```

#### 售卖管理（仅 Owner）

```javascript
// Update token price
await tokenSale.updateTokenPrice(ethers.parseEther("0.002"));

// Update purchase limits
await tokenSale.updatePurchaseLimits(
  ethers.parseEther("0.01"), // min: 0.01 ETH
  ethers.parseEther("100") // max: 100 ETH
);

// Withdraw collected ETH
await tokenSale.withdrawEth();

// Withdraw remaining unsold tokens
await tokenSale.withdrawRemainingTokens();

// Pause/Unpause sales
await tokenSale.pause();
await tokenSale.unpause();
```

#### 查询售卖信息

```javascript
const info = await tokenSale.getContractInfo();
console.log("Token Address:", info.tokenAddress);
console.log("Price per Token:", ethers.formatEther(info.priceInEth), "ETH");
console.log("Total Sold:", ethers.formatEther(info.totalSold));
console.log("Total Raised:", ethers.formatEther(info.totalRaised), "ETH");
console.log("Available:", ethers.formatEther(info.contractTokenBalance));
```

---

### 🎁 空投合约 (GogogaTokenAirdrop)

#### 部署空投

```javascript
// Generate Merkle tree off-chain (using merkletreejs library)
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

// Airdrop data: address -> amount
const airdropList = [
  { address: "0xAddress1", amount: ethers.parseEther("100") },
  { address: "0xAddress2", amount: ethers.parseEther("200") },
  // ... more addresses
];

// Generate leaves and tree
const leaves = airdropList.map((x) =>
  keccak256(
    ethers.solidityPacked(["address", "uint256"], [x.address, x.amount])
  )
);
const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const merkleRoot = merkleTree.getHexRoot();

// Deploy contract
const tokenAddress = "0x..."; // Your GogogaToken address
const startTime = Math.floor(Date.now() / 1000); // Now
const endTime = startTime + 30 * 24 * 60 * 60; // 30 days later

const Airdrop = await ethers.getContractFactory("GogogaTokenAirdrop");
const airdrop = await Airdrop.deploy(
  tokenAddress,
  merkleRoot,
  startTime,
  endTime
);

// Fund the airdrop contract
await gogogaToken.transfer(airdrop.target, ethers.parseEther("10000"));
```

#### 领取空投

```javascript
// User claims their airdrop
const userAddress = "0xAddress1";
const amount = ethers.parseEther("100");

// Generate proof for this user
const leaf = keccak256(
  ethers.solidityPacked(["address", "uint256"], [userAddress, amount])
);
const proof = merkleTree.getHexProof(leaf);

// Claim tokens
await airdrop.claim(amount, proof);
```

#### 校验领取资格

```javascript
// Check if user can claim
const [canClaim, reason] = await airdrop.canClaim(userAddress, amount, proof);
console.log("Can claim:", canClaim);
if (!canClaim) console.log("Reason:", reason);

// Check claim status
const [hasClaimed, claimedAmount] = await airdrop.getClaimStatus(userAddress);
console.log("Has claimed:", hasClaimed);
console.log("Amount claimed:", ethers.formatEther(claimedAmount));
```

#### 空投管理（仅 Owner）

```javascript
// Update Merkle root for new round
await airdrop.updateMerkleRoot(newMerkleRoot);

// Update time window
await airdrop.updateTimeWindow(newStartTime, newEndTime);

// Withdraw unclaimed tokens after deadline
await airdrop.withdrawUnclaimedTokens();

// Pause/Unpause claiming
await airdrop.pause();
await airdrop.unpause();
```

---

### 🚰 水龙头合约 (GogogaTokenFaucet)

#### 部署水龙头

```javascript
const tokenAddress = "0x..."; // Your GogogaToken address
const requestAmount = ethers.parseEther("10"); // 10 tokens per request
const cooldownTime = 24 * 60 * 60; // 24 hours cooldown

const Faucet = await ethers.getContractFactory("GogogaTokenFaucet");
const faucet = await Faucet.deploy(tokenAddress, requestAmount, cooldownTime);

// Fund the faucet
await gogogaToken.transfer(faucet.target, ethers.parseEther("100000"));
```

#### 从水龙头领取代币

```javascript
// Request tokens
await faucet.requestTokens();

// Check if you can request
const canRequest = await faucet.canRequestTokens(userAddress);
console.log("Can request:", canRequest);

// Check time until next request
const timeRemaining = await faucet.getTimeUntilNextRequest(userAddress);
console.log("Wait time:", timeRemaining, "seconds");
```

#### 向水龙头充值（任何人）

```javascript
// Anyone can fund the faucet
const fundAmount = ethers.parseEther("1000");
await gogogaToken.approve(faucet.target, fundAmount);
await faucet.fundFaucet(fundAmount);
```

#### 水龙头管理（仅 Owner）

```javascript
// Update request amount
await faucet.setRequestAmount(ethers.parseEther("20"));

// Update cooldown time (12 hours)
await faucet.setCooldownTime(12 * 60 * 60);

// Set max claim limit per address (0 = no limit)
await faucet.setMaxClaimPerAddress(ethers.parseEther("1000"));

// Withdraw tokens
await faucet.withdrawTokens(ethers.parseEther("5000"));

// Pause/Unpause faucet
await faucet.pause();
await faucet.unpause();
```

#### 查询水龙头信息

```javascript
// Get faucet info
const faucetInfo = await faucet.getFaucetInfo();
console.log("Token Balance:", ethers.formatEther(faucetInfo.faucetBalance));
console.log(
  "Amount per Request:",
  ethers.formatEther(faucetInfo.amountPerRequest)
);
console.log("Cooldown Time:", faucetInfo.cooldown, "seconds");
console.log(
  "Total Distributed:",
  ethers.formatEther(faucetInfo.totalTokensDistributed)
);

// Get user info
const userInfo = await faucet.getUserInfo(userAddress);
console.log("Last Request:", new Date(userInfo.lastRequest * 1000));
console.log("Total Claimed:", ethers.formatEther(userInfo.totalClaimedAmount));
console.log("Time Until Next:", userInfo.timeUntilNext, "seconds");
console.log("Can Claim:", userInfo.canClaim);

// Get remaining claim amount
const remaining = await faucet.getRemainingClaimAmount(userAddress);
console.log("Remaining Claim:", ethers.formatEther(remaining));
```

## 🔒 安全特性

### 全部合约

- ✅ **OpenZeppelin 标准** - 基于审计且稳定的合约
- ✅ **ReentrancyGuard** - 防重入攻击（Sale/Airdrop/Faucet）
- ✅ **Pausable** - 全合约紧急停止机制
- ✅ **Custom Errors** - Gas 友好的错误处理
- ✅ **CEI 模式** - 遵循 Checks-Effects-Interactions

### 代币合约

- ✅ **零地址保护** - 防止向零地址增发
- ✅ **最大供应限制** - 不可超发
- ✅ **紧急暂停** - Owner 可暂停所有转账

### 售卖合约

- ✅ **Pull Payment** - 安全提取 ETH
- ✅ **购买限额** - 防滥用最小/最大额度
- ✅ **余额校验** - 确保合约内代币充足
- ✅ **代币找回** - 可找回误转 ERC20

### 空投合约

- ✅ **Merkle Tree 校验** - Gas 友好的白名单验证
- ✅ **一次性领取** - 防止重复领取
- ✅ **时间窗口校验** - 可选开始/结束时间
- ✅ **证明校验** - 加密学证明验证

### 水龙头合约

- ✅ **冷却时间** - 防止刷取
- ✅ **领取上限** - 可设置每地址上限
- ✅ **余额校验** - 确保余额足够
- ✅ **ETH 拒收** - 防止误转 ETH

## 🛡️ 安全注意事项

### 所有合约通用

- ⚠️ **Owner 权限较大**，请妥善管理私钥。
- ⚠️ **放弃所有权不可逆**，之后无法再管理合约。
- ✅ **生产环境建议使用多签** 管理 Owner。
- ✅ **主网上线前务必审计** 合约。
- ✅ **先在测试网充分测试** 再上主网。

### 代币合约

- ⚠️ **最大供应量写死** 为 10 亿，部署后不可修改。
- ⚠️ **暂停影响所有转账**，含交易所转账。

### 售卖合约

- ⚠️ **代币地址不可变**，部署后不能切换。
- ⚠️ **价格更新立即生效**，会影响后续购买。
- ✅ **公开售卖前确保有足够代币**。
- ✅ **定期提取 ETH** 降低风险敞口。

### 空投合约

- ⚠️ **Merkle Tree 在链下生成**，务必保护数据安全。
- ⚠️ **用户需正确证明** 才能领取，建议提供查询工具。
- ⚠️ **更新 Merkle Root 会重置资格**，多轮空投需谨慎规划。
- ✅ **设置合理的时间窗口** 控制活动周期。
- ✅ **部署前二次校验 Merkle Tree**。

### 水龙头合约

- ⚠️ **对外开放**，需合理设置冷却时间避免被刷光。
- ⚠️ **冷却时间需折中** 可用性与可持续性。
- ✅ **监控水龙头余额** 并及时补充。
- ✅ **可设置领取上限** 保证公平性。

## 📁 项目结构

```
contracts/
├── gogoga-token/
│   ├── GogogaToken.sol           # 主 ERC20 代币合约
│   ├── GogogaTokenSale.sol       # 售卖合约
│   ├── GogogaTokenAirdrop.sol    # Merkle 空投合约
│   ├── GogogaTokenFaucet.sol     # 水龙头合约
│   └── README.md                 # 当前文档
scripts/
├── deploy-gogoga-token.js        # 代币部署脚本
├── deploy-token-sale.js          # 售卖部署脚本（如有）
├── deploy-airdrop.js             # 空投部署脚本（如有）
└── deploy-faucet.js              # 水龙头部署脚本（如有）
test/
├── gogoga-token.test.js          # 代币合约测试
├── token-sale.test.js            # 售卖合约测试（如有）
├── airdrop.test.js               # 空投合约测试（如有）
└── faucet.test.js                # 水龙头合约测试（如有）
```

## 🧩 合约函数参考

### 🪙 GogogaToken 函数

<details>
<summary><b>Owner 函数</b></summary>

| Function                              | Description          |
| ------------------------------------- | -------------------- |
| `mint(address to, uint256 amount)`    | 向地址增发代币       |
| `pause()`                             | 暂停所有转账         |
| `unpause()`                           | 恢复转账             |
| `transferOwnership(address newOwner)` | 转移合约所有权       |
| `renounceOwnership()`                 | 放弃所有权（不可逆） |

</details>

<details>
<summary><b>公共函数</b></summary>

| Function                                                 | Description            |
| -------------------------------------------------------- | ---------------------- |
| `transfer(address to, uint256 amount)`                   | 转账                   |
| `approve(address spender, uint256 amount)`               | 授权额度               |
| `transferFrom(address from, address to, uint256 amount)` | 代扣转账               |
| `burn(uint256 amount)`                                   | 销毁自己的代币         |
| `burnFrom(address account, uint256 amount)`              | 销毁他人代币（需授权） |

</details>

<details>
<summary><b>只读函数</b></summary>

| Function                                    | Description      |
| ------------------------------------------- | ---------------- |
| `name()`                                    | 返回代币名称     |
| `symbol()`                                  | 返回代币符号     |
| `decimals()`                                | 返回小数位（18） |
| `totalSupply()`                             | 返回当前总供应量 |
| `balanceOf(address account)`                | 返回账户余额     |
| `allowance(address owner, address spender)` | 返回授权额度     |
| `MAX_SUPPLY()`                              | 返回最大供应上限 |
| `owner()`                                   | 返回合约 Owner   |
| `paused()`                                  | 返回暂停状态     |

</details>

---

### 💰 GogogaTokenSale 函数

<details>
<summary><b>公共函数</b></summary>

| Function       | Description                      |
| -------------- | -------------------------------- |
| `buyTokens()`  | 通过 ETH 购买代币（payable）     |
| `fundFaucet()` | 任何人可给 faucet 充值（需授权） |

</details>

<details>
<summary><b>Owner 函数</b></summary>

| Function                                         | Description         |
| ------------------------------------------------ | ------------------- |
| `updateTokenPrice(uint256 newPrice)`             | 更新代币价格（ETH） |
| `updatePurchaseLimits(uint256 min, uint256 max)` | 更新最小/最大购买量 |
| `withdrawEth()`                                  | 提取收集的 ETH      |
| `withdrawRemainingTokens()`                      | 提取未售出代币      |
| `rescueTokens(address tokenAddress)`             | 找回误转 ERC20      |
| `pause()` / `unpause()`                          | 暂停/恢复售卖       |

</details>

<details>
<summary><b>只读函数</b></summary>

| Function                                      | Description           |
| --------------------------------------------- | --------------------- |
| `getContractInfo()`                           | 获取合约综合信息      |
| `calculateTokenAmount(uint256 ethAmount)`     | 计算 ETH 对应代币数量 |
| `calculateEthAmount(uint256 tokenAmount)`     | 计算购买所需 ETH      |
| `saleToken()`                                 | 返回代币地址          |
| `tokenPriceInEth()`                           | 返回当前价格          |
| `totalTokensSold()` / `totalEthRaised()`      | 返回售卖统计          |
| `minPurchaseAmount()` / `maxPurchaseAmount()` | 返回购买限额          |

</details>

---

### 🎁 GogogaTokenAirdrop 函数

<details>
<summary><b>公共函数</b></summary>

| Function                                          | Description      |
| ------------------------------------------------- | ---------------- |
| `claim(uint256 amount, bytes32[] calldata proof)` | 通过证明领取空投 |

</details>

<details>
<summary><b>Owner 函数</b></summary>

| Function                                       | Description                |
| ---------------------------------------------- | -------------------------- |
| `updateMerkleRoot(bytes32 newRoot)`            | 更新 Merkle Root（新一轮） |
| `updateTimeWindow(uint256 start, uint256 end)` | 更新空投时间窗口           |
| `withdrawUnclaimedTokens()`                    | 结束后回收未领取代币       |
| `pause()` / `unpause()`                        | 暂停/恢复领取              |

</details>

<details>
<summary><b>只读函数</b></summary>

| Function                                         | Description      |
| ------------------------------------------------ | ---------------- |
| `canClaim(address, uint256, bytes32[])`          | 判断是否可领取   |
| `getAirdropInfo()`                               | 获取空投综合信息 |
| `getClaimStatus(address account)`                | 获取领取状态     |
| `hasClaimed(address)` / `claimedAmount(address)` | 获取领取状态     |
| `merkleRoot()` / `startTime()` / `endTime()`     | 获取空投参数     |
| `totalClaimed()` / `totalClaimCount()`           | 获取领取统计     |

</details>

---

### 🚰 GogogaTokenFaucet 函数

<details>
<summary><b>公共函数</b></summary>

| Function                     | Description      |
| ---------------------------- | ---------------- |
| `requestTokens()`            | 请求水龙头代币   |
| `fundFaucet(uint256 amount)` | 向水龙头充值代币 |

</details>

<details>
<summary><b>Owner 函数</b></summary>

| Function                             | Description          |
| ------------------------------------ | -------------------- |
| `setRequestAmount(uint256 amount)`   | 更新单次领取数量     |
| `setCooldownTime(uint256 time)`      | 更新冷却时间         |
| `setMaxClaimPerAddress(uint256 max)` | 更新每地址最大领取量 |
| `withdrawTokens(uint256 amount)`     | 从水龙头提取代币     |
| `rescueTokens(address tokenAddress)` | 找回误转 ERC20       |
| `pause()` / `unpause()`              | 暂停/恢复水龙头      |

</details>

<details>
<summary><b>只读函数</b></summary>

| Function                                | Description        |
| --------------------------------------- | ------------------ |
| `canRequestTokens(address user)`        | 判断是否可领取     |
| `getTimeUntilNextRequest(address user)` | 获取剩余冷却时间   |
| `getRemainingClaimAmount(address user)` | 获取剩余可领取额度 |
| `getFaucetInfo()`                       | 获取水龙头综合信息 |
| `getUserInfo(address user)`             | 获取用户信息       |
| `requestAmount()` / `cooldownTime()`    | 获取水龙头参数     |
| `totalDistributed()`                    | 获取累计发放量     |

</details>

## 📝 许可证

MIT License

## 🤝 贡献

欢迎贡献、提交问题和功能请求！

## 📧 联系方式

如需支持或有疑问，请在仓库提交 issue。

## 🚀 部署流程

### 推荐部署顺序

1. **部署代币合约**

   ```bash
   npx hardhat deploy-gogoga-token --network sepolia
   ```

2. **部署售卖合约**（可选）

   ```bash
   npx hardhat deploy-gogoga-token-sale --token 0x422e7D247664f7CFd5bA9025281e6705C6163F41 --price 0.0001 --fund 1000000 --network sepolia
   ```

   - 使用代币地址与初始价格部署
   - 向售卖合约转入代币
   - 先用小额购买进行测试

3. **部署空投合约**（可选）

   ```bash
   npx hardhat deploy-gogoga-token-airdrop --token 0x422e7D247664f7CFd5bA9025281e6705C6163F41 --fund 10000 --airdrop-file deployments/airdrop-list.json --network sepolia
   ```

   - 在链下生成 Merkle Tree
   - 使用 merkle root 与时间窗口部署
   - 向空投合约转入代币
   - 对外发布可领取地址的 proof

4. **部署水龙头合约**（可选）

   ```bash
   npx hardhat deploy-gogoga-token-faucet --token 0x422e7D247664f7CFd5bA9025281e6705C6163F41 --amount 100 --cooldown 60 --fund 10000 --network sepolia
   ```

   - 使用代币地址、领取数量与冷却时间部署
   - 向水龙头合约转入代币
   - 对外发布水龙头地址

## 📊 Gas 使用估算

| 操作       | 估算 Gas   | 30 gwei 费用 |
| ---------- | ---------- | ------------ |
| 部署代币   | ~2,500,000 | ~0.075 ETH   |
| 部署售卖   | ~3,000,000 | ~0.090 ETH   |
| 部署空投   | ~2,800,000 | ~0.084 ETH   |
| 部署水龙头 | ~2,600,000 | ~0.078 ETH   |
| 代币转账   | ~50,000    | ~0.0015 ETH  |
| 购买代币   | ~80,000    | ~0.0024 ETH  |
| 领取空投   | ~70,000    | ~0.0021 ETH  |
| 请求水龙头 | ~60,000    | ~0.0018 ETH  |

_注：Gas 估算为近似值，具体以网络状况为准。_

## 🧪 测试

所有合约均包含完整测试套件。可通过以下命令运行：

```bash
# Test all contracts
npm test

# Test specific contract
npx hardhat test test/gogoga-token.test.js
npx hardhat test test/gogoga-token-sale.test.js
npx hardhat test test/gogoga-token-airdrop.test.js
npx hardhat test test/gogoga-token-faucet.test.js

# Coverage report
npx hardhat coverage
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: This README and inline code comments

---

**⚠️ Disclaimer**: These contracts are provided as-is. Always perform a professional security audit before deploying to production with real value. The authors are not responsible for any losses incurred through the use of these contracts.
