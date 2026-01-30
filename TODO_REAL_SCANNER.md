# Real Arbitrage Scanner Implementation Plan

## Goal: Replace mock/simulated data with real on-chain price discovery

## Implementation Status: ✅ COMPLETED

### Phase 1: Add DEX Contract ABIs ✅
- [x] Created `src/lib/dex/abis.ts` with Uniswap V2/V3, SushiSwap, PancakeSwap, QuickSwap ABIs
- [x] Added multicall ABI for batch queries
- [x] Added ERC-20 ABI for token decimals

### Phase 2: Create On-Chain Price Fetcher ✅
- [x] Created `src/lib/dex/priceFetcher.ts`
- [x] Implemented pool reserve querying via RPC
- [x] Implemented Uniswap V2 price calculation from reserves
- [x] Implemented Uniswap V3 price calculation from slot0
- [x] Added caching to avoid rate limiting

### Phase 3: Update useRealArbitrage.ts ✅
- [x] Connected to real on-chain price fetcher
- [x] Replaced simulation with real price scanning
- [x] Added proper error handling
- [x] Lowered thresholds for testing (0.05% profit, $5 min)

### Phase 4: Update useArbitrageScanner.ts ✅
- [x] Added `USE_REAL_DATA` flag (set to true)
- [x] Implemented real scanning via priceFetcher
- [x] Added conversion from internal to frontend format

### Phase 5: Update Supabase Edge Function ✅
- [x] Replaced simulation with real RPC calls
- [x] Implemented Uniswap V2 pair fetching
- [x] Implemented Uniswap V3 pool fetching
- [x] Added price comparison across DEXs

## DEX Networks Supported
- ✅ Ethereum: Uniswap V2/V3, SushiSwap
- ✅ Arbitrum: Uniswap V3, SushiSwap
- ✅ Polygon: Uniswap V3, QuickSwap
- ✅ BSC: PancakeSwap, SushiSwap

## Target Tokens
- ✅ WETH, USDC, USDT, DAI, WBTC, LINK

## How It Works Now

### Frontend (priceFetcher.ts)
1. Connects to network RPC endpoints (eth.llamarpc.com, arbitrum, polygon, bsc)
2. Queries DEX factory contracts to find trading pairs
3. Fetches pool reserves/price data from blockchain
4. Calculates real prices from reserve ratios
5. Compares prices across DEXs to find arbitrage opportunities
6. Returns real opportunities based on actual price differences

### Supabase Edge Function (scan-opportunities)
1. Receives scan request with network list
2. Makes direct RPC calls to fetch on-chain data
3. Queries Uniswap V2 factories and V3 pools
4. Calculates real spreads between DEXes
5. Returns opportunities with real profit calculations

## To Run the Scanner
```bash
npm run dev
```

Then:
1. Connect your wallet
2. Start the scanner - it will now query real blockchain data
3. Opportunities found will be based on actual price differences on-chain

## Notes
- The scanner queries actual DEX contracts on the blockchain
- Real price differences may be smaller than simulated values
- MEV bots typically capture opportunities within milliseconds
- For production use, consider faster RPC providers and flashbot relays

