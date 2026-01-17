# Smart Contracts Practice

Hardhat-based smart contracts workspace featuring crowdfunding, ERC20 ecosystem, NFT, and voting examples.

English | [简体中文](./README.zh-CN.md)

![Solidity](https://img.shields.io/badge/solidity-0.8.28-blue)
![Hardhat](https://img.shields.io/badge/hardhat-2.27%2B-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

[Docs](./docs) · [Contracts](./contracts) · [Tasks](./tasks) · [Scripts](./scripts) · [License](#license)

## Tech Stack

-   **Framework**: Hardhat v2.27+
-   **Language**: Solidity ^0.8.28
-   **Tooling**: @nomicfoundation/hardhat-toolbox
-   **Dependencies**: OpenZeppelin Contracts v5.4+
-   **Utilities**: dotenv / axios / merkletreejs (IPFS upload and airdrop allowlist)

## Project Structure

```
contracts/
├── contracts/
│   ├── crowdfunding/      # Crowdfunding contract + Factory
│   ├── gogoga-token/      # ERC20 ecosystem (Token/Sale/Airdrop/Faucet)
│   ├── gogoga-nft/        # ERC721 NFT contract
│   └── voting/            # Voting contract
├── tasks/                 # Hardhat deploy/verify tasks
├── scripts/               # Helper scripts (IPFS/merkle tree)
├── test/                  # Hardhat tests
├── docs/                  # Notes and guides
└── nft-assets/            # NFT sample assets
```

## Contracts

### 1. [Crowdfunding](./contracts/crowdfunding/)

Full-featured crowdfunding system with tiered/custom funding, status control, and refunds.

[Docs](./contracts/crowdfunding/README.md)

### 2. [GogogaToken - ERC20 Ecosystem](./contracts/gogoga-token/)

ERC20 token with fixed-price sale, Merkle airdrop, and faucet contracts.

[Docs](./contracts/gogoga-token/README.md)

### 3. [Gogoga NFT - ERC721](./contracts/gogoga-nft/)

NFT contract with public mint, batch airdrop, EIP-2981 royalties, and pausability.

[Docs](./contracts/gogoga-nft/README.md)

### 4. [Voting](./contracts/voting/Voting.sol)

Voting system with candidate/voter registration, time window, and pause controls.

---

## Quick Start

### Install

```bash
npm install
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
```

### Deploy

```bash
npx hardhat deploy-crowdfunding --network <network-name>
npx hardhat deploy-gogoga-token --network <network-name>
npx hardhat deploy-gogoga-token-sale --network <network-name>
npx hardhat deploy-gogoga-token-airdrop --network <network-name>
npx hardhat deploy-gogoga-token-faucet --network <network-name>
npx hardhat deploy-gogoga-nft --network <network-name>
npx hardhat deploy-voting --network <network-name>
```

### Verify

```bash
npx hardhat verify-contract --address <contract-address> --network <network-name>
```

### Scripts and Docs

-   IPFS upload guide: `docs/IPFS_UPLOAD_GUIDE.md`
-   Generate Merkle tree: `scripts/generate-merkle-tree.js`
-   Upload to IPFS: `scripts/upload-to-ipfs.js`

## Environment Variables

Create a `.env` file for testnet deployment and verification:

```
INKR_URL=<sepolia-rpc-url>
PRIVATE_KEY=<deployer-private-key>
ETHERSCAN_KEY=<etherscan-api-key>
```

## License

MIT
