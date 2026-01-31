# Real Arbitrage Scanner & Execution Fix Plan

## Objective

Make the arbitrage scanner detect REAL opportunities and execute REAL arbitrages on mainnet.

## Issues Identified

### 1. Scanner Detection Issues

- [x] CoinGecko rate limiting without proper retry logic
- [x] Price normalization bugs when comparing prices across DEXs
- [x] Incorrect spread calculation (using wrong formula)
- [x] Not filtering for actual profitable opportunities (ignoring gas/fees)

### 2. On-Chain Price Fetching Issues

- [x] Hardcoded RPC URLs that may be unreliable
- [x] Token address matching fails for some pairs
- [x] No fallback for failed RPC calls

### 3. Arbitrage Detection Logic Issues

- [x] `getTokenPriceInTermsOf` doesn't handle all token order combinations
- [x] Profit calculation ignores DEX fees (0.3% Uniswap, etc.)
- [x] Confidence scoring is arbitrary

### 4. Execution Issues

- [ ] Contract addresses are all placeholders (0x0000...)
- [ ] No transaction simulation before execution
- [ ] Missing proper error handling and retry logic

## Implementation Plan

### Phase 1: Fix Core Scanner Logic ✅ COMPLETED

- [x] Fix `coingecko.ts`:
  - [x] Add exponential backoff retry for API calls
  - [x] Fix price normalization for cross-DEX comparison
  - [x] Fix spread calculation: `(sellPrice - buyPrice) / buyPrice * 100`
  - [x] Add proper profit calculation with all fees

### Phase 2: Fix On-Chain Price Fetcher ✅ COMPLETED

- [x] Fix `priceFetcher.ts`:
  - [x] Add multiple RPC providers with fallback
  - [x] Fix token address matching
  - [x] Add proper error handling and caching

### Phase 3: Fix Arbitrage Detection (IN PROGRESS)

- [ ] Fix `DexAggregator.ts`:
  - [ ] Fix `getBestBuyPrice` token matching
  - [ ] Fix `getBestSellPrice` token matching
- [ ] Fix `AgentScanner.ts`:
  - [ ] Fix `getTokenPrice` method
  - [ ] Fix `scanNetwork` spread calculation
- [ ] Fix `PriceMonitor.ts`:
  - [ ] Fix `detectArbitrageOpportunities` price normalization

### Phase 4: Add Real Execution Pipeline (PENDING)

- [ ] Add contract deployment verification
- [ ] Add transaction simulation
- [ ] Add proper ABCI-encoded transaction building
- [ ] Add execution confirmation polling

## Files Modified

1. `src/lib/dex/coingecko.ts` - Main scanner logic (FIXED)
2. `src/lib/dex/priceFetcher.ts` - On-chain price fetching (FIXED)

## Success Criteria

- Scanner detects at least 1 real arbitrage opportunity per minute
- Spread calculation is accurate
- Profit calculation accounts for all fees
- Execution pipeline can submit real transactions
- All errors are properly logged and handled

## Next Steps

1. Complete DexAggregator.ts fixes
2. Complete AgentScanner.ts fixes
3. Complete PriceMonitor.ts fixes
4. Test scanner with real API calls
5. Deploy contracts to mainnet
