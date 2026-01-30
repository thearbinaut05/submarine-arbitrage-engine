# 🚀 FlashArb Deployment & Arbitrage Execution Guide

## Overview

This guide provides step-by-step instructions to:
1. Deploy contracts to testnet (Sepolia) for safe testing
2. Execute a test arbitrage transaction
3. Deploy to mainnet for production use
4. Execute real arbitrage transactions

---

## ⚠️ Prerequisites

Before starting, ensure you have:
- [ ] Node.js >= 18.0.0 installed
- [ ] npm or bun package manager
- [ ] A wallet with ETH (testnet or mainnet)
- [ ] RPC URL (Alchemy/Infura) for the network
- [ ] Etherscan API key (for contract verification)

---

## 📦 Step 1: Install Dependencies

```bash
cd contracts
npm install
```

---

## 🔐 Step 2: Configure Environment Variables

### For Sepolia Testnet (Recommended First):

```bash
# Create .env file
cp .env.example .env

# Edit .env with your values:
# - DEPLOYER_PRIVATE_KEY: Your wallet private key (with 0x prefix)
# - SEPOLIA_RPC_URL: Sepolia RPC URL (from Alchemy/Infura)
# - ETHERSCAN_API_KEY: Etherscan API key
```

Example `.env`:
```env
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef...
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### Get Testnet ETH:
- Sepolia Faucet: https://sepoliafaucet.com/
- Or: https://faucet.sepolia.org/

---

## 🧪 Step 3: Testnet Deployment (Recommended First)

### Option A: Simple Deployment (Non-Upgradeable)
```bash
cd contracts
npx hardhat run scripts/deploy-all.ts --network sepolia
```

### Option B: Full Deployment with Execution
```bash
cd contracts
npx hardhat run scripts/deploy-and-execute.ts --network sepolia
```

### Expected Output:
```
🚀 FLASHARB DEPLOYMENT - Sepolia Testnet
============================================================

📍 Network: Sepolia (Chain ID: 11155111)
👛 Deployer: 0x...
💰 Balance: 0.1 ETH

📦 Deploying FlashArbExecutor...
   ✅ FlashArbExecutor deployed: 0x...
   📝 TX Hash: 0x...

📦 Deploying GaslessRelayer...
   ✅ GaslessRelayer deployed: 0x...
   📝 TX Hash: 0x...

📦 Deploying PositionRebalancer...
   ✅ PositionRebalancer deployed: 0x...
   📝 TX Hash: 0x...

⚙️  Configuring contracts...
   ✅ FlashArbExecutor authorized in GaslessRelayer

💾 Deployment saved to: deployments/sepolia.json

✅ DEPLOYMENT COMPLETE
============================================================
```

---

## 🔍 Step 4: Verify Contracts on Etherscan

```bash
cd contracts
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

---

## 💰 Step 5: Execute Test Arbitrage

### Option A: Via Script
```bash
cd contracts
npx hardhat run scripts/deploy-and-execute.ts --network sepolia
```

### Option B: Via Frontend
```bash
# In a separate terminal
cd ..
npm run dev

# Open http://localhost:5173
# Connect wallet
# Deploy contracts (if not already deployed)
# Execute arbitrage
```

---

## 🚀 Step 6: Mainnet Deployment (After Successful Testnet)

### ⚠️ Important: Ensure testnet was successful before proceeding!

```bash
cd contracts
npx hardhat run scripts/deploy-all.ts --network mainnet
```

### Expected Output:
```
🚀 FLASHARB DEPLOYMENT - Ethereum Mainnet
============================================================

📍 Network: Ethereum Mainnet (Chain ID: 1)
👛 Deployer: 0x...
💰 Balance: 1.0 ETH

📦 Deploying FlashArbExecutor...
   ✅ FlashArbExecutor deployed: 0x...
   📝 TX: https://etherscan.io/tx/0x...

📦 Deploying GaslessRelayer...
   ✅ GaslessRelayer deployed: 0x...
   📝 TX: https://etherscan.io/tx/0x...

📦 Deploying PositionRebalancer...
   ✅ PositionRebalancer deployed: 0x...
   📝 TX: https://etherscan.io/tx/0x...

💾 Deployment saved to: deployments/mainnet.json

✅ DEPLOYMENT COMPLETE
============================================================
```

---

## ⛽ Step 7: Fund GaslessRelayer for Gas Sponsorship

