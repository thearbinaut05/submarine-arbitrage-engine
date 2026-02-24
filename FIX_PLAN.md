# Fix All Problems - Implementation Plan

## Issues Found from Linting

### 1. CRITICAL: supabase/functions/scan-opportunities/index.ts
- **Line 25**: Parsing error - corrupted text `ma11\`\`` in ScanRequest interface
- **Fix**: Remove corrupted text and complete the interface properly

### 2. contracts/scripts - require() imports (3 files)
- deploy-and-execute.ts line 26: `require("dotenv")` 
- deploy-mainnet.ts line 28: `require("dotenv")`
- execute-submarine.ts line 27: `require("dotenv")`
- **Fix**: Replace require with import

### 3. contracts/scripts - any types (5 files)
- deploy-gasless-all.ts: 8 occurrences of `any`
- deploy-gasless.ts: 2 occurrences
- deploy-single.ts: 1 occurrence
- test-deployment.ts: 3 occurrences  
- verify-contracts.ts: 3 occurrences
- **Fix**: Replace `any` with proper types

### 4. contracts/scripts - case block declarations (1 file)
- deploy-single.ts lines 28, 34, 40, 46: lexical declarations in case blocks
- **Fix**: Wrap case blocks in braces {}

### 5. src/test - any types (2 files)
- abis.test.ts: 11 occurrences
- setup.ts: 3 occurrences
- **Fix**: Replace with proper types or use `unknown` with type guards

### 6. supabase/functions/execute-flash-loan/index.ts
- Line 78: `any` type in SwapQuote interface
- **Fix**: Replace with proper type

### 7. src/hooks/useRealArbitrage.ts
- Line 402: Empty block statement
- Line 573: Missing dependency in useEffect
- **Fix**: Add proper error handling and fix dependency array

### 8. src/components/terminal/DashboardStats.tsx
- Line 54: Missing dependency in useEffect
- **Fix**: Add displayValue to dependency array or use ref

## Implementation Order
1. Fix critical parsing error in scan-opportunities (blocks all else)
2. Fix require() imports (simple find/replace)
3. Fix case block declarations 
4. Fix any types in contracts/scripts
5. Fix any types in test files
6. Fix useRealArbitrage issues
7. Fix DashboardStats dependency
8. Run lint to verify all fixes

