# 🚀 FlashArb - Deployment & Execution Summary

## Quick Start

### 1. Configure Environment
```bash
# Edit .env file with your API keys
cd contracts
cp .env.example .env
# Edit .env with:
# - DEPLOYER_PRIVATE_KEY
# - SEPOLIA_RPC_URL or MAINNET_RPC_URL
# - ETHERSCAN_API_KEY
```

### 2. Deploy to Testnet (Recommended First)
```bash
# Option A: Using the automated script
chmod +x ../deploy-arbitrage.sh
../deploy-arbitrage.sh

# Option B: Direct Hardhat command
npx hardhat run scripts/deploy-and-execute.ts --network sepolia
```

### 3. Deploy to Mainnet (After Successful Testnet)
```bash
./deploy-arbitrage.sh mainnet
# OR
npx hardhat run scripts/deploy-and-execute.ts --network mainnet
```

---

## 📁 Created Files

### Scripts
| File | Purpose |
|------|---------|
| `contracts/scripts/deploy-all.ts` | Simple contract deployment |
| `contracts/scripts/deploy-mainnet.ts` | UUPS upgradeable deployment |
| `contracts/scripts/deploy-and-execute.ts` | Deployment + execution script |
| `deploy-arbitrage.sh` | Automated shell script |

### Documentation
| File | Purpose |
|------|---------|
| `EXECUTION_GUIDE.md` | Complete step-by-step guide |
| `ARBITRAGE_PLAN.md` | Detailed plan with costs |
| `TODO_DEPLOY_EXECUTE.md` | Task checklist |

---

## 📋 Deployment Commands

### Testnet (Sepolia)
```bash
# Install dependencies
cd contracts && npm install

# Simple deployment
npx hardhat run scripts/deploy-all.ts --network sepolia

# Full deployment with execution
npx hardhat run scripts/deploy-and-execute.ts --network sepolia

# With npm script
npm run deploy:sepolia
npm run deploy:execute:sepolia
```

### Mainnet
```bash
# Simple deployment
npx hardhat run scripts/deploy-all.ts --network mainnet

# Full deployment with execution
npx hardhat run scripts/deploy-and-execute.ts --network mainnet

# With npm script
npm run deploy:mainnet
npm run deploy:execute:mainnet
```

---

## 🔐 Environment Variables

Create `.env` file in `contracts/` directory:

```env
# Required
DEPLOYER_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef12345678
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Optional (for verification)
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
ARBISCAN_API_KEY=YOUR_ARBISCAN_API_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_API_KEY

# Optional
COINMARKETCAP_API_KEY=YOUR_COINMARKETCAP_API_KEY
```

---

## 📊 Expected Output

### Deployment Success
```
🚀 FLASHARB DEPLOYMENT - Sepolia Testnet
============================================================

📍 Network: Sepolia Testnet (Chain ID: 11155111)
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

## 🎯 Execution Flow

```
1. Environment Setup
   ├── Install dependencies
   ├── Configure .env
   └── Get testnet ETH

2. Contract Deployment
   ├── Deploy PositionRebalancer (UUPS Proxy)
   ├── Deploy GaslessRelayer (UUPS Proxy)
   ├── Deploy FlashArbExecutor (UUPS Proxy)
   └── Authorize FlashArbExecutor

3. Configuration
   ├── Set authorized executor
   └── Save deployment addresses

4. Arbitrage Execution
   ├── Scan for opportunities
   ├── Execute flash loan
   └── Record transaction

5. Verification
   ├── Verify on Etherscan
   ├── Test frontend
   └── Monitor results
```

---

## 💰 Costs

### Testnet (Sepolia)
- Free (from faucets)
- No real cost

### Mainnet (Ethereum)
| Item | Estimated Cost |
|------|----------------|
| Contract Deployment | ~1.1 ETH |
| FlashArbExecutor | ~0.5 ETH |
| GaslessRelayer | ~0.3 ETH |
| PositionRebalancer | ~0.3 ETH |
| Verification | ~1-2 ETH |

---

## 📈 Contract Addresses

After deployment, addresses are saved to:
- `contracts/deployments/sepolia.json`
- `contracts/deployments/mainnet.json`

Format:
```json
{
  "network": "sepolia",
  "deployer": "0x...",
  "timestamp": 1234567890,
  "flashArbExecutor": "0x...",
  "gaslessRelayer": "0x...",
  "positionRebalancer": "0x...",
  "txHashes": {
    "flashArbExecutor": "0x...",
    "gaslessRelayer": "0x...",
    "positionRebalancer": "0x..."
  }
}
```

---

## 🔗 Useful Links

### Etherscan
- Mainnet: https://etherscan.io/
- Sepolia: https://sepolia.etherscan.io/

### Faucets
- Sepolia: https://sepoliafaucet.com/
- Sepolia: https://faucet.sepolia.org/

### RPC Providers
- Alchemy: https://www.alchemy.com/
- Infura: https://infura.io/
- LlamaRPC: https://llamarpc.com/

---

## 🛠️ Troubleshooting

### Error: "Insufficient balance"
```bash
# Get testnet ETH from faucet
# Or purchase for mainnet
cast gas-price  # Check current gas prices
```

### Error: "RPC connection failed"
```bash
# Verify RPC URL in .env
# Check API key validity
# Try different RPC provider
```

### Error: "Contract deployment failed"
```bash
# Check gas prices
cast gas-price
# Increase gas limit in hardhat.config.ts
```

---

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Testnet ETH obtained
- [ ] Contracts deployed
- [ ] Contracts verified
- [ ] Test arbitrage executed
- [ ] Mainnet deployed (if ready)
- [ ] Mainnet arbitrage executed

---

## 📞 Next Steps

1. **Read the full guide**: `EXECUTION_GUIDE.md`
2. **Configure environment**: Edit `.env` file
3. **Deploy to testnet**: `npm run deploy:sepolia`
4. **Test and verify**: Check contracts on Etherscan
5. **Deploy to mainnet**: `npm run deploy:mainnet`
6. **Execute arbitrage**: Via frontend or scripts

---

**⚠️ Important: Always test on testnet first before deploying to mainnet!**

**🔐 Security: Never share your private keys. Use a dedicated deployment wallet.**

---

## 🚀 Submarine Transactions (Gasless)

### What are Submarine Transactions?
Submarine transactions use a commit-reveal scheme to hide transaction details until execution, providing MEV protection while allowing gasless execution via Gelato Relay.

### Configuration
The project uses Gelato's official relay address for mainnet submarine transactions:
- **Gelato Relay v2**: `0x27e4D5a5c6De0065F90fDa5Da0bA5f1dB39D8b8f`

### Execute Submarine Arbitrage
```bash
# Deploy to mainnet first, then execute submarine arbitrage
npx hardhat run scripts/deploy-and-execute.ts --network mainnet

# Or execute submarine transactions separately
npx hardhat run scripts/execute-submarine.ts --network mainnet
```

### Submarine Transaction Flow
1. **Commit**: User submits hash commitment of transaction
2. **Reveal**: User reveals transaction details with signature
3. **Execute**: GaslessRelayer executes transaction (gas sponsored by Gelato)

