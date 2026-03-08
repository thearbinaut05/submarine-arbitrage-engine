import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Network, WalletState, NetworkConfig } from '@/types/defi';

// Common ERC-20 token addresses on Ethereum mainnet
const ETHEREUM_TOKENS = [
  { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  { address: '0x6B175474E89094C44Da98b954EescdeCB5BE1023a', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, name: 'Wrapped Bitcoin' },
  { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18, name: 'Chainlink' },
  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18, name: 'Uniswap' },
  { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', decimals: 18, name: 'Aave' },
];

// Arbitrum tokens
const ARBITRUM_TOKENS = [
  { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
  { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', decimals: 8, name: 'Wrapped Bitcoin' },
  { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', symbol: 'LINK', decimals: 18, name: 'Chainlink' },
];

// Polygon tokens
const POLYGON_TOKENS = [
  { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', decimals: 18, name: 'Wrapped Matic' },
  { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
];

// BSC tokens
const BSC_TOKENS = [
  { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', decimals: 18, name: 'Wrapped BNB' },
  { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', decimals: 18, name: 'Binance USD' },
  { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', decimals: 18, name: 'Tether USD' },
  { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', decimals: 18, name: 'USD Coin' },
  { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'ETH', decimals: 18, name: 'Ethereum' },
  { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', decimals: 18, name: 'Bitcoin BEP2' },
];

// Optimism tokens
const OPTIMISM_TOKENS = [
  { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6, name: 'Tether USD' },
  { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', decimals: 18, name: 'Dai Stablecoin' },
];

// Base tokens
const BASE_TOKENS = [
  { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', symbol: 'CBETH', decimals: 18, name: 'Coinbase Wrapped Staked ETH' },
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
    tokenList: ETHEREUM_TOKENS,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: 'hsl(210, 100%, 55%)',
    tokenList: ARBITRUM_TOKENS,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    color: 'hsl(260, 80%, 60%)',
    tokenList: POLYGON_TOKENS,
  },
  bsc: {
    id: 'bsc',
    name: 'BSC',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    color: 'hsl(45, 100%, 50%)',
    tokenList: BSC_TOKENS,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: 'hsl(0, 0%, 50%)',
    tokenList: OPTIMISM_TOKENS,
  },
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: 'hsl(210, 100%, 50%)',
    tokenList: BASE_TOKENS,
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorer: 'https://snowtrace.io',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    color: 'hsl(0, 70%, 50%)',
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
      const provider = new ethers.BrowserProvider(window.ethereum);
      providerRef.current = provider;
      const accounts = await provider.send('eth_requestAccounts', []);
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
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 4902) {
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

interface EthereumProvider {
  isConnected?: boolean;
  chainId?: string;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  removeListener(event: string, handler: (...args: unknown[]) => void): void;
  send(method: string, params?: unknown[]): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

