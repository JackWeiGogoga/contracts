# Crowdfunding - 众筹合约

一个功能完整、灵活可配置的众筹智能合约系统，支持多种资助方式和完善的状态管理。

## 概述

该众筹合约实现了一个去中心化的众筹平台，允许项目发起者创建众筹活动，支持者可以通过预设档位或自定义金额进行资助。合约包含完善的状态管理、退款机制和紧急暂停功能。

## 核心特性

### 🎯 多样化的资助方式

- **档位资助（Tier-based Funding）**: 项目方可设置多个固定金额的资助档位
- **自定义金额资助**: 支持者可以贡献任意金额（需满足最低限额）
- **灵活配置**: 项目方可动态添加/移除档位、调整最低贡献金额

### 📊 智能状态管理

- **Active（进行中）**: 众筹活动正在进行，接受资助
- **Successful（成功）**: 达到目标金额或截止日期已过且达标
- **Failed（失败）**: 截止日期已过但未达到目标金额

> 注：状态采用动态计算而非存储，避免状态不一致问题

### 💰 资金管理

- **自动退款**: 众筹失败时，支持者可以自助申请退款
- **一次性提款**: 众筹成功后，项目方只能提款一次
- **精确追踪**: 记录每个支持者的总贡献和档位资助情况

### 🛡️ 安全机制

- **紧急暂停**: 项目方可在紧急情况下暂停资助
- **访问控制**: 关键功能仅限项目所有者调用
- **防重入攻击**: 使用 `call` 进行转账，遵循 checks-effects-interactions 模式

## 合约架构

### Crowdfunding.sol

主合约，实现核心众筹逻辑。

**主要数据结构:**

```solidity
enum CampaignState { Active, Successful, Failed }

struct Tier {
    string name;          // 档位名称
    uint256 amount;       // 所需金额
    uint256 backers;      // 支持者数量
}

struct Backer {
    uint256 totalContribution;      // 总贡献
    uint256 customContribution;     // 自定义贡献
    mapping(uint256 => bool) fundedTiers;  // 已资助的档位
}
```

**核心函数:**

- `fund(uint256 _tierIndex)` - 资助众筹项目
- `withdraw()` - 提取资金（仅成功时）
- `refund()` - 申请退款（仅失败时）
- `getState()` - 获取当前状态
- `getCampaignStats()` - 获取统计信息

### CrowdfundingFactory.sol

工厂合约，用于批量创建和管理众筹活动。

## 使用示例

### 创建众筹活动

```solidity
Crowdfunding campaign = new Crowdfunding(
    msg.sender,                 // 所有者
    "我的项目",                  // 名称
    "项目描述",                  // 描述
    10 ether,                   // 目标金额
    30,                         // 持续天数
    0.01 ether                  // 最低贡献（0 = 禁用自定义金额）
);

// 添加资助档位
campaign.addTier("早鸟", 0.1 ether);
campaign.addTier("普通", 0.5 ether);
campaign.addTier("VIP", 1 ether);
```

### 资助项目

```solidity
// 档位资助
campaign.fund{value: 0.1 ether}(0);  // 资助第一个档位

// 自定义金额资助
uint256 CUSTOM_TIER_INDEX = type(uint256).max;
campaign.fund{value: 0.25 ether}(CUSTOM_TIER_INDEX);
```

### 提款/退款

```solidity
// 众筹成功后提款（仅所有者）
campaign.withdraw();

// 众筹失败后退款
campaign.refund();
```

## 开发与测试

### 编译

```bash
npx hardhat compile
```

### 测试

```bash
npx hardhat test test/crowdfunding.test.js
```

### 部署

```bash
npx hardhat run tasks/deploy.js --network <network-name>
```

## 技术细节

### 状态计算逻辑

合约采用动态状态计算而非状态存储：

```solidity
function getState() public view returns (CampaignState) {
    if (block.timestamp >= deadline) {
        return address(this).balance >= goal
            ? CampaignState.Successful
            : CampaignState.Failed;
    }

    if (address(this).balance >= goal) {
        return CampaignState.Successful;
    }

    return CampaignState.Active;
}
```

### 自定义金额标识

使用 `uint256.max` 作为自定义金额的特殊标识：

```solidity
uint256 public constant CUSTOM_TIER_INDEX = type(uint256).max;
```

## 安全考虑

- ✅ 使用 `call` 代替 `transfer` 避免 gas 限制问题
- ✅ 先修改状态再转账，防止重入攻击
- ✅ 提款标记防止重复提取
- ✅ 完善的访问控制
- ✅ 紧急暂停机制

## 待改进

- [ ] 支持 ERC20 代币资助
- [ ] 添加项目里程碑管理
- [ ] 实现分阶段资金释放
- [ ] 增加支持者投票治理

## License

MIT
