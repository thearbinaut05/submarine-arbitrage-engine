       # Arbitrage Scanner Analysis and Fix Plan

## Executive Summary

After reviewing the codebase thoroughly, I've identified **critical fundamental issues** that explain why the scanner cannot find real blockchain arbitrage opportunities. The code has technical flaws that prevent it from functioning as intended, regardless of market conditions.

---

## Issues Found

### Issue 1: Price Fetching is Not Real-Time Trading Prices
**Location**: `supabase/functions/scan-opportunities/index.ts` - functions `fetchV2Price` and `fetchV3Price`

The scanner fetches pool reserves (via `eth_call`) and calculates prices from them:
```typescript
// This gets RESERVES, not actual trade prices
const result = await rpcCall(network, 'eth_call', [
  { to: pairAddress, data: '0x0902f1ac' },  // getReserves() selector
  'latest'
]);
```

**Problem**: 
- Pool reserves are stale snapshots, not live trading prices
- The actual price at which you can execute a trade is different
- By the time the scan completes, prices have already moved

### Issue 2: Spread Calculation Doesn't Account for Slippage
**Location**: `calculateOpportunity` function

```typescript
const spread = (bestSell.price - bestBuy.price) / bestBuy.price;
const grossProfitUsd = tradeAmountUsd * spread;
```

**Problem**:
- This assumes you can trade the full `tradeAmountUsd` at the initial price
- In reality, as you buy on DEX A, the price increases
- As you sell on DEX B, the price decreases
- Real profit is MUCH lower after slippage

### Issue 3: Hardcoded Gas Estimate is Unrealistic
**Location**: `calculateOpportunity` function

```typescript
const gasUsed = 500000; // Hardcoded - always the same!
```

**Problem**:
- Gas varies significantly by network and contract complexity
- This hardcoded value gives false profit calculations

### Issue 4: Flash Loan Fee Calculation is Wrong
**Location**: `calculateOpportunity` function

```typescript
const flashLoanFee = tradeAmountUsd * 0.0009; // Always 0.09%
```

**Problem**:
- Aave V3 flash loan fees vary by token (not always 0.09%)
- For some tokens, it's higher
- This underestimates costs

### Issue 5: No MEV Protection/Competition Model
**Problem**:
- Real arbitrage opportunities are competed for by professional MEV bots
- Opportunities exist for milliseconds
- The scanner runs every 10+ seconds - it's too slow
- No front-running protection

### Issue 6: Configuration Dependencies
**Problem**:
- Scanner requires Supabase to be configured with valid credentials
- Edge functions must be deployed
- Gelato API key required for execution

---

## Fix Plan

### Phase 1: Fix Price Fetching Logic
1. Add real-time price fetching via flash loans simulation
2. Account for price impact in calculations
3. Use multiple price sources (not just reserves)

### Phase 2: Improve Profit Calculation
1. Add slippage modeling based on trade size and liquidity
2. Use dynamic gas estimation (not hardcoded)
3. Use accurate flash loan fee rates per token

### Phase 3: Add Realistic Opportunity Filtering
1. Require minimum viable spread (not just 0.01%)
2. Account for MEV competition
3. Add time-decay modeling

### Phase 4: Add Debugging and Transparency
1. Log RPC responses for debugging
2. Show actual price data from each DEX
3. Add confidence metrics based on real data

---

## Files to Modify

1. `supabase/functions/scan-opportunities/index.ts` - Main scanner logic
2. `supabase/functions/_shared/mainnet-config.ts` - Configuration
3. `src/hooks/useArbitrageScanner.ts` - Frontend scanner hook (for better error handling)

---

## Testing the Fix

After fixes, the scanner should:
1. Display detailed price data from each DEX
2. Show calculated spread vs actual achievable profit
3. Log debug information about RPC calls
4. Provide meaningful error messages when issues occur

