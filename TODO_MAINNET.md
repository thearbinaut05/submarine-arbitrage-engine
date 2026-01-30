# Mainnet Deployment Progress

## ✅ Completed Tasks

### Phase 1: Environment Setup
- [x] Created `.env.mainnet.example` with all required variables
- [] Configure RPC endpoints (user to fill in)
- [ ] Set up Gelato API key (user to fill in)
- [ ] Configure Etherscan API keys (user to fill in)
- [ ] Set Supabase credentials (user to fill in)

### Phase 2: Smart Contract Updates
- [x] Updated `FlashArbExecutor.sol` with UUPS upgradeable pattern
- [x] Updated `GaslessRelayer.sol` with UUPS upgradeable pattern
- [x] Updated `contracts/package.json` with OpenZeppelin upgrades
- [x] Updated `contracts/hardhat.config.ts` with upgrades plugin
- [x] Created `contracts/scripts/deploy-mainnet.ts` deployment script

### Phase 3: Supabase Database
- [x] Created `supabase/migrations/20240201000000_flasharb_mainnet.sql` migration
- [x] Includes tables for opportunities, transactions, positions
- [x] Includes RLS policies for security
- [x] Includes Gelato webhook handler

### Phase 4: Frontend Updates
- [x] Updated `src/hooks/useRealArbitrage.ts` for gasless execution
- [x] Added proper contract address handling
- [x] Added submarine transaction support

### Phase 5: Documentation
- [x] Created `MAINNET_DEPLOYMENT.md` with overview
- [x] Created `MAINNET_RUNBOOK.md` with step-by-step guide
- [x] Created `TODO_MAINNET.md` with task breakdown

## 📝 Remaining Tasks (User Action Required)

### 1. Fill in Environment Variables
```bash
cp .env.mainnet.example .env.mainnet
# Edit .env.mainnet with your values
```

### 2. Install Dependencies
```bash
cd contracts && npm install && cd ..
npm install
```

### 3. Configure Supabase
1. Create Supabase project at https://supabase.com
2. Run migration SQL in Supabase SQL Editor
3. Deploy edge functions

### 4. Deploy Contracts
```bash
cd contracts
npx hardhat run scripts/deploy-mainnet.ts --network mainnet
```

### 5. Update Frontend
```bash
# Copy deployment addresses to .env
export VITE_FLASH_ARB_ADDRESS=<deployed-address>
export VITE_GASLESS_RELAYER_ADDRESS=<deployed-address>

npm run build
npm run dev
```

## 🚀 Quick Start Commands

```bash
# 1. Setup environment
cp .env.mainnet.example .env.mainnet
# Edit .env.mainnet with your API keys

# 2. Install dependencies
cd contracts && npm install
cd .. && npm install

# 3. Deploy contracts
cd contracts
npx hardhat run scripts/deploy-mainnet.ts --network mainnet

# 4. Build and start frontend
cd ..
npm run build
npm run dev
```

## 📁 Key Files Created/Modified

| File | Purpose |
|------|---------|
| `.env.mainnet.example` | Environment template |
| `contracts/FlashArbExecutor.sol` | Updated UUPS contract |
| `contracts/GaslessRelayer.sol` | Updated UUPS contract |
| `contracts/scripts/deploy-mainnet.ts` | Deployment script |
| `contracts/package.json` | Added upgrades plugin |
| `contracts/hardhat.config.ts` | Added upgrades plugin |
| `supabase/migrations/*.sql` | Database migration |
| `src/hooks/useRealArbitrage.ts` | Gasless execution |
| `MAINNET_RUNBOOK.md` | Complete runbook |

## ⚠️ Before Running on Mainnet

1. [ ] Test on Sepolia testnet first
2. [ ] Verify contracts on Etherscan
3. [ ] Fund GaslessRelayer with ETH for gas sponsorship
4. [ ] Start with small amounts (<$100)
5. [ ] Set up monitoring and alerts
6. [ ] Complete security audit (recommended)

## 🔗 Useful Links

- Gelato Relay: https://relay.gelato.network/
- Supabase: https://supabase.com
- Alchemy API: https://www.alchemy.com/
- Etherscan: https://etherscan.io/