For gasless transactions, the GaslessRelayer contract needs ETH to sponsor gas:

```bash
# Send 0.5-1 ETH to GaslessRelayer
cast send <GASLESS_RELAYER_ADDRESS> --value 0.5ether --from <YOUR_ADDRESS>
```

View GaslessRelayer address in `deployments/mainnet.json`.

---

## 🎯 Step 8: Execute Mainnet Arbitrage

### Option A: Via Frontend
```bash
cd ..
npm run dev

# Open http://localhost:5173
# Connect wallet to mainnet
# Wait for arbitrage opportunities
# Click "Execute" on a profitable opportunity
```

### Option B: Direct Contract Call
```bash
# Execute flash loan directly
cast send <FLASH_ARB_EXECUTOR_ADDRESS> \
  "executeFlashLoan(address,uint256,bytes)" \
  <TOKEN_ADDRESS> \
  <AMOUNT> \
  <PARAMS> \
  --from <YOUR_ADDRESS>
```

---

## 📊 Monitoring & Verification

### View Deployment Status
```bash
cat contracts/deployments/sepolia.json
cat contracts/deployments/mainnet.json
```

### View Transaction on Etherscan
- FlashArbExecutor: `https://etherscan.io/address/<FLASH_ARB_ADDRESS>`
- GaslessRelayer: `https://etherscan.io/address/<GASLESS_ADDRESS>`
- PositionRebalancer: `https://etherscan.io/address/<REBALANCER_ADDRESS>`

### View Execution Results
```bash
cat contracts/deployments/sepolia-execution.json
cat contracts/deployments/mainnet-execution.json
```

---

## 🛠️ Troubleshooting

### Error: "Insufficient balance"
- Get more ETH from faucet (testnet) or purchase (mainnet)
- Minimum recommended: 0.1 ETH for testnet, 1.0 ETH for mainnet

### Error: "RPC connection failed"
- Check your RPC URL in .env
- Ensure API key is valid
- Try a different RPC provider

### Error: "Contract deployment failed"
- Check gas prices: `cast gas-price`
- Increase gas limit in hardhat.config.ts
- Try with higher gas price

### Error: "Verification failed"
- Verify Etherscan API key is correct
- Try manual verification on Etherscan website

---

## 📝 Contract Addresses Reference

### Mainnet Addresses (After Deployment)
```
FlashArbExecutor:    0x...
GaslessRelayer:      0x...
PositionRebalancer:  0x...
```

### Sepolia Testnet Addresses (After Deployment)
```
FlashArbExecutor:    0x...
GaslessRelayer:      0x...
PositionRebalancer:  0x...
```

---

## 🔒 Security Notes

1. **Never share your private key**
2. **Use a dedicated deployment wallet**
3. **Test on testnet first**
4. **Start with small amounts**
5. **Monitor contracts after deployment**
6. **Set up alerts for contract interactions**

---

## 📚 Additional Resources

- **Hardhat Documentation**: https://hardhat.org/docs
- **Etherscan**: https://etherscan.io/
- **Aave V3**: https://docs.aave.com/developers/
- **Uniswap V3**: https://docs.uniswap.org/
- **Gelato Relay**: https://relay.gelato.network/

---

## ✅ Quick Command Reference

```bash
# Install dependencies
cd contracts && npm install

# Deploy to testnet
npx hardhat run scripts/deploy-all.ts --network sepolia

# Deploy with execution (testnet)
npx hardhat run scripts/deploy-and-execute.ts --network sepolia

# Deploy to mainnet
npx hardhat run scripts/deploy-all.ts --network mainnet

# Deploy with execution (mainnet)
npx hardhat run scripts/deploy-and-execute.ts --network mainnet

# Verify contracts
npx hardhat verify --network sepolia <ADDRESS>
npx hardhat verify --network mainnet <ADDRESS>

# Start frontend
cd .. && npm run dev

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

---

## 🎉 Success Checklist

After deployment and execution, verify:

- [ ] Contracts deployed successfully
- [ ] Contract addresses saved
- [ ] Contracts verified on Etherscan
- [ ] GaslessRelayer funded with ETH
- [ ] Test arbitrage executed (testnet)
- [ ] Mainnet arbitrage executed (mainnet)
- [ ] Transaction hashes recorded
- [ ] Profits realized

---

**⚠️ Remember: Always test on testnet first before deploying to mainnet!**

