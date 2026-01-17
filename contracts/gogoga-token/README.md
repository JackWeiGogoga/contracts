# GogogaToken Ecosystem (GOGOGA)

A complete and secure ERC20 token ecosystem with token contract, sale mechanism, airdrop system, and faucet functionality.

## 📋 Ecosystem Overview

This project provides a complete token ecosystem with four main components:

### 🪙 **GogogaToken** - Main Token Contract

-   ✅ **ERC20 Standard** - Full ERC20 compliance
-   ✅ **Mintable** - Owner can mint tokens to any address
-   ✅ **Burnable** - Token holders can burn their own tokens
-   ✅ **Pausable** - Owner can pause/unpause all transfers for emergency situations
-   ✅ **Ownable** - Standard ownership management with transfer and renounce capabilities
-   ✅ **Max Supply** - Hard cap of 1 billion tokens to prevent unlimited inflation
-   ✅ **Gas Optimized** - Built on OpenZeppelin's battle-tested contracts

### 💰 **GogogaTokenSale** - Token Sale Contract

-   ✅ **ETH to Token Exchange** - Buy GOGOGA tokens with ETH at a fixed rate
-   ✅ **Pausable Sales** - Emergency stop mechanism
-   ✅ **ReentrancyGuard** - Protection against reentrancy attacks
-   ✅ **Pull Payment Pattern** - Secure ETH withdrawal for owner
-   ✅ **Purchase Limits** - Configurable min/max purchase amounts
-   ✅ **Dynamic Pricing** - Owner can update token price
-   ✅ **Token Rescue** - Recover accidentally sent ERC20 tokens
-   ✅ **Comprehensive Events** - Full activity logging

### 🎁 **GogogaTokenAirdrop** - Airdrop Contract

-   ✅ **Merkle Tree Verification** - Gas-efficient whitelist validation
-   ✅ **One-Time Claims** - Each address can claim only once
-   ✅ **Time-Bounded** - Optional start and end time for airdrop campaigns
-   ✅ **Pausable Claims** - Emergency stop mechanism
-   ✅ **Multi-Round Support** - Update Merkle root for new airdrop rounds
-   ✅ **Unclaimed Withdrawal** - Recover unclaimed tokens after deadline
-   ✅ **Claim Verification** - Check eligibility before claiming
-   ✅ **ReentrancyGuard** - Protection against reentrancy attacks

### 🚰 **GogogaTokenFaucet** - Faucet Contract

-   ✅ **Time-Based Cooldown** - Prevent abuse with configurable waiting periods
-   ✅ **Configurable Amounts** - Adjustable token distribution per request
-   ✅ **Claim Limits** - Optional maximum total claims per address
-   ✅ **Pausable Distribution** - Emergency stop mechanism
-   ✅ **Fund Management** - Easy funding and withdrawal for owner
-   ✅ **User-Friendly Views** - Check eligibility and remaining time
-   ✅ **ReentrancyGuard** - Protection against reentrancy attacks
-   ✅ **Gas Optimized** - Efficient with custom errors

## 📊 Token Details

| Property       | Value                |
| -------------- | -------------------- |
| Name           | GogogaToken          |
| Symbol         | GOGOGA               |
| Decimals       | 18                   |
| Initial Supply | 1,000,000 GOGOGA     |
| Max Supply     | 1,000,000,000 GOGOGA |

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation

```bash
# Install dependencies
npm install
```

### Compile Contracts

```bash
npm run compile
```

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Gogoga Token Tests Only

```bash
npm run test:gogoga
```

### Test Coverage

```bash
npm run test:coverage
```

### Expected Test Results

The test suite includes **60+ test cases** covering:

-   ✅ Deployment scenarios
-   ✅ Minting functionality
-   ✅ Burning functionality
-   ✅ Pause/Unpause mechanisms
-   ✅ Transfer operations
-   ✅ Allowance management
-   ✅ Ownership controls
-   ✅ Edge cases
-   ✅ Gas usage benchmarks

## 📦 Deployment

### Deploy to Local Network

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy
npm run deploy:local
```

### Deploy to Sepolia Testnet

```bash
# Set up your .env file with:
# SEPOLIA_RPC_URL=your_rpc_url
# PRIVATE_KEY=your_private_key

