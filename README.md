# Smart Contracts Practice

这是一个使用 Hardhat v2 框架的智能合约练习项目，用于学习和实践 Solidity 开发。

## 技术栈

-   **框架**: Hardhat v2.27+
-   **语言**: Solidity ^0.8.0
-   **工具链**: @nomicfoundation/hardhat-toolbox
-   **依赖**: OpenZeppelin Contracts v5.4+

## 项目结构

```
contracts/
├── crowdfunding/          # 众筹合约
└── ...                    # 更多合约（持续更新）
```

## 合约列表

### 1. [Crowdfunding - 众筹合约](./contracts/crowdfunding/)

一个功能完整的众筹合约系统，支持档位资助和自定义金额资助，包含完善的状态管理和退款机制。

> 📖 [查看详细文档](./contracts/crowdfunding/README.md)

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
npx hardhat deploy --network <network-name>
```

## License

MIT
