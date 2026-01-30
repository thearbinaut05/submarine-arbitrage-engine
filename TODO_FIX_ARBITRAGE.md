# TODO: Fix Arbitrage Opportunity Detection Functions

## Issues Identified:
1. `getTokenPrice` in AgentScanner.ts - Incorrect token matching
2. `detectArbitrageOpportunities` in PriceMonitor.ts - Price normalization issues
3. `scanArbitrageOpportunities` in priceFetcher.ts - Spread calculation logic errors
4. `getBestBuyPrice/getBestSellPrice` in DexAggregator.ts - Token matching issues

## Fix Plan:

### Step 1: Create helper utilities for token price normalization
- [ ] Create helper function to correctly match tokens in a DEX pair
- [ ] Create helper to normalize prices to a common direction

### Step 2: Fix AgentScanner.ts
- [ ] Fix `getTokenPrice` method to correctly identify and return token price
- [ ] Fix `scanNetwork` spread calculation

### Step 3: Fix PriceMonitor.ts
- [ ] Fix `detectArbitrageOpportunities` price normalization
- [ ] Ensure correct buy/sell DEX identification

### Step 4: Fix priceFetcher.ts
- [ ] Fix `scanArbitrageOpportunities` price comparison
- [ ] Fix spread and profit calculations

### Step 5: Fix DexAggregator.ts
- [ ] Fix `getBestBuyPrice` token matching
- [ ] Fix `getBestSellPrice` token matching

### Step 6: Testing
- [ ] Run existing tests to verify fixes
- [ ] Verify opportunity detection works correctly

## Progress:
- [ ] Started: Analysis complete
- [ ] In Progress: Implementing fixes
- [ ] Completed: All fixes applied

