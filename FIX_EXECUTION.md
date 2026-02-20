# Fix Plan for Submarine Arbitrage Engine

## Issues Identified

### 1. React Bug - Missing Dependency (CRITICAL)
- **File**: `src/hooks/useArbitrageScanner.ts`
- **Problem**: `executeOpportunity` is referenced inside `scanWithBackend` but NOT in the dependency array
- **Impact**: Stale closure causing execution failures

### 2. Heavy Computation in Scanner
- **File**: `supabase/functions/scan-opportunities/index.ts`
- **Problem**: 
  - Scanning 120+ token pairs per network
  - Multiple RPC calls per pair (get pool address, get reserves)
  - 7 networks scanned in parallel
  - Causes timeouts and "too much computation" errors
- **Solution**: Reduce pairs, optimize with cached prices, use simpler logic

### 3. Execution Issues
- **File**: `supabase/functions/execute-flash-loan/index.ts`
- **Problem**: Complex fallback logic may fail
- **Solution**: Simplify execution flow, ensure direct execution works reliably

## Fix Steps

### Step 1: Fix React Hook Dependency Issue
- Add missing `executeOpportunity` to scanWithBackend dependencies OR restructure to avoid circular dependency

### Step 2: Optimize Scanner for Faster Execution  
- Reduce token pairs from 120+ to 20 core pairs per network
- Add parallel price fetching with better timeout handling
- Add caching for pool addresses

### Step 3: Simplify Execution Flow
- Ensure direct non-gasless execution works as reliable fallback
- Add simpler transaction building

### Step 4: Test the fixes

