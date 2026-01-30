# Implementation Plan: Real Blockchain Transactions with Explorer Links

## Goal
Make the application execute real blockchain transactions using submarine transactions and smart contract communication, with blockchain explorer links displayed after completion.

## Steps

### 1. Update Types (`src/types/defi.ts`)
- [x] Add `txHash` field to `ArbitrageOpportunity`
- [x] Add `explorerUrl` field to `ArbitrageOpportunity`
- [x] Add `submarinePhase` field for commit-reveal tracking
- [x] Add `isSubmarine` field for MEV protection status
- [x] Add `isRealExecution` and `executedAt` fields

### 2. Update `useRealArbitrage.ts`
- [x] Add blockchain explorer URL generation based on network
- [x] Implement real transaction execution with gasless relay
- [x] Add transaction polling to get actual tx hash from Gelato/chain
- [x] Track submarine transaction phases (committed/revealed/executed)
- [x] Store explorer URLs for completed transactions
- [x] Handle both real and simulated execution modes

### 3. Update `OpportunityCard.tsx`
- [x] Add clickable blockchain explorer link component
- [x] Display link with ExternalLink icon for completed transactions
- [x] Format txHash for display (first 6 + last 4 characters)
- [x] Show submarine transaction badge with lock icon
- [x] Show submarine phase indicator during execution (committed/revealed/executed)
- [x] Display real vs simulated execution indicator

### 4. Update Gasless Relay (`supabase/functions/gasless-relay/index.ts`)
- [x] Return actual transaction hash from Gelato
- [x] Add real_tx_hash column support for blockchain transactions
- [x] Add Gelato webhook handler for transaction confirmation
- [x] Include explorer URLs in response

### 5. Database Migration (`supabase/migrations/`)
- [x] Add migration to add `real_tx_hash` column
- [x] Create index for faster lookups
- [x] Add helper function for Gelato webhook updates

## Implementation Details

### Explorer URLs by Network:
- Ethereum: `https://etherscan.io/tx/`
- Arbitrum: `https://arbiscan.io/tx/`
- Polygon: `https://polygonscan.com/tx/`
- BSC: `https://bscscan.com/tx/`

### Submarine Transaction Flow:
1. Commit phase: Submit hashed transaction to Gelato private mempool
2. Reveal phase: Transaction gets revealed and executed
3. Confirmed: Real blockchain tx hash is returned
4. Link displayed: User can click to view on explorer

### Smart Contracts Used:
- `FlashArbExecutor.sol` - Executes flash loan arbitrage
- `SubmarineTransactionManager.sol` - MEV protection via commit-reveal
- `GaslessRelayer.sol` - Meta-transaction support

### Environment Variables Required:
- `VITE_FLASH_ARB_ADDRESS` - FlashArbExecutor contract address
- `GELATO_API_KEY` - Gelato Relay API key for gasless transactions
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

