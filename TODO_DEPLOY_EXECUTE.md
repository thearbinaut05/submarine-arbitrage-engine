# TODO: Deploy Contracts and Execute Arbitrage

## Phase 1: Environment Setup ✅ (Already Done)
- [x] Contracts are implemented (FlashArbExecutor, GaslessRelayer, PositionRebalancer)
- [x] Deployment scripts are ready
- [x] Network configuration is configured

## Phase 2: Create Environment Configuration
**Need user to create `.env.mainnet` with:**
- [ ] DEPLOYER_PRIVATE_KEY (for deployment wallet)
- [ ] MAINNET_RPC_URL (Alchemy/Infura RPC)
- [ ] SEPOLIA_RPC_URL (for testnet deployment)
- [ ] ETHERSCAN_API_KEY (for verification)

## Phase 3: Deploy to Sepolia Testnet (Safe Testing)
**Commands to run:**
```bash
cd contracts
npm install  # Ensure dependencies are installed
npx hardhat run scripts/deploy-all.ts --network sepolia
```

**Expected Output:**
- FlashArbExecutor address
- GaslessRelayer address
- PositionRebalancer address
- Transaction hashes

## Phase 4: Execute Test Arbitrage on Sepolia
**Steps:**
1. Get testnet ETH from faucet
2. Set up test tokens (if needed)
3. Execute flash loan arbitrage via frontend or script
4. Record transaction hash

## Phase 5: Deploy to Mainnet (After successful testnet)
**Commands to run:**
```bash
cd contracts
npx hardhat run scripts/deploy-all.ts --network mainnet
```

**Expected Output:**
- Mainnet contract addresses
- Etherscan verification links

## Phase 6: Execute Mainnet Arbitrage
**Steps:**
1. Fund contracts with ETH for gas
2. Execute first arbitrage transaction
3. Record and verify transaction

## Current File Status

| File | Status |
|------|--------|
| FlashArbExecutor.sol | ✅ Ready |
| GaslessRelayer.sol | ✅ Ready |
| PositionRebalancer.sol | ✅ Ready |
| deploy-all.ts | ✅ Ready |
| deploy-mainnet.ts | ✅ Ready (UUPS version) |
| config.ts | ✅ Ready |
| hardhat.config.ts | ✅ Ready |

## ⚠️ Before Running

1. **Install dependencies:**
   ```bash
   cd contracts && npm install
   ```

2. **Configure environment:**
   ```bash
   # Copy example and fill in your values
   cp .env.example .env.mainnet
   # Edit .env.mainnet with your RPC URL and private key
   ```

3. **Get testnet ETH:**
   - Sepolia faucet: https://sepoliafaucet.com/
   - Or: https://faucet.sepolia.org/

## 🚀 Quick Start (After .env is configured)

```bash
# 1. Deploy to Sepolia testnet
cd contracts
npx hardhat run scripts/deploy-all.ts --network sepolia

# 2. If successful, deploy to mainnet
npx hardhat run scripts/deploy-all.ts --network mainnet

# 3. Execute arbitrage transaction
# (via frontend or custom execution script)
```

## 📝 Notes

- **Test First**: Always test on Sepolia before mainnet
- **Gas Costs**: Mainnet deployment costs ~1.1 ETH total
- **Security**: Review contracts before deploying real funds
- **Verification**: Run `npm run verify` after deployment