npm run deploy:sepolia
```

### Deploy to Other Networks

```bash
npx hardhat run scripts/deploy-gogoga-token.js --network <network-name>
```

## 🔧 Usage Examples

### 🪙 Token Contract (GogogaToken)

#### Minting Tokens

```javascript
// Mint 1,000 tokens to an address
await gogogaToken.mint(recipientAddress, ethers.parseEther("1000"));
```

### Burning Tokens

```javascript
// Burn 100 of your own tokens
await gogogaToken.burn(ethers.parseEther("100"));

// Burn tokens from another address (requires approval)
await gogogaToken.burnFrom(address, ethers.parseEther("100"));
```

### Pausing Transfers

```javascript
// Pause all token transfers
await gogogaToken.pause();

// Unpause transfers
await gogogaToken.unpause();
```

### Standard ERC20 Operations

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

#### Ownership Management

```javascript
// Transfer ownership
await gogogaToken.transferOwnership(newOwnerAddress);

// Renounce ownership (irreversible)
await gogogaToken.renounceOwnership();
```

---

### 💰 Token Sale Contract (GogogaTokenSale)

#### Deploy Token Sale

```javascript
const tokenAddress = "0x..."; // Your deployed GogogaToken address
const tokenPrice = ethers.parseEther("0.001"); // 1 token costs 0.001 ETH

const TokenSale = await ethers.getContractFactory("GogogaTokenSale");
const tokenSale = await TokenSale.deploy(tokenAddress, tokenPrice);

// Fund the sale contract with tokens
await gogogaToken.transfer(tokenSale.target, ethers.parseEther("1000000"));
```

#### Buy Tokens

```javascript
// Buy tokens with 1 ETH
await tokenSale.buyTokens({ value: ethers.parseEther("1") });

// Calculate how many tokens you'll get
const ethAmount = ethers.parseEther("1");
const tokenAmount = await tokenSale.calculateTokenAmount(ethAmount);
console.log(`You will receive ${ethers.formatEther(tokenAmount)} tokens`);
```

#### Manage Token Sale (Owner Only)

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

#### Get Sale Information

```javascript
const info = await tokenSale.getContractInfo();
console.log("Token Address:", info.tokenAddress);
console.log("Price per Token:", ethers.formatEther(info.priceInEth), "ETH");
console.log("Total Sold:", ethers.formatEther(info.totalSold));
console.log("Total Raised:", ethers.formatEther(info.totalRaised), "ETH");
console.log("Available:", ethers.formatEther(info.contractTokenBalance));
```

---

### 🎁 Airdrop Contract (GogogaTokenAirdrop)

#### Deploy Airdrop

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

#### Claim Airdrop

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

#### Check Claim Eligibility

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

#### Manage Airdrop (Owner Only)

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

### 🚰 Faucet Contract (GogogaTokenFaucet)

#### Deploy Faucet

```javascript
const tokenAddress = "0x..."; // Your GogogaToken address
const requestAmount = ethers.parseEther("10"); // 10 tokens per request
const cooldownTime = 24 * 60 * 60; // 24 hours cooldown

const Faucet = await ethers.getContractFactory("GogogaTokenFaucet");
const faucet = await Faucet.deploy(tokenAddress, requestAmount, cooldownTime);

