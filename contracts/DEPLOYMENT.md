# FlashArb Contract Deployment Guide

## Quick Start

### 1. Install Dependencies
```bash
cd contracts
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your private key and API keys
```

### 3. Deploy

#### Option A: Standard Deployment (requires ETH for gas)
```bash
# Deploy to mainnet
npm run deploy:mainnet

# Deploy to Arbitrum
npm run deploy:arbitrum

# Deploy to Polygon
npm run deploy:polygon

# Deploy to BSC
npm run deploy:bsc
```

#### Option B: Gasless Deployment (via Gelato - no ETH needed!)
```bash
# Set your Gelato API key in .env first
# Get one free at: https://app.gelato.network/

npm run deploy:gasless:mainnet
npm run deploy:gasless:arbitrum
npm run deploy:gasless:polygon
```

### 4. Verify Contracts
```bash
npm run verify -- --network mainnet
```

### 5. Update Edge Functions
```bash
npx ts-node scripts/configure-edge-functions.ts
```

This generates the contract addresses config for your Lovable edge functions.

---

## Deployed Contract Addresses

After deployment, addresses are saved to `deployments/<network>.json`

### Mainnet
- FlashArbExecutor: `<deployed-address>`
- GaslessRelayer: `<deployed-address>`
- PositionRebalancer: `<deployed-address>`

### Arbitrum
- FlashArbExecutor: `<deployed-address>`
- GaslessRelayer: `<deployed-address>`
- PositionRebalancer: `<deployed-address>`

---

## Security Checklist

Before using in production:

- [ ] Audit all contracts
- [ ] Test on testnet first (Goerli, Sepolia)
- [ ] Set appropriate access controls
- [ ] Configure emergency pause
- [ ] Set up monitoring (Tenderly, OpenZeppelin Defender)
- [ ] Start with small amounts
- [ ] Have incident response plan

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Lovable Frontend                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Edge Functions                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ execute-     │  │ gasless-     │  │ rebalance-       │  │
│  │ flash-loan   │  │ relay        │  │ positions        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   Smart Contracts                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ FlashArb     │  │ Gasless      │  │ Position         │  │
│  │ Executor     │  │ Relayer      │  │ Rebalancer       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    DeFi Protocols                            │
│  ┌────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐    │
│  │ Aave   │  │ Uniswap   │  │ Sushiswap│  │ Others    │    │
│  │ V3     │  │ V3        │  │          │  │           │    │
│  └────────┘  └───────────┘  └──────────┘  └───────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Gelato Gasless Setup

1. Go to [Gelato Network](https://app.gelato.network/)
2. Create an account
3. Get your API key from the dashboard
4. Add credits to your account (or use their free tier)
5. Set `GELATO_API_KEY` in your `.env`

Gelato sponsors the gas for your transactions, so your deployer wallet doesn't need ETH!

---

## Troubleshooting

### "Insufficient balance"
- Standard deployment needs ~0.1 ETH for all contracts
- Use gasless deployment instead

### "Transaction underpriced"
- Increase gas price in hardhat.config.ts
- Or wait for lower network congestion

### "Contract already verified"
- This is fine - contract is already on Etherscan

### Gelato task stuck
- Check task status at https://relay.gelato.network/
- Ensure you have Gelato credits
