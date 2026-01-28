# FlashArb Smart Contracts

This directory contains the Solidity smart contracts for the FlashArb DeFi Trading Terminal.

## Contracts

### 1. FlashArbExecutor.sol
The main arbitrage execution contract that:
- Implements Aave V3 flash loan receiver interface
- Executes atomic arbitrage trades between DEXes
- Supports multiple DEX integrations (Uniswap V3, SushiSwap, etc.)

**Deployment Requirements:**
- Aave V3 Pool Addresses Provider
- DEX Router addresses

### 2. GaslessRelayer.sol
Meta-transaction relayer supporting:
- EIP-712 typed data signing
- Gasless transactions (gas sponsored by relayer)
- Submarine transactions (commit-reveal scheme for MEV protection)
- Replay protection via nonces

### 3. PositionRebalancer.sol
Flash loan-powered position rebalancer for:
- Depositing/withdrawing collateral
- Borrowing/repaying debt
- Maintaining target health factors
- Atomic multi-action rebalancing

## Deployment

### Prerequisites
- Node.js v18+
- Hardhat or Foundry
- Network RPC endpoints
- Deployer private key with ETH for gas

### Network Addresses

**Ethereum Mainnet:**
- Aave V3 Pool Provider: `0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e`
- Uniswap V3 Router: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
- SushiSwap Router: `0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F`

**Arbitrum:**
- Aave V3 Pool Provider: `0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb`
- Uniswap V3 Router: `0xE592427A0AEce92De3Edee1F18E0157C05861564`

**Polygon:**
- Aave V3 Pool Provider: `0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb`
- QuickSwap Router: `0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff`

### Deployment Steps

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to network
npx hardhat run scripts/deploy.js --network mainnet
```

## Security Considerations

⚠️ **WARNING: These contracts handle real funds. Before mainnet deployment:**

1. Complete full security audit
2. Test extensively on testnets
3. Implement proper access controls
4. Set up monitoring and alerts
5. Start with small amounts
6. Have emergency pause mechanisms

## License

MIT License