// Fund the faucet
await gogogaToken.transfer(faucet.target, ethers.parseEther("100000"));
```

#### Request Tokens from Faucet

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

#### Fund the Faucet (Anyone)

```javascript
// Anyone can fund the faucet
const fundAmount = ethers.parseEther("1000");
await gogogaToken.approve(faucet.target, fundAmount);
await faucet.fundFaucet(fundAmount);
```

#### Manage Faucet (Owner Only)

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

#### Get Faucet Information

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

## 🔒 Security Features

### All Contracts

-   ✅ **OpenZeppelin Standards** - Built on audited, battle-tested contracts
-   ✅ **ReentrancyGuard** - Protection against reentrancy attacks (Sale, Airdrop, Faucet)
-   ✅ **Pausable** - Emergency stop mechanism for all contracts
-   ✅ **Custom Errors** - Gas-efficient error handling
-   ✅ **CEI Pattern** - Checks-Effects-Interactions pattern followed

### Token Contract

-   ✅ **Zero Address Protection** - Prevents minting to zero address
-   ✅ **Max Supply Cap** - Cannot mint beyond 1 billion tokens
-   ✅ **Emergency Pause** - Owner can halt all transfers

### Token Sale Contract

-   ✅ **Pull Payment Pattern** - Secure ETH withdrawal mechanism
-   ✅ **Purchase Limits** - Min/max amounts to prevent abuse
-   ✅ **Balance Checks** - Ensures sufficient token availability
-   ✅ **Token Rescue** - Recover accidentally sent ERC20 tokens

### Airdrop Contract

-   ✅ **Merkle Tree Verification** - Gas-efficient whitelist validation
-   ✅ **One-Time Claims** - Prevents double claiming
-   ✅ **Time Window Enforcement** - Optional start/end time validation
-   ✅ **Proof Verification** - Cryptographic claim validation

### Faucet Contract

-   ✅ **Time-Based Cooldown** - Prevents spam and abuse
-   ✅ **Claim Limits** - Optional maximum per address
-   ✅ **Balance Validation** - Ensures sufficient faucet balance
-   ✅ **ETH Rejection** - Prevents accidental ETH transfers

## 🛡️ Security Considerations

### For All Contracts

-   ⚠️ **Owner has significant privileges**. Ensure proper key management.
-   ⚠️ **Renouncing ownership is irreversible**. You won't be able to manage contracts afterwards.
-   ✅ **Consider multi-sig wallet** for owner address in production.
-   ✅ **Audit all contracts** before deploying to mainnet with real value.
-   ✅ **Test thoroughly** on testnets before mainnet deployment.

### Token Contract

-   ⚠️ **Max supply is hardcoded** at 1 billion tokens. Cannot be changed after deployment.
-   ⚠️ **Pausing affects all transfers** including transfers to/from exchanges.

### Token Sale Contract

-   ⚠️ **Immutable token address**. Cannot change the token being sold.
-   ⚠️ **Price updates affect future purchases** immediately.
-   ✅ **Always ensure contract has enough tokens** before making it public.
-   ✅ **Regularly withdraw ETH** to reduce funds at risk.

### Airdrop Contract

-   ⚠️ **Merkle tree generation is off-chain**. Keep the data secure.
-   ⚠️ **Users need correct merkle proofs** to claim. Provide easy access to proofs.
-   ⚠️ **Changing merkle root resets eligibility** - plan multi-round carefully.
-   ✅ **Set appropriate time windows** to control campaign duration.
-   ✅ **Double-check merkle tree generation** before deployment.

### Faucet Contract

-   ⚠️ **Open to public**. Bots may drain it quickly without proper cooldown.
-   ⚠️ **Set reasonable cooldown times** to balance accessibility and sustainability.
-   ✅ **Monitor faucet balance** and refund regularly.
-   ✅ **Consider setting max claim limits** to ensure fair distribution.

## 📁 Project Structure

```
contracts/
├── gogoga-token/
│   ├── GogogaToken.sol           # Main ERC20 token contract
│   ├── GogogaTokenSale.sol       # Token sale contract
│   ├── GogogaTokenAirdrop.sol    # Merkle-based airdrop contract
│   ├── GogogaTokenFaucet.sol     # Token faucet contract
│   └── README.md                 # This file
scripts/
├── deploy-gogoga-token.js        # Token deployment script
├── deploy-token-sale.js          # Sale deployment script (if exists)
├── deploy-airdrop.js             # Airdrop deployment script (if exists)
└── deploy-faucet.js              # Faucet deployment script (if exists)
test/
├── gogoga-token.test.js          # Token contract tests
├── token-sale.test.js            # Sale contract tests (if exists)
├── airdrop.test.js               # Airdrop contract tests (if exists)
└── faucet.test.js                # Faucet contract tests (if exists)
```

## 🧩 Contract Functions Reference

### 🪙 GogogaToken Functions

<details>
<summary><b>Owner Functions</b></summary>

| Function                              | Description                    |
| ------------------------------------- | ------------------------------ |
| `mint(address to, uint256 amount)`    | Mint new tokens to an address  |
| `pause()`                             | Pause all token transfers      |
| `unpause()`                           | Resume token transfers         |
| `transferOwnership(address newOwner)` | Transfer contract ownership    |
| `renounceOwnership()`                 | Renounce ownership permanently |

</details>

<details>
<summary><b>Public Functions</b></summary>

| Function                                                 | Description                     |
| -------------------------------------------------------- | ------------------------------- |
| `transfer(address to, uint256 amount)`                   | Transfer tokens                 |
| `approve(address spender, uint256 amount)`               | Approve spending allowance      |
| `transferFrom(address from, address to, uint256 amount)` | Transfer with allowance         |
| `burn(uint256 amount)`                                   | Burn your own tokens            |
| `burnFrom(address account, uint256 amount)`              | Burn tokens (requires approval) |

</details>

<details>
<summary><b>View Functions</b></summary>

| Function                                    | Description                  |
| ------------------------------------------- | ---------------------------- |
| `name()`                                    | Returns token name           |
| `symbol()`                                  | Returns token symbol         |
| `decimals()`                                | Returns decimal places (18)  |
| `totalSupply()`                             | Returns current total supply |
| `balanceOf(address account)`                | Returns balance of account   |
| `allowance(address owner, address spender)` | Returns spending allowance   |
| `MAX_SUPPLY()`                              | Returns maximum supply cap   |
| `owner()`                                   | Returns contract owner       |
| `paused()`                                  | Returns pause status         |

</details>

---

### 💰 GogogaTokenSale Functions

<details>
<summary><b>Public Functions</b></summary>

| Function       | Description                                    |
| -------------- | ---------------------------------------------- |
| `buyTokens()`  | Buy tokens with ETH (payable)                  |
| `fundFaucet()` | Anyone can fund the faucet (requires approval) |

</details>

<details>
<summary><b>Owner Functions</b></summary>

| Function                                         | Description                     |
| ------------------------------------------------ | ------------------------------- |
| `updateTokenPrice(uint256 newPrice)`             | Update token price in ETH       |
| `updatePurchaseLimits(uint256 min, uint256 max)` | Update min/max purchase amounts |
| `withdrawEth()`                                  | Withdraw collected ETH          |
| `withdrawRemainingTokens()`                      | Withdraw unsold tokens          |
| `rescueTokens(address tokenAddress)`             | Rescue accidentally sent tokens |
| `pause()` / `unpause()`                          | Pause/unpause token sales       |

</details>

<details>
<summary><b>View Functions</b></summary>

| Function                                      | Description                                 |
| --------------------------------------------- | ------------------------------------------- |
| `getContractInfo()`                           | Get comprehensive contract information      |
| `calculateTokenAmount(uint256 ethAmount)`     | Calculate tokens for given ETH amount       |
| `calculateEthAmount(uint256 tokenAmount)`     | Calculate ETH needed for given token amount |
| `saleToken()`                                 | Returns token address                       |
| `tokenPriceInEth()`                           | Returns current price                       |
| `totalTokensSold()` / `totalEthRaised()`      | Returns sale statistics                     |
| `minPurchaseAmount()` / `maxPurchaseAmount()` | Returns purchase limits                     |

</details>

---

### 🎁 GogogaTokenAirdrop Functions

<details>
<summary><b>Public Functions</b></summary>

| Function                                          | Description              |
| ------------------------------------------------- | ------------------------ |
| `claim(uint256 amount, bytes32[] calldata proof)` | Claim airdrop with proof |

</details>

<details>
<summary><b>Owner Functions</b></summary>

| Function                                       | Description                         |
| ---------------------------------------------- | ----------------------------------- |
| `updateMerkleRoot(bytes32 newRoot)`            | Update merkle root for new round    |
| `updateTimeWindow(uint256 start, uint256 end)` | Update airdrop time window          |
| `withdrawUnclaimedTokens()`                    | Withdraw unclaimed tokens after end |
| `pause()` / `unpause()`                        | Pause/unpause claiming              |

</details>

<details>
<summary><b>View Functions</b></summary>

| Function                                         | Description                           |
| ------------------------------------------------ | ------------------------------------- |
| `canClaim(address, uint256, bytes32[])`          | Check if address can claim            |
| `getAirdropInfo()`                               | Get comprehensive airdrop information |
| `getClaimStatus(address account)`                | Get claim status for address          |
| `hasClaimed(address)` / `claimedAmount(address)` | Check claim status                    |
| `merkleRoot()` / `startTime()` / `endTime()`     | Get airdrop parameters                |
| `totalClaimed()` / `totalClaimCount()`           | Get claim statistics                  |

</details>

---

### 🚰 GogogaTokenFaucet Functions

<details>
<summary><b>Public Functions</b></summary>

| Function                     | Description                |
| ---------------------------- | -------------------------- |
| `requestTokens()`            | Request tokens from faucet |
| `fundFaucet(uint256 amount)` | Fund faucet with tokens    |

</details>

<details>
<summary><b>Owner Functions</b></summary>

| Function                             | Description                     |
| ------------------------------------ | ------------------------------- |
| `setRequestAmount(uint256 amount)`   | Update request amount           |
| `setCooldownTime(uint256 time)`      | Update cooldown period          |
| `setMaxClaimPerAddress(uint256 max)` | Update max claim limit          |
| `withdrawTokens(uint256 amount)`     | Withdraw tokens from faucet     |
| `rescueTokens(address tokenAddress)` | Rescue accidentally sent tokens |
| `pause()` / `unpause()`              | Pause/unpause faucet            |

</details>

<details>
<summary><b>View Functions</b></summary>

| Function                                | Description                          |
| --------------------------------------- | ------------------------------------ |
| `canRequestTokens(address user)`        | Check if user can request now        |
| `getTimeUntilNextRequest(address user)` | Get cooldown time remaining          |
| `getRemainingClaimAmount(address user)` | Get remaining claimable amount       |
| `getFaucetInfo()`                       | Get comprehensive faucet information |
| `getUserInfo(address user)`             | Get user-specific information        |
| `requestAmount()` / `cooldownTime()`    | Get faucet parameters                |
| `totalDistributed()`                    | Get total tokens distributed         |

</details>

## 📝 License

MIT License

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Contact

For questions or support, please open an issue in the repository.

## 🚀 Deployment Workflow

### Recommended Deployment Order

1. **Deploy Token Contract**

    ```bash
    npx hardhat deploy-gogoga-token --network sepolia
    ```

2. **Deploy Token Sale Contract** (if needed)

    ```bash
    npx hardhat deploy-gogoga-token-sale --token 0x422e7D247664f7CFd5bA9025281e6705C6163F41 --price 0.0001 --fund 1000000 --network sepolia
    ```

    - Deploy with token address and initial price
    - Transfer tokens to sale contract
    - Test with small purchases first

3. **Deploy Airdrop Contract** (if needed)

    ```bash
    npx hardhat deploy-gogoga-token-airdrop --token 0x422e7D247664f7CFd5bA9025281e6705C6163F41 --fund 10000 --airdrop-file deployments/airdrop-list.json --network sepolia
    ```

    - Generate merkle tree off-chain
    - Deploy with merkle root and time window
    - Transfer tokens to airdrop contract
    - Publish merkle proofs for eligible addresses

4. **Deploy Faucet Contract** (if needed)

    ```bash
    npx hardhat deploy-gogoga-token-faucet --token 0x422e7D247664f7CFd5bA9025281e6705C6163F41 --amount 100 --cooldown 60 --fund 10000 --network sepolia
    ```

    - Deploy with token address, request amount, and cooldown
    - Transfer tokens to faucet contract
    - Share faucet address with community

## 📊 Gas Usage Estimates

| Operation           | Estimated Gas | Cost @ 30 gwei |
| ------------------- | ------------- | -------------- |
| Deploy Token        | ~2,500,000    | ~0.075 ETH     |
| Deploy Sale         | ~3,000,000    | ~0.090 ETH     |
| Deploy Airdrop      | ~2,800,000    | ~0.084 ETH     |
| Deploy Faucet       | ~2,600,000    | ~0.078 ETH     |
| Token Transfer      | ~50,000       | ~0.0015 ETH    |
| Buy Tokens          | ~80,000       | ~0.0024 ETH    |
| Claim Airdrop       | ~70,000       | ~0.0021 ETH    |
| Request from Faucet | ~60,000       | ~0.0018 ETH    |

_Note: Gas estimates are approximate and may vary based on network conditions._

## 🧪 Testing

All contracts include comprehensive test suites. Run tests with:

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

-   **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
-   **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
-   **Documentation**: This README and inline code comments

---

**⚠️ Disclaimer**: These contracts are provided as-is. Always perform a professional security audit before deploying to production with real value. The authors are not responsible for any losses incurred through the use of these contracts.
