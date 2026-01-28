import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { Network, WalletState, NetworkConfig } from '@/types/defi';

export const NETWORKS: Record<Network, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: 'hsl(220, 100%, 60%)',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    color: 'hsl(210, 100%, 55%)',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    color: 'hsl(260, 80%, 60%)',
  },
  bsc: {
    id: 'bsc',
    name: 'BSC',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    color: 'hsl(45, 100%, 50%)',
  },
};

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    network: null,
    balance: '0',
  });

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      console.error('No wallet detected');
      return;
    }

    setWallet(prev => ({ ...prev, isConnecting: true }));

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(accounts[0]);

      const chainId = Number(network.chainId);
      const detectedNetwork = Object.values(NETWORKS).find(n => n.chainId === chainId);

      setWallet({
        address: accounts[0],
        isConnected: true,
        isConnecting: false,
        network: detectedNetwork?.id || null,
        balance: ethers.formatEther(balance),
      });
    } catch (error) {
      console.error('Connection failed:', error);
      setWallet(prev => ({ ...prev, isConnecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      isConnected: false,
      isConnecting: false,
      network: null,
      balance: '0',
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
    } catch (error: any) {
      if (error.code === 4902) {
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
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setWallet(prev => ({ ...prev, address: accounts[0] }));
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, [disconnect]);

  return { wallet, connect, disconnect, switchNetwork, networks: NETWORKS };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
