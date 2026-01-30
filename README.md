# FlashArb Arbitrage Engine - Complete Implementation

## Overview
A production-ready DeFi arbitrage trading terminal that scans for and executes profitable arbitrage opportunities across multiple blockchain networks using flash loans.

## Features Implemented

### 1. Multi-Network Support
- **Ethereum Mainnet** - Primary network with `https://eth.llamarpc.com` RPC
- **Arbitrum** - Layer 2 scaling solution
- **Polygon** - Ethereum sidechain
- **BSC** - Binance Smart Chain

### 2. Real-Time Balance Fetching
- Connected wallet balances displayed via RPC (`https://eth.llamarpc.com`)
- Auto-refresh every 30 seconds
- Manual refresh capability
- ERC-20 token balance detection for:
  - WETH, USDC, USDT, DAI
  - WBTC, LINK, UNI, AAVE

### 3. Arbitrage Scanning
- Real-time opportunity detection across DEXs
- Support for Uniswap V3, SushiSwap, PancakeSwap, QuickSwap
- Configurable profit thresholds
- Auto-execute high-confidence opportunities

### 4. Transaction Execution
- Flash loan execution via smart contracts
- Gasless transactions via Gelato Relay
- MEV protection with submarine transactions
- Multi-step arbitrage routes

## Project Structure

```
submarine-arbitrage-engine/
├── src/
│   ├── hooks/
│   │   ├── useWallet.ts          # Wallet connection + balance fetching
│   │   ├── useRealArbitrage.ts   # Real arbitrage scanning & execution
│   │   └── useArbitrageScanner.ts # Mock scanner (fallback)
│   ├── components/
│   │   ├── terminal/
│   │   │   ├── Header.tsx        # App header with wallet status
│   │   │   ├── WalletButton.tsx  # Wallet dropdown with balances
│   │   │   ├── ScannerControls.tsx # Scanner configuration
│   │   │   ├── OpportunityList.tsx
│   │   │   └── DashboardStats.tsx
│   │   └── ui/                   # shadcn/ui components
│   ├── pages/
│   │   └── Index.tsx             # Main dashboard
│   └── types/
│       ├── chains.ts             # Chain configurations
│       └── defi.ts               # TypeScript interfaces
├── contracts/
│   ├── FlashArbExecutor.sol      # Main arbitrage contract
│   ├── GaslessRelayer.sol        # Meta-transaction support
│   └── PositionRebalancer.sol    # Position management
└── supabase/
    └── functions/
        ├── deploy-contracts/     # Contract deployment
        ├── execute-flash-loan/   # Flash loan execution
        └── scan-opportunities/   # Opportunity scanning
```

## RPC Endpoints Configuration

### Ethereum (Primary)
```
https://eth.llamarpc.com
```
This is the main RPC endpoint used for:
- Wallet balance fetching
- Token balance queries
- Transaction signing
- Network state queries

### Supported Networks
| Network | RPC URL | Chain ID |
|---------|---------|----------|
| Ethereum | https://eth.llamarpc.com | 1 |
| Arbitrum | https://arb1.arbitrum.io/rpc | 42161 |
| Polygon | https://polygon-rpc.com | 137 |
| BSC | https://bsc-dataseed.binance.org | 56 |

## Usage

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Connect Wallet
1. Click "Connect Wallet" button
2. Approve in MetaMask/wallet
3. Select network

### 5. Start Arbitrage Scanner
1. Configure networks to scan
2. Set profit thresholds
3. Click "Start" to begin scanning
4. Execute profitable opportunities

## Smart Contract Deployment

### Standard Deployment
```bash
cd contracts
npm install
npx hardhat run scripts/deploy-all.ts --network mainnet
```

### Gasless Deployment (via Gelato)
```bash
# Set GELATO_API_KEY in .env first
npx hardhat run scripts/deploy-gasless-all.ts --network mainnet
```

## Contract Addresses

After deployment, contracts will be available at:

### Ethereum Mainnet
- FlashArbExecutor: `0x...`
- GaslessRelayer: `0x...`
- PositionRebalancer: `0x...`

### Arbitrum
- FlashArbExecutor: `0x...`
- GaslessRelayer: `0x...`
- PositionRebalancer: `0x...`

## Security Considerations

⚠️ **Important before mainnet use:**

1. Complete full security audit
2. Test extensively on testnets (Sepolia, Arbitrum Sepolia)
3. Implement proper access controls
4. Set up monitoring and alerts
5. Start with small amounts
6. Have emergency pause mechanisms
7. Configure proper slippage limits
8. Set up MEV protection

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Wallet      │  │ Scanner      │  │ Dashboard        │  │
│  │ Connection  │  │ Controls     │  │ Stats            │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼─────────────────┼───────────────────┼────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     useWallet Hook                           │
│  • Connect via window.ethereum                               │
│  • Fetch balances via https://eth.llamarpc.com               │
│  • Auto-refresh every 30s                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Edge Functions                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ execute-     │  │ gasless-     │  │ rebalance-       │  │
│  │ flash-loan   │  │ relay        │  │ positions        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Smart Contracts    │  │  DeFi Protocols     │
│  • FlashArbExecutor │  │  • Aave V3          │
│  • GaslessRelayer   │  │  • Uniswap V3       │
│  • PositionRebalancer│  │  • SushiSwap        │
└─────────────────────┘  └─────────────────────┘
```

## Dependencies

- **React 18** - UI framework
- **ethers v6** - Ethereum library
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Supabase** - Backend/Edge Functions
- **Hardhat** - Smart contract development

## Troubleshooting

### "No wallet detected"
- Install MetaMask or another Web3 wallet
- Refresh the page

### "Insufficient balance"
- Fund wallet with native token (ETH, MATIC, BNB)
- For gasless transactions, add credits to Gelato

### "RPC connection failed"
- Check internet connection
- Try alternative RPC endpoint
- Wait and retry

### "Transaction reverted"
- Check slippage settings
- Ensure sufficient gas limit
- Verify contract addresses

## License

MIT License

