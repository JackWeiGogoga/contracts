const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { ethers } = require("ethers");

/**
 * 生成空投 Merkle Tree 的辅助脚本
 *
 * 使用方法:
 * 1. 准备空投列表 (地址 => 数量)
 * 2. 运行此脚本生成 merkle root 和 proofs
 * 3. 部署合约时使用 merkle root
 * 4. 用户领取时提供对应的 proof
 */

/**
 * 生成 Merkle Tree 和 Proofs
 * @param {Object} airdropList - 空投列表 { address: amount }
 * @returns {Object} - { merkleRoot, merkleTree, proofs }
 */
function generateMerkleTree(airdropList) {
    // 1. 生成叶子节点
    const leaves = Object.entries(airdropList).map(([address, amount]) => {
        // 注意: amount 应该是包含 decimals 的值, 例如 100 * 10^18
        // 使用双重哈希以匹配合约: keccak256(bytes.concat(keccak256(abi.encode(address, amount))))
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256"],
            [address, amount]
        );
        const innerHash = keccak256(encodedData);
        return keccak256(innerHash);
    });

    // 2. 创建 Merkle Tree
    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    // 3. 获取 Merkle Root
    const merkleRoot = merkleTree.getHexRoot();

    // 4. 为每个地址生成 proof
    const proofs = {};
    Object.entries(airdropList).forEach(([address, amount]) => {
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "uint256"],
            [address, amount]
        );
        const innerHash = keccak256(encodedData);
        const leaf = keccak256(innerHash);
        const proof = merkleTree.getHexProof(leaf);
        proofs[address] = proof;
    });

    return {
        merkleRoot,
        merkleTree,
        proofs,
    };
}

/**
 * 验证某个地址的 proof 是否有效
 */
function verifyProof(merkleTree, address, amount) {
    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [address, amount]
    );
    const innerHash = keccak256(encodedData);
    const leaf = keccak256(innerHash);
    const proof = merkleTree.getHexProof(leaf);
    const root = merkleTree.getHexRoot();

    return merkleTree.verify(proof, leaf, root);
}

module.exports = {
    generateMerkleTree,
    verifyProof,
};
