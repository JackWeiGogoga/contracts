const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
require("dotenv").config();

/**
 * 使用 Pinata 上传 NFT 到 IPFS
 *
 * 环境变量：
 * - PINATA_API_KEY: Pinata API Key
 * - PINATA_SECRET_KEY: Pinata Secret API Key
 *
 * 使用方法：
 * 1. npm install axios form-data
 * 2. 创建 .env 文件，添加 Pinata API keys
 * 3. 准备图片文件夹：./nft-assets/images/
 * 4. node scripts/upload-to-ipfs.js
 */

// ============ 配置 ============

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_API_URL = "https://api.pinata.cloud";

// NFT 配置
const NFT_CONFIG = {
    name: "Gogoga NFT Collection",
    description: "An amazing NFT collection",
    totalSupply: 10,
    imagesDir: "./nft-assets/images", // 图片目录
    metadataDir: "./nft-assets/metadata", // 生成的元数据目录
};

// ============ 辅助函数 ============

async function uploadFolderToPinata(folderPath, folderName) {
    console.log(`\n📦 开始上传文件夹: ${folderName}...`);

    const url = `${PINATA_API_URL}/pinning/pinFileToIPFS`;
    const formData = new FormData();

    const files = fs.readdirSync(folderPath);

    console.log(`   发现 ${files.length} 个文件`);

    // 重要：所有文件需要在同一个目录下，使用相同的根路径
    for (const file of files) {
        const filePath = path.join(folderPath, file);

        // 跳过隐藏文件和非文件项
        if (file.startsWith(".") || !fs.statSync(filePath).isFile()) {
            continue;
        }

        const fileStream = fs.createReadStream(filePath);

        // 关键修复：filepath 需要包含统一的文件夹名
        formData.append("file", fileStream, {
            filepath: `files/${file}`, // 使用 files/ 作为虚拟文件夹
        });
    }

    const metadata = JSON.stringify({
        name: folderName,
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
        cidVersion: 0,
        wrapWithDirectory: false, // 不额外包装目录
    });
    formData.append("pinataOptions", options);

    try {
        const response = await axios.post(url, formData, {
            maxBodyLength: "Infinity",
            headers: {
                ...formData.getHeaders(),
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_KEY,
            },
        });

        console.log(`✅ 上传成功！`);
        console.log(`   CID: ${response.data.IpfsHash}`);
        console.log(
            `   URL: https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
        );

        return response.data.IpfsHash;
    } catch (error) {
        console.error("❌ 上传失败:", error.response?.data || error.message);
        throw error;
    }
}

function generateMetadata(tokenId, imagesCID) {
    return {
        name: `${NFT_CONFIG.name} #${tokenId}`,
        description: NFT_CONFIG.description,
        image: `ipfs://${imagesCID}/${tokenId}.png`,
        attributes: [
            // 根据你的需求自定义属性
            {
                trait_type: "Token ID",
                value: tokenId,
            },
            // 添加更多属性...
        ],
    };
}

function createMetadataFiles(imagesCID) {
    console.log("\n📝 生成元数据文件...");

    // 创建元数据目录
    if (!fs.existsSync(NFT_CONFIG.metadataDir)) {
        fs.mkdirSync(NFT_CONFIG.metadataDir, { recursive: true });
    }

    // 生成每个 token 的元数据
    for (let i = 0; i < NFT_CONFIG.totalSupply; i++) {
        const metadata = generateMetadata(i, imagesCID);

        // 保存为无扩展名文件（OpenSea 标准）
        // 或者使用 `${i}.json` 也可以
        const filePath = path.join(NFT_CONFIG.metadataDir, `${i}`);
        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));

        if (i % 100 === 0) {
            console.log(`   已生成: ${i}/${NFT_CONFIG.totalSupply}`);
        }
    }

    console.log(`✅ 完成！生成了 ${NFT_CONFIG.totalSupply} 个元数据文件`);
}

// ============ 主函数 ============

async function main() {
    console.log("🚀 开始上传 NFT 到 IPFS (Pinata)");
    console.log("=".repeat(50));

    // 验证 API keys
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
        console.error(
            "❌ 错误：请设置 PINATA_API_KEY 和 PINATA_SECRET_KEY 环境变量"
        );
        console.log("\n获取方式：");
        console.log("1. 访问 https://pinata.cloud");
        console.log("2. 注册/登录账户");
        console.log("3. 进入 API Keys 页面");
        console.log("4. 创建新的 API Key");
        return;
    }

    // 验证图片目录
    if (!fs.existsSync(NFT_CONFIG.imagesDir)) {
        console.error(`❌ 错误：图片目录不存在: ${NFT_CONFIG.imagesDir}`);
        console.log("\n请创建目录并放入图片文件：");
        console.log("  - 0.png, 1.png, 2.png, ...");
        return;
    }

    try {
        // 步骤 1: 上传图片
        console.log("\n📸 步骤 1/3: 上传图片到 IPFS");
        const imagesCID = await uploadFolderToPinata(
            NFT_CONFIG.imagesDir,
            `${NFT_CONFIG.name} - Images`
        );

        // 步骤 2: 生成元数据
        console.log("\n📝 步骤 2/3: 生成元数据文件");
        createMetadataFiles(imagesCID);

        // 步骤 3: 上传元数据
        console.log("\n📤 步骤 3/3: 上传元数据到 IPFS");
        const metadataCID = await uploadFolderToPinata(
            NFT_CONFIG.metadataDir,
            `${NFT_CONFIG.name} - Metadata`
        );

        // 完成
        console.log("\n" + "=".repeat(50));
        console.log("🎉 所有文件上传完成！");
        console.log("=".repeat(50));
        console.log("\n📋 重要信息：");
        console.log(`   Images CID:   ${imagesCID}`);
        console.log(`   Metadata CID: ${metadataCID}`);
        console.log(`\n🔗 Base URI (用于智能合约):`);
        console.log(`   ipfs://${metadataCID}/`);
        console.log("\n🌐 网关 URLs:");
        console.log(`   https://gateway.pinata.cloud/ipfs/${metadataCID}/0`);
        console.log(`   https://ipfs.io/ipfs/${metadataCID}/0`);
        console.log("\n💡 下一步：");
        console.log(
            `   1. 在浏览器中验证元数据：https://gateway.pinata.cloud/ipfs/${metadataCID}/0`
        );
        console.log(`   2. 在合约中设置 baseURI: ipfs://${metadataCID}/`);
        console.log(`   3. 部署合约并开始 mint！`);

        // 保存结果到文件
        const result = {
            timestamp: new Date().toISOString(),
            imagesCID,
            metadataCID,
            baseURI: `ipfs://${metadataCID}/`,
            totalSupply: NFT_CONFIG.totalSupply,
        };
        fs.writeFileSync(
            "deployments/ipfs-upload-result.json",
            JSON.stringify(result, null, 2)
        );
        console.log("\n💾 结果已保存到: deployments/ipfs-upload-result.json");
    } catch (error) {
        console.error("\n❌ 上传过程中出错:", error.message);
        process.exit(1);
    }
}

// 运行
/**
 * 📋 重要信息：
   Images CID:   QmUg2xBrLqo86wXe45CTusUCc6jT2RtPwmoDxEc1CJgcAy
   Metadata CID: QmXtxtDWwcu4v7etaJFvubvnkYXRBMJwDcPKQBQLFDWB13

🔗 Base URI (用于智能合约):
   ipfs://QmXtxtDWwcu4v7etaJFvubvnkYXRBMJwDcPKQBQLFDWB13/
 */
main();
