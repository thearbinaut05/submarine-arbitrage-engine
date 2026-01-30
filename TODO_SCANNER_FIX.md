# Scanner Fix Plan - Real Arbitrage Detection

## API Keys Configuration
- Alchemy API Key: KAaHi6hhiAI8Dd7IuyPVz
- Gelato API Key: Z768H6BfKm7GySe3CR_BqcgrIhKD1BMfWWxykyEi_tM

## Issues Identified
1. `useArbitrageScanner.ts` uses FAKE mock data instead of real scanning
2. `useRealArbitrage.ts` simulates prices instead of querying on-chain data
3. `scan-opportunities/index.ts` has typos in token addresses and uses simulation
4. Missing proper RPC provider configuration

## Fix Steps

### Step 1: Fix useRealArbitrage.ts
- [ ] Add real Alchemy RPC endpoints for all networks
- [ ] Implement actual on-chain price fetching from DEX contracts
- [ ] Query Uniswap V3/SushiSwap pool reserves
- [ ] Calculate real price differences between DEXs
- [ ] Add proper error handling and retry logic

### Step 2: Fix scan-opportunities/index.ts
- [ ] Fix token address typos (DAI address has a typo)
- [ ] Integrate with 1inch aggregator API
- [ ] Implement real price discovery
- [ ] Add Gelato API integration

### Step 3: Add DEX Contract ABIs
- [ ] Add Uniswap V2/V3 router and factory ABIs
- [ ] Add SushiSwap router ABIs
- [ ] Add multicall for batch queries

### Step 4: Lower Scanner Thresholds for Testing
- [ ] Set minProfitPercent to 0.1% (was 0.5%)
- [ ] Set minProfitUsd to $10 (was $50)
- [ ] Reduce scan interval to 3 seconds

## Networks to Support
- Ethereum (mainnet)
- Arbitrum
- Polygon
- BSC

## Target DEXs
- Uniswap V2/V3
- SushiSwap
- QuickSwap (Polygon)
- PancakeSwap (BSC)

