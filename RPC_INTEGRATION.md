# RPC Integration Summary

## Overview
This document describes the integration of `https://eth.llamarpc.com` as the primary Ethereum RPC endpoint for real-time wallet balance fetching in the FlashArb arbitrage engine.

## Changes Made

### 1. Enhanced `src/hooks/useWallet.ts`
- Added support for fetching real-time balances via RPC (`https://eth.llamarpc.com`)
- Implemented ERC-20 token balance fetching for common tokens (WETH, USDC, USDT, DAI, WBTC, LINK, UNI, AAVE)
- Added automatic balance refresh every 30 seconds when wallet is connected
- Added manual refresh capability
- Enhanced wallet state to include token balances

### 2. Updated `src/types/defi.ts`
- Extended `NetworkConfig` interface with optional `tokenList` for network-specific token configurations

### 3. Enhanced `src/components/terminal/WalletButton.tsx`
- Displays native ETH balance with last updated timestamp
- Shows token balances in dropdown menu
- Added refresh button for manual balance updates
- Supports expandable token list for wallets with many tokens

### 4. Updated `src/components/terminal/Header.tsx`
- Integrated refresh balance functionality from useWallet hook

### 5. Enhanced `src/pages/Index.tsx`
- Redesigned wallet portfolio view
- Shows connected wallet address and network
- Displays detailed ETH balance
- Lists all token holdings with formatted amounts
- Added manual refresh button with loading state
- Shows last update timestamp

## RPC Configuration

The primary Ethereum RPC endpoint is:
```
https://eth.llamarpc.com
```

This is configured in:
- `src/hooks/useWallet.ts` - NETWORKS.ethereum.rpcUrl
- `src/types/chains.ts` - CHAINS.ethereum.rpcUrls[0]
- `contracts/hardhat.config.ts` - mainnet and hardhat forking defaults

## Supported Tokens on Ethereum

The following tokens are automatically detected on Ethereum mainnet:
| Token | Address | Decimals |
|-------|---------|----------|
| WETH | 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 | 18 |
| USDC | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 | 6 |
| USDT | 0xdAC17F958D2ee523a2206206994597C13D831ec7 | 6 |
| DAI | 0x6B175474E89094C44Da98b954EescdeCB5BE1023a | 18 |
| WBTC | 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599 | 8 |
| LINK | 0x514910771AF9Ca656af840dff83E8264EcF986CA | 18 |
| UNI | 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984 | 18 |
| AAVE | 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9 | 18 |

## Features

1. **Real-time Balance Updates**: Balances are fetched via RPC every 30 seconds
2. **Auto-refresh on Network Switch**: Balances refresh when switching networks
3. **Manual Refresh**: Users can manually refresh balances via the UI
4. **Token Detection**: Automatically detects and displays ERC-20 token holdings
5. **Dust Filter**: Balances below $0.01 are filtered out to reduce noise

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

After connecting a wallet, the application will:
1. Show the connected wallet address
2. Display real-time ETH balance from the RPC
3. Fetch and display all token holdings
4. Auto-refresh balances every 30 seconds

