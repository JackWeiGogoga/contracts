# NFT 上传到 IPFS 完整指南

## 📋 目录

1. [准备工作](#准备工作)
2. [使用 Pinata（推荐）](#方案1-pinata推荐)
3. [使用 NFT.Storage](#方案2-nftstorage免费)
4. [使用 IPFS 命令行](#方案3-ipfs-命令行)
5. [验证上传结果](#验证上传结果)

---

## 准备工作

### 1. 文件组织结构

```
nft-assets/
├── images/              # 原始图片
│   ├── 0.png
│   ├── 1.png
│   └── ...
│
└── metadata/           # 将自动生成
    ├── 0
    ├── 1
    └── ...
```

### 2. 元数据标准格式

每个元数据文件（如 `0`）的内容：

```json
{
    "name": "My NFT #0",
    "description": "This is my NFT collection",
    "image": "ipfs://QmXXX/0.png",
    "attributes": [
        {
            "trait_type": "Background",
            "value": "Blue"
        },
        {
            "trait_type": "Rarity",
            "value": "Common"
        }
    ]
}
```

---

## 方案 1: Pinata（推荐）

### 🌟 优点

-   ✅ 用户界面友好
-   ✅ 自动 pinning（持久化存储）
-   ✅ 免费 1GB，付费计划合理
-   ✅ 稳定可靠

### 使用步骤

#### 选项 A: 使用自动化脚本（推荐）

1. **安装依赖**

```bash
npm install axios form-data dotenv
```

2. **获取 Pinata API Keys**

-   访问 https://pinata.cloud
-   注册并登录
-   进入 **API Keys** 页面
-   点击 **New Key**，勾选所有权限
-   复制 API Key 和 Secret Key

3. **配置环境变量**

```bash
# 复制配置文件
cp .env.example .env

# 编辑 .env 文件，填入你的 API keys
PINATA_API_KEY=your_actual_api_key
PINATA_SECRET_KEY=your_actual_secret_key
```

4. **准备图片**

```bash
# 创建目录
mkdir -p nft-assets/images

# 将你的图片放入 nft-assets/images/
# 命名为: 0.png, 1.png, 2.png, ...
```

5. **运行上传脚本**

```bash
node scripts/upload-to-ipfs.js
```

6. **获取结果**
   脚本会输出：

```
🔗 Base URI (用于智能合约):
   ipfs://QmYYY.../

保存这个 URI，部署合约时需要用到！
```

#### 选项 B: 使用 Web 界面

1. **上传图片**

    - 登录 Pinata
    - 点击 **Upload** → **Folder**
    - 选择 `images` 文件夹
    - 上传完成后，记录 CID（如 `QmXXX...`）

2. **创建元数据**

    - 手动创建元数据文件
    - 将 `image` 字段设置为 `ipfs://QmXXX/0.png`

3. **上传元数据**

    - 再次点击 **Upload** → **Folder**
    - 选择 `metadata` 文件夹
    - 记录元数据 CID（如 `QmYYY...`）

4. **Base URI**
    ```
    ipfs://QmYYY.../
    ```

---

## 方案 2: NFT.Storage（免费）

### 🌟 优点

-   ✅ 完全免费
-   ✅ 专为 NFT 设计
-   ✅ Protocol Labs 官方支持

### 使用步骤

1. **安装 SDK**

```bash
npm install nft.storage
```

2. **获取 API Token**

-   访问 https://nft.storage
-   登录（支持 GitHub/Email）
-   进入 **API Keys**
-   创建新 token

3. **使用脚本上传**

```javascript
import { NFTStorage, File } from "nft.storage";
import fs from "fs";

const client = new NFTStorage({ token: "YOUR_API_TOKEN" });

// 上传单个 NFT
const metadata = await client.store({
    name: "My NFT",
    description: "Amazing NFT",
    image: new File([fs.readFileSync("image.png")], "image.png", {
        type: "image/png",
    }),
});

console.log("Metadata URI:", metadata.url);
```

---

## 方案 3: IPFS 命令行

### 适用场景

-   需要完全控制
-   自建 IPFS 节点

### 使用步骤

1. **安装 IPFS**

```bash
# macOS
brew install ipfs

# 或下载 https://docs.ipfs.tech/install/
```

2. **初始化并启动**

```bash
ipfs init
ipfs daemon
```

3. **上传文件夹**

```bash
# 上传图片
ipfs add -r nft-assets/images
# 输出: added QmXXX... images

# 上传元数据
ipfs add -r nft-assets/metadata
# 输出: added QmYYY... metadata
```

4. **Pin 文件（保持在线）**

```bash
ipfs pin add QmYYY...
```

5. **Base URI**

```
ipfs://QmYYY.../
```

⚠️ **注意**：需要保持节点运行，或使用 Pinning 服务（Pinata、Infura 等）

---

## 验证上传结果

### 1. 在浏览器中测试

访问以下任一网关：

```
https://ipfs.io/ipfs/QmYYY.../0
https://gateway.pinata.cloud/ipfs/QmYYY.../0
https://cloudflare-ipfs.com/ipfs/QmYYY.../0
```

应该看到元数据 JSON：

```json
{
  "name": "My NFT #0",
  "image": "ipfs://QmXXX/0.png",
  ...
}
```

### 2. 验证图片链接

点击 `image` 字段的链接，应该能看到图片。

### 3. OpenSea 测试工具

访问：https://testnets.opensea.io/get-listed/step-two
输入你的元数据 URL 进行验证。

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **使用 IPFS 协议 URI**

    ```
    ✅ ipfs://QmXXX/0.png
    ❌ https://ipfs.io/ipfs/QmXXX/0.png
    ```

2. **文件命名规范**

    - 元数据：`0`, `1`, `2`（无扩展名）或 `0.json`
    - 图片：`0.png`, `1.png`

3. **在部署前验证**

    - 至少测试 token 0, 1, 最后一个
    - 确保所有链接可访问

4. **备份 CID**
    - 保存所有 CID 到安全的地方
    - 记录在合约文档中

### ⚠️ 常见错误

1. **Base URI 格式错误**

    ```
    ❌ ipfs://QmXXX      (缺少末尾的 /)
    ✅ ipfs://QmXXX/
    ```

2. **元数据 image 字段错误**

    ```
    ❌ QmYYY/0.png
    ❌ https://gateway.../ipfs/QmYYY/0.png
    ✅ ipfs://QmYYY/0.png
    ```

3. **文件命名不连续**
    ```
    ❌ 0.png, 2.png, 5.png  (跳号)
    ✅ 0.png, 1.png, 2.png  (连续)
    ```

---

## 📊 成本对比

| 服务            | 免费额度 | 付费价格     | 推荐场景  |
| --------------- | -------- | ------------ | --------- |
| **Pinata**      | 1GB      | $20/月 100GB | 商业项目  |
| **NFT.Storage** | 无限     | 免费         | 个人/测试 |
| **Infura**      | 5GB      | 按量付费     | 企业级    |
| **自建节点**    | 免费     | 服务器成本   | 技术团队  |

---

## 🔗 下一步

上传完成后：

1. **记录 Base URI**

    ```
    ipfs://QmYYY.../
    ```

2. **更新合约配置**

    ```solidity
    constructor(...) {
        _baseTokenURI = "ipfs://QmYYY.../";
    }
    ```

3. **或在部署后设置**

    ```javascript
    await contract.setBaseURI("ipfs://QmYYY.../");
    ```

4. **测试 mint**
    ```javascript
    await contract.mint();
    const uri = await contract.tokenURI(0);
    console.log(uri); // 应该输出: ipfs://QmYYY.../0
    ```

---

## 📚 参考资源

-   [IPFS 文档](https://docs.ipfs.tech/)
-   [Pinata 文档](https://docs.pinata.cloud/)
-   [NFT.Storage 文档](https://nft.storage/docs/)
-   [OpenSea 元数据标准](https://docs.opensea.io/docs/metadata-standards)
