# FlashArb Mainnet Runbook

## Quick Start Guide

This runbook provides step-by-step instructions to get the FlashArb arbitrage engine running on Ethereum mainnet with gasless transactions.

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ and npm/yarn
- [ ] A wallet with ≥0.5 ETH for deployment
- [ ] Alchemy or Infura API key (for reliable RPC)
- [ ] Gelato API key (get from https://relay.gelato.network/)
- [ ] Etherscan API key (for contract verification)
- [ ] Supabase project (free tier works)

## Step 1: Environment Setup

### 1.1 Create Environment File

```bash
# Copy the example file
cp .env.mainnet.example .env.mainnet

# Edit with your values
nano .env.mainnet
```

Required environment variables:
```env
# RPC Endpoints (use Alchemy or Infura for reliability)
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Deployment wallet (NEVER use a wallet with real funds for development!)
DEPLOYER_PRIVATE_KEY=0x...

# Gelato for gasless transactions
GELATO_API_KEY=your_gelato_api_key

# Etherscan for verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Contract addresses (will be filled after deployment)
VITE_FLASH_ARB_ADDRESS=
VITE_GASLESS_RELAYER_ADDRESS=
```

### 1.2 Install Dependencies

```bash
# Install project dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..
```

## Step 2: Supabase Setup

### 2.1 Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your project URL and anon key

### 2.2 Run Database Migration

Run the SQL migration in Supabase SQL Editor:

```bash
# Copy the contents of supabase/migrations/20240201000000_flasharb_mainnet.sql
# and execute in Supabase SQL Editor
```

Or use the Supabase CLI:
```bash
supabase db push
```

### 2.3 Deploy Edge Functions

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy scan-opportunities
supabase functions deploy execute-flash-loan
supabase functions deploy gasless-relay
supabase functions deploy rebalance-positions
```

### 2.4 Set Environment Variables in Supabase

```bash
supabase secrets set GELATO_API_KEY=your_gelato_api_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Deploy Smart Contracts

### 3.1 Compile Contracts

```bash
cd contracts
npx hardhat compile
```

### 3.2 Deploy to Mainnet

```bash
npx hardhat run scripts/deploy-mainnet.ts --network mainnet
```

This will:
1. Deploy PositionRebalancer (UUPS Proxy)
2. Deploy GaslessRelayer (UUPS Proxy)
3. Deploy FlashArbExecutor (UUPS Proxy)
4. Authorize FlashArbExecutor in GaslessRelayer
5. Save deployment info to `contracts/deployments/mainnet.json`

### 3.3 Verify Contracts on Etherscan

```bash
# Verify all contracts
npx hardhat verify --network mainnet \
  --constructor-args <args> \
  <contract-address>

# Or use the deployment info
npx hardhat verify --network mainnet \
  $(cat deployments/mainnet.json | jq -r '.flashArbExecutor')
```

## Step 4: Configure Frontend

### 4.1 Update Environment Variables

Copy the generated frontend environment:

```bash
# From deployment output
export VITE_FLASH_ARB_ADDRESS=<deployed-address>
export VITE_GASLESS_RELAYER_ADDRESS=<deployed-address>
export VITE_POSITION_REBALANCER_ADDRESS=<deployed-address>
```

Or update `.env` directly:
```env
VITE_FLASH_ARB_ADDRESS=0x...
VITE_GASLESS_RELAYER_ADDRESS=0x...
VITE_POSITION_REBALANCER_ADDRESS=0x...
```

### 4.2 Build Frontend

```bash
npm run build
```

### 4.3 Start Development Server

```bash
npm run dev
```

## Step 5: Test on Mainnet

### 5.1 Fund the GaslessRelayer Contract

The Gelato relayer needs ETH to pay for gas:

```bash
cast send <GASLESS_RELAYER_ADDRESS> \
  --value 0.5ether \
  --from <DEPLOYER_ADDRESS>
```

### 5.2 Connect Wallet

1. Open the application in browser
2. Connect MetaMask
3. Switch to Ethereum mainnet
4. Ensure wallet is funded with small amount of ETH

### 5.3 Start Scanning

1. Configure scanner settings:
   - Min Profit: 0.1%
   - Min Profit USD: $10
   - Networks: Ethereum
   
2. Click "Start Scanning"
3. Wait for opportunities to appear

### 5.4 Execute First Arbitrage

1. Select an opportunity with high confidence
2. Click "Execute"
3. Approve the transaction in wallet
4. Wait for Gelato to execute (check Supabase for status)

## Step 6: Monitor & Debug

### 6.1 Check Transaction Status

```sql
-- Query in Supabase SQL Editor
SELECT * FROM transactions 
WHERE hash = '<task-id>' 
ORDER BY created_at DESC;
```

### 6.2 View Logs

Check browser console for execution logs:
- `Gelato API error:` - Gelato relay failed
- `Transaction reverted:` - Smart contract error
- `Insufficient output:` - Price moved during execution

### 6.3 Common Issues

| Issue | Solution |
|-------|----------|
| No opportunities found | Increase min profit threshold |
| Transactions failing | Check gas limits and slippage |
| Gelato errors | Verify API key and balance |
| Scanner timeout | Use faster RPC (Alchemy/Infura) |

## Step 7: Production Checklist

Before running with real funds:

- [ ] Contracts verified on Etherscan
- [ ] GaslessRelayer funded with ≥0.5 ETH
- [ ] Slippage configured appropriately
- [ ] Alerting set up (Telegram/webhooks)
- [ ] Monitoring dashboard active
- [ ] Tested with small amounts (<$100)
- [ ] Audit completed (recommended)

## Troubleshooting

### Gelato API Errors
```
Error: Gelato API error: 401 Unauthorized
```
→ Check your GELATO_API_KEY in environment variables

### Contract Execution Failed
```
Error: Transaction reverted
```
→ Check if GaslessRelayer has ETH balance
→ Verify contract addresses are correct

### No Opportunities Found
- Scanner may not find profitable opportunities (normal in low-volatility periods)
- Try different token pairs
- Check RPC connectivity

## Security Best Practices

1. **Never** use a hot wallet with large funds
2. **Always** test with small amounts first
3. **Monitor** contract balances regularly
4. **Set up** alerts for unusual activity
5. **Keep** private keys in environment variables only

## Support

- GitHub Issues: Report bugs and feature requests
- Discord: Community support
- Telegram: Real-time alerts (configure in .env)

## Estimated Costs

| Item | Cost |
|------|------|
| Contract Deployment | ~1-2 ETH |
| Gasless Relay (per tx) | Covered by Gelato |
| Supabase (free tier) | $0 |
| RPC (Alchemy free tier) | $0 |

