import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Network, WalletState, NetworkConfig } from '@/types/defi';

// Common ERC-20 token addresses on Ethereum mainnet
const COMMON_TOKENS = [
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  { address: '0x6B175474E89094C44Da98b954EescdeCB5BE1023a', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, name: 'Wrapped Bitcoin' },
  { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18, name: 'Chainlink' },
  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18, name: 'Uniswap' },
  { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimals: 18, name: 'Aave' },
];

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
];

export const NETWORKS: Record<Network, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: 'hsl(220, 100%, 60%)',
    tokenList: COMMON_TOKENS,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: 'hsl(210, 100%, 55%)',
    tokenList: [],
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    color: 'hsl(260, 80%, 60%)',
    tokenList: [],
  },
  bsc: {
    id: 'bsc',
    name: 'BSC',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    color: 'hsl(45, 100%, 50%)',
    tokenList: [],
  },
};

export interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  balanceUsd?: number;
  decimals: number;
  logoUrl?: string;
}

export interface EnhancedWalletState extends WalletState {
  tokens: TokenBalance[];
  isLoadingTokens: boolean;
  lastUpdated: number | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<EnhancedWalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    network: null,
    balance: '0',
    tokens: [],
    isLoadingTokens: false,
    lastUpdated: null,
  });

  const providerRef = useRef<ethers.BrowserProvider | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rpcProviderRef = useRef<ethers.JsonRpcProvider | null>(null);

  // Initialize RPC provider for balance fetching
  const getRpcProvider = useCallback(() => {
    if (!rpcProviderRef.current) {
      const config = wallet.network ? NETWORKS[wallet.network] : NETWORKS.ethereum;
      rpcProviderRef.current = new ethers.JsonRpcProvider(config.rpcUrl);
    }
    return rpcProviderRef.current;
  }, [wallet.network]);

  // Fetch token balances using RPC
  const fetchTokenBalances = useCallback(async (address: string, network: Network) => {
    const config = NETWORKS[network];
    if (!config.tokenList || config.tokenList.length === 0) {
      return [];
    }

    const rpcProvider = getRpcProvider();
    const balances: TokenBalance[] = [];

    for (const token of config.tokenList) {
      try {
        const contract = new ethers.Contract(token.address, ERC20_ABI, rpcProvider);
        const balanceRaw = await contract.balanceOf(address);
        const formattedBalance = ethers.formatUnits(balanceRaw, token.decimals);
        
        // Filter out dust balances (less than $0.01)
        const balanceNum = parseFloat(formattedBalance);
        if (balanceNum > 0.000001) {
          balances.push({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            balance: balanceNum.toFixed(token.decimals > 6 ? 6 : token.decimals),
            decimals: token.decimals,
          });
        }
      } catch {
        // Token might not exist on this network, skip silently
        console.debug(`Failed to fetch ${token.symbol} balance`);
      }
    }

    return balances;
  }, [getRpcProvider]);

  // Refresh all balances (native + tokens)
  const refreshBalances = useCallback(async () => {
    if (!wallet.address || !wallet.network) return;

    try {
      const rpcProvider = getRpcProvider();
      
      // Fetch native token balance via RPC
      const nativeBalance = await rpcProvider.getBalance(wallet.address);
      const nativeBalanceFormatted = ethers.formatEther(nativeBalance);

      // Fetch token balances
      const tokens = await fetchTokenBalances(wallet.address, wallet.network);

      setWallet(prev => ({
        ...prev,
        balance: nativeBalanceFormatted,
        tokens,
        isLoadingTokens: false,
        lastUpdated: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    }
  }, [wallet.address, wallet.network, getRpcProvider, fetchTokenBalances]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      console.error('No wallet detected. Please install MetaMask or another wallet.');
      return;
    }

    setWallet(prev => ({ ...prev, isConnecting: true }));

    try {
      providerRef.current = new ethers.BrowserProvider(window.ethereum);
      const accounts = await providerRef.current.send('eth_requestAccounts', []);
      const network = await providerRef.current.getNetwork();
      
      const chainId = Number(network.chainId);
      const detectedNetwork = Object.values(NETWORKS).find(n => n.chainId === chainId);

      if (!detectedNetwork) {
        throw new Error(`Unsupported network: chainId ${chainId}`);
      }

      const balance = await providerRef.current.getBalance(accounts[0]);
      const tokens = await fetchTokenBalances(accounts[0], detectedNetwork.id);

      setWallet({
        address: accounts[0],
        isConnected: true,
        isConnecting: false,
        network: detectedNetwork.id,
        balance: ethers.formatEther(balance),
        tokens,
        isLoadingTokens: false,
        lastUpdated: Date.now(),
      });

      // Start periodic balance refresh (every 30 seconds)
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setInterval(refreshBalances, 30000);

    } catch (error) {
      console.error('Connection failed:', error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
    }
  }, [fetchTokenBalances, refreshBalances]);

  const disconnect = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    setWallet({
      address: null,
      isConnected: false,
      isConnecting: false,
      network: null,
      balance: '0',
      tokens: [],
      isLoadingTokens: false,
      lastUpdated: null,
    });
  }, []);

  const switchNetwork = useCallback(async (network: Network) => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const config = NETWORKS[network];
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${config.chainId.toString(16)}` }],
      });
      setWallet(prev => ({ ...prev, network }));
      
      // Refresh balances after network switch
      if (wallet.address) {
        setTimeout(() => refreshBalances(), 1000);
      }
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${config.chainId.toString(16)}`,
              chainName: config.name,
              rpcUrls: [config.rpcUrl],
              blockExplorerUrls: [config.explorer],
              nativeCurrency: config.nativeCurrency,
            }],
          });
          setWallet(prev => ({ ...prev, network }));
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  }, [refreshBalances, wallet.address]);

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setWallet(prev => ({ ...prev, address: accounts[0] }));
          refreshBalances();
        }
      };

      const handleChainChanged = () => {
        // Reload to ensure clean state
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [disconnect, refreshBalances]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return { 
    wallet, 
    connect, 
    disconnect, 
    switchNetwork, 
    networks: NETWORKS,
    refreshBalances,
  };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

