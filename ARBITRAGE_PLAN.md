# Arbitrage Deployment and Execution Plan

## Objective
Deploy the submarine arbitrage engine contracts and execute a successful arbitrage transaction with gasless transactions via Gelato.

## Current State Analysis

### ✅ Already Implemented
1. **Smart Contracts**: FlashArbExecutor, GaslessRelayer, PositionRebalancer
2. **Deployment Script**: `contracts/scripts/deploy-mainnet.ts`
3. **Frontend Hook**: `src/hooks/useRealArbitrage.ts` for gasless execution
4. **Network Configuration**: `contracts/scripts/config.ts` with mainnet addresses

### ❌ Missing for Deployment
1. No .env.mainnet file created
2. No private key configured
3. No RPC URL configurdebug  ed
4. No contracts deployed yet
5. No test execution performed

## Deployment Plan

### Phase 1: Environment Setup
- [ ] Create `.env.mainnet` from `.env.mainnet.example`
- [ ] Configure RPC endpoint (Alchemy/Infura)
- [ ] Set deployer private key
- [ ] Configure Etherscan API key

### Phase 2: Contract Deployment (Testnet First - Sepolia)
- [ ] Deploy to Sepolia testnet for safe testing
- [ ] Verify contracts on Sepolia Etherscan
- [ ] Save deployment addresses

### Phase 3: Execute Test Arbitrage
- [ ] Set up test environment with test tokens
- [ ] Execute flash loan arbitrage on testnet
- [ ] Verify transaction success
- [ ] Log transaction hash

### Phase 4: Mainnet Deployment (After successful testnet)
- [ ] Deploy contracts to Ethereum mainnet
- [ ] Verify contracts on Etherscan
- [ ] Fund GaslessRelayer for gas sponsorship
- [ ] Execute first mainnet arbitrage

## Contract Details

### FlashArbExecutor
- **Purpose**: Executes flash loan arbitrage between DEXes
- **Features**: UUPS upgradeable, Aave V3 integration
- **Expected Gas**: ~0.5 ETH for deployment

### GaslessRelayer
- **Purpose**: Enables gasless/meta-transactions
- **Features**: EIP-712, submarine transaction support
- **Expected Gas**: ~0.3 ETH for deployment

### PositionRebalancer
- **Purpose**: Manages portfolio rebalancing
- **Expected Gas**: ~0.3 ETH for deployment

## Dependencies

### External Services Required
1. **RPC Provider**: Alchemy or Infura (for reliable mainnet access)
2. **Gelato Relay**: For gasless transactions (API key needed)
3. **Etherscan**: For contract verification
4. **Testnet ETH**: For Sepolia testing (faucet available)

## Estimated Costs

### Testnet (Sepolia)
- Free from testnet faucets
- No real cost

### Mainnet (Ethereum)
- Contract Deployment: ~1.1 ETH total
- Verification: ~1-2 ETH
- Gas for execution: ~0.01 ETH per arbitrage

## Next Steps

1. **Immediate**: Create `.env.mainnet` with API keys
2. **Short-term**: Deploy to Sepolia testnet
3. **Medium-term**: Execute test arbitrage
4. **Long-term**: Mainnet deployment and production use

## Important Notes

⚠️ **Testing First**: Always test on testnet before mainnet
⚠️ **Small Amounts**: Start with small amounts (<$100) for first execution
⚠️ **MEV Protection**: Submarine transactions provide protection but are not 100% guaranteed
⚠️ **Gas Costs**: Even with gasless transactions, the contract must have ETH for Aave flash loan fees

