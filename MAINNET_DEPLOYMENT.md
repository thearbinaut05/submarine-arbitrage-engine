# Mainnet Deployment Plan

## Objective
Deploy the submarine arbitrage engine to mainnet with:
- Gasless transactions via Gelato Sponsor Relay
- MEV protection via submarine transactions
- Smart contract deployment and verification
- Full end-to-end execution pipeline

## Current State Analysis

### ✅ Already Implemented
1. **Smart Contracts**: FlashArbExecutor, GaslessRelayer, PositionRebalancer
2. **Frontend**: Wallet connection, opportunity display, execution flow
3. **Backend**: Supabase edge functions for scanning, execution, and relaying
4. **Price Fetcher**: On-chain price fetching from multiple DEXs
5. **Gasless Relay**: Gelato integration with submarine support

### ❌ Missing for Mainnet
1. Environment configuration (RPC URLs, API keys)
2. Contract deployment to mainnet
3. Supabase table setup
4. Gelato API key configuration
5. Frontend contract address updates

## Task Breakdown

### Phase 1: Environment Setup
- [ ] Create mainnet `.env` configuration
- [ ] Configure RPC endpoints (Alchemy/Infura for reliability)
- [ ] Set up Gelato API key
- [ ] Configure Etherscan API keys for verification
- [ ] Set Supabase credentials

### Phase 2: Smart Contract Deployment
- [ ] Deploy FlashArbExecutor to Ethereum mainnet
- [ ] Deploy GaslessRelayer to Ethereum mainnet
- [ ] Deploy PositionRebalancer to Ethereum mainnet
- [ ] Verify contracts on Etherscan
- [ ] Save contract addresses

### Phase 3: Supabase Configuration
- [ ] Create `arbitrage_opportunities` table
- [ ] Create `transactions` table
- [ ] Set up RLS policies
- [ ] Deploy edge functions

### Phase 4: Frontend Integration
- [ ] Update contract addresses in frontend
- [ ] Configure Gelato relay in frontend
- [ ] Add mainnet network to wallet selector
- [ ] Test wallet connection to mainnet

### Phase 5: Testing & Execution
- [ ] Run scanner on mainnet
- [ ] Test submarine transaction flow
- [ ] Execute first gasless arbitrage
- [ ] Monitor and optimize

## Dependencies

### Smart Contracts
- OpenZeppelin contracts
- Aave V3 FlashLoanSimpleReceiver
- Hardhat deployment

### External Services
- Gelato Relay (for gasless transactions)
- Supabase (for transaction tracking)
- Etherscan (for verification)
- RPC Provider (Alchemy/Infura recommended)

## Estimated Costs

### Deployment Costs (Ethereum Mainnet)
- FlashArbExecutor: ~0.5 ETH
- GaslessRelayer: ~0.3 ETH
- PositionRebalancer: ~0.3 ETH
- Verification: ~1-2 ETH total

### Runtime Costs
- Gelato Sponsor: Covered by Gelato program
- RPC Calls: Minimal (via public RPCs)
- Storage: Supabase free tier sufficient

## Next Steps

1. **Immediate**: Set up environment variables
2. **Short-term**: Deploy contracts to mainnet
3. **Medium-term**: Test and iterate on arbitrage strategies

## Notes

⚠️ **Important**: Always start with small amounts and test thoroughly before committing significant capital.
⚠️ **MEV Protection**: Submarine transactions provide protection but are not 100% guaranteed.
⚠️ **Gas Costs**: Even with gasless transactions, the contract must have ETH for Aave flash loan fees.

