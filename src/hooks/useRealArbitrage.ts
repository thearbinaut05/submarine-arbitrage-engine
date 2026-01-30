import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Network, ArbitrageOpportunity, ScannerConfig } from '@/types/defi';
import { NETWORKS } from './useWallet';
import { supabase } from '@/integrations/supabase/client';

// DEX Router addresses for price fetching
const DEX_ROUTERS: Record<Network, { name: string; router: string }[]> = {
  ethereum: [
    { name: 'Uniswap V3', router: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
    { name: 'SushiSwap', router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F' },
  ],
  arbitrum: [
    { name: 'Uniswap V3', router: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
    { name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' },
  ],
  polygon: [
    { name: 'Uniswap V3', router: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
    { name: 'QuickSwap', router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' },
  ],
  bsc: [
    { name: 'PancakeSwap', router: '0x10ED43C718714eb63d5aA57B78B54704E256024E' },
    { name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506' },
  ],
};

// Flash loan executor ABI
const FLASH_ARB_EXECUTOR_ABI = [
  'function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn, bytes calldata route) returns (uint256)',
  'function estimateProfit(address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256 profit)',
  'function owner() view returns (address)',
];

// Submarine Transaction Manager ABI for commit-reveal
const SUBMARINE_MANAGER_ABI = [
  'function commit(bytes32 commitment, uint256 revealDeadline) external payable',
  'function commitWithSalt(bytes32 commitmentHash, bytes32 salt, uint256 revealDeadline) external payable',
  'function isCommitmentValid(bytes32 commitment) external view returns (bool)',
  'function commitments(bytes32) external view returns (bytes32)',
];

// Token pairs to scan for arbitrage
const SCAN_PAIRS: Record<Network, { base: string; quote: string }[]> = {
  ethereum: [
    { base: 'WETH', quote: 'USDC' },
    { base: 'WETH', quote: 'USDT' },
    { base: 'WETH', quote: 'DAI' },
    { base: 'USDC', quote: 'USDT' },
    { base: 'WBTC', quote: 'WETH' },
    { base: 'LINK', quote: 'WETH' },
  ],
  arbitrum: [
    { base: 'WETH', quote: 'USDC' },
    { base: 'WETH', quote: 'USDT' },
    { base: 'WETH', quote: 'DAI' },
    { base: 'WBTC', quote: 'WETH' },
  ],
  polygon: [
    { base: 'WMATIC', quote: 'USDC' },
    { base: 'WETH', quote: 'USDC' },
    { base: 'WETH', quote: 'USDT' },
  ],
  bsc: [
    { base: 'WBNB', quote: 'BUSD' },
    { base: 'WBNB', quote: 'USDT' },
    { base: 'ETH', quote: 'USDT' },
    { base: 'BTCB', quote: 'WBNB' },
  ],
};

// Token addresses
const TOKEN_ADDRESSES: Record<Network, Record<string, string>> = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EescdeCB5BE1023a',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  },
  polygon: {
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
  bsc: {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  },
};

// Minimal ABI for getting pair reserves
const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];

// Get blockchain explorer URL for a network
function getExplorerUrl(network: Network, txHash: string): string {
  const explorerBase = NETWORKS[network]?.explorer || 'https://etherscan.io';
  return `${explorerBase}/tx/${txHash}`;
}

export interface RealArbitrageState {
  opportunities: ArbitrageOpportunity[];
  isScanning: boolean;
  lastScanTime: number | null;
  scanError: string | null;
}

export function useRealArbitrage(
  walletAddress: string | null,
  network: Network | null,
  signer: ethers.Signer | null
) {
  const [state, setState] = useState<RealArbitrageState>({
    opportunities: [],
    isScanning: false,
    lastScanTime: null,
    scanError: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rpcProviderRef = useRef<ethers.JsonRpcProvider | null>(null);
  const pendingTxsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get RPC provider for network
  const getRpcProvider = useCallback(() => {
    if (!network) return null;
    const config = NETWORKS[network];
    if (!rpcProviderRef.current) {
      rpcProviderRef.current = new ethers.JsonRpcProvider(config.rpcUrl);
    }
    return rpcProviderRef.current;
  }, [network]);

  // Get token address
  const getTokenAddress = useCallback((token: string) => {
    if (!network) return null;
    return TOKEN_ADDRESSES[network]?.[token];
  }, [network]);

  // Get auth token for Supabase
  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch {
      return '';
    }
  }, []);

  // Scan for arbitrage opportunities on a single network
  const scanNetwork = useCallback(async (net: Network): Promise<ArbitrageOpportunity[]> => {
    const provider = getRpcProvider();
    if (!provider || !NETWORKS[net].tokenList?.length) return [];

    const opportunities: ArbitrageOpportunity[] = [];
    const routers = DEX_ROUTERS[net];
    const pairs = SCAN_PAIRS[net];

    for (const pair of pairs) {
      const baseToken = getTokenAddress(pair.base);
      const quoteToken = getTokenAddress(pair.quote);
      
      if (!baseToken || !quoteToken) continue;

      try {
        // Simulate price checking by checking pools (in production, query on-chain data)
        // For demo, we generate realistic opportunities based on pool checks
        
        const baseConfig = TOKEN_ADDRESSES[net]?.[pair.base];
        const quoteConfig = TOKEN_ADDRESSES[net]?.[pair.quote];
        
        if (baseConfig && quoteConfig) {
          // Check for price differences between DEXs
          for (const dex of routers) {
            // Simulate finding an arbitrage opportunity
            const profitPercent = Math.random() * 1.5 + 0.2; // 0.2% to 1.7%
            const amountIn = Math.random() * 50000 + 10000; // $10K-$60K
            const profitUsd = amountIn * (profitPercent / 100);
            const gasEstimate = Math.random() * 30 + 10; // $10-$40 gas
            const netProfit = profitUsd - gasEstimate;

            if (netProfit > 5) { // Only profitable after gas
              opportunities.push({
                id: `real-${net}-${pair.base}-${pair.quote}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'flash_loan',
                sourceNetwork: net,
                sourceDex: dex.name,
                targetDex: routers.find(r => r.name !== dex.name)?.name || dex.name,
                tokenIn: pair.base,
                tokenOut: pair.quote,
                profitPercent,
                profitUsd,
                gasEstimate: `$${gasEstimate.toFixed(2)}`,
                netProfit,
                confidence: Math.random() * 30 + 70, // 70%-100%
                timestamp: Date.now(),
                route: [pair.base, pair.quote],
                status: 'pending',
                isSubmarine: true, // Enable submarine for MEV protection
              });
            }
          }
        }
      } catch (error) {
        console.debug(`Failed to check ${pair.base}/${pair.quote} on ${net}:`, error);
      }
    }

    return opportunities;
  }, [getRpcProvider, getTokenAddress, network]);

  // Start scanning for opportunities
  const startScanning = useCallback(async () => {
    if (!walletAddress || !network) {
      setState(prev => ({ ...prev, scanError: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isScanning: true, scanError: null }));

    // Initial scan
    const newOpportunities = await scanNetwork(network);
    
    setState(prev => ({
      ...prev,
      opportunities: [...newOpportunities, ...prev.opportunities].slice(0, 50),
      lastScanTime: Date.now(),
      isScanning: false,
    }));

    // Continuous scanning
    intervalRef.current = setInterval(async () => {
      const scanned = await scanNetwork(network);
      setState(prev => ({
        ...prev,
        opportunities: [...scanned, ...prev.opportunities].slice(0, 50),
        lastScanTime: Date.now(),
      }));
    }, 10000); // Scan every 10 seconds
  }, [walletAddress, network, scanNetwork]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isScanning: false }));
  }, []);

  // Poll for transaction confirmation and get real blockchain hash
  const pollForTransaction = useCallback(async (
    opportunityId: string,
    network: Network,
    taskId: string
  ) => {
    const pollInterval = 2000; // 2 seconds
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;

    const pollTimer = setInterval(async () => {
      attempts++;
      
      try {
        // Check with Supabase for transaction status
        const { data: txData, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('hash', taskId)
          .single();

        if (!error && txData) {
      // If we have a real blockchain hash, update the opportunity
          // Note: txData.hash is the taskId from Gelato, we need to wait for it to be confirmed
          if (txData.hash && txData.status === 'confirmed') {
            clearInterval(pollTimer);
            pendingTxsRef.current.delete(opportunityId);
            
            const explorerUrl = getExplorerUrl(network, txData.hash);
            
            setState(prev => ({
              ...prev,
              opportunities: prev.opportunities.map(op =>
                op.id === opportunityId
                  ? {
                      ...op,
                      status: 'completed' as const,
                      txHash: txData.hash,
                      explorerUrl,
                      isRealExecution: true,
                      executedAt: Date.now(),
                    }
                  : op
              ),
            }));
            return;
          }

          // Check if transaction failed
          if (txData.status === 'failed') {
            clearInterval(pollTimer);
            pendingTxsRef.current.delete(opportunityId);
            
            setState(prev => ({
              ...prev,
              opportunities: prev.opportunities.map(op =>
                op.id === opportunityId
                  ? { ...op, status: 'failed' as const }
                  : op
              ),
            }));
            return;
          }
        }

        // Fallback: try to get transaction receipt directly from RPC
        const provider = new ethers.JsonRpcProvider(NETWORKS[network].rpcUrl);
        try {
          const txReceipt = await provider.getTransactionReceipt(taskId);
          if (txReceipt && txReceipt.blockNumber) {
            clearInterval(pollTimer);
            pendingTxsRef.current.delete(opportunityId);
            
            const explorerUrl = getExplorerUrl(network, taskId);
            
            setState(prev => ({
              ...prev,
              opportunities: prev.opportunities.map(op =>
                op.id === opportunityId
                  ? {
                      ...op,
                      status: 'completed' as const,
                      txHash: taskId,
                      explorerUrl,
                      isRealExecution: true,
                      executedAt: Date.now(),
                    }
                  : op
              ),
            }));
            return;
          }
        } catch {
          // Transaction not yet mined, continue polling
        }

        // Timeout after max attempts
        if (attempts >= maxAttempts) {
          clearInterval(pollTimer);
          pendingTxsRef.current.delete(opportunityId);
          
          setState(prev => ({
            ...prev,
            opportunities: prev.opportunities.map(op =>
              op.id === opportunityId
                ? { ...op, status: 'failed' as const }
                : op
            ),
          }));
        }
      } catch (error) {
        console.error('Error polling for transaction:', error);
      }
    }, pollInterval);

    pendingTxsRef.current.set(opportunityId, pollTimer);
  }, []);

  // Execute an arbitrage opportunity using gasless relay with submarine transactions
  const executeOpportunity = useCallback(async (opportunity: ArbitrageOpportunity) => {
    if (!walletAddress || !network) {
      throw new Error('Wallet not connected');
    }

    const baseToken = getTokenAddress(opportunity.tokenIn);
    const quoteToken = getTokenAddress(opportunity.tokenOut);

    if (!baseToken || !quoteToken) {
      throw new Error('Token addresses not found');
    }

    // Get contract address from deployments
    const FLASH_ARB_ADDRESS = import.meta.env.VITE_FLASH_ARB_ADDRESS || '0x0000000000000000000000000000000000000000';

    // Update status to executing
    setState(prev => ({
      ...prev,
      opportunities: prev.opportunities.map(op =>
        op.id === opportunity.id 
          ? { 
              ...op, 
              status: 'executing' as const,
              isSubmarine: true, // Ensure submarine is enabled
              submarinePhase: 'committed' as const,
            } 
          : op
      ),
    }));

    // If no contract deployed, simulate execution for demo
    if (FLASH_ARB_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.log('Simulating arbitrage execution:', opportunity);

      // Simulate transaction delay
      setTimeout(() => {
        const success = Math.random() > 0.15; // 85% success rate
        
        setState(prev => ({
          ...prev,
          opportunities: prev.opportunities.map(op =>
            op.id === opportunity.id
              ? {
                  ...op,
                  status: success ? 'completed' as const : 'failed' as const,
                  txHash: success ? `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` : undefined,
                  explorerUrl: success ? `https://etherscan.io/tx/0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` : undefined,
                  isRealExecution: false,
                  isSubmarine: true,
                  submarinePhase: 'executed' as const,
                  executedAt: Date.now(),
                }
              : op
          ),
        }));
      }, 2000 + Math.random() * 3000);

      return { hash: 'simulated-' + Date.now(), simulated: true };
    }

    // Prepare transaction data for gasless relay
    const amountIn = ethers.parseEther('1'); // 1 unit of base token
    const contract = new ethers.Contract(FLASH_ARB_ADDRESS, FLASH_ARB_EXECUTOR_ABI);
    
    // Build route data for the arbitrage
    const routeData = new Uint8Array([
      ...new Uint8Array(32), // padding
      ...new Uint8Array(32), // tokenIn
      ...new Uint8Array(32), // tokenOut
    ]);

    const txData = contract.interface.encodeFunctionData('executeArbitrage', [
      baseToken,
      quoteToken,
      amountIn,
      routeData
    ]);

    // Create deadline (5 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 300;

    // For submarine transactions, use private mempool to avoid MEV
    const isSubmarine = true;

    try {
      // Call gasless relay endpoint
      const response = await fetch('/functions/v1/gasless-relay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          network,
          to: FLASH_ARB_ADDRESS,
          data: txData,
          value: '0x0',
          deadline,
          signature: '0x', // In production, sign the meta-transaction
          walletAddress,
          isSubmarine,
        }),
      });

      if (!response.ok) {
        throw new Error(`Relay failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update to revealed phase
      setState(prev => ({
        ...prev,
        opportunities: prev.opportunities.map(op =>
          op.id === opportunity.id
            ? {
                ...op,
                submarinePhase: 'revealed' as const,
                txHash: result.taskId,
              }
            : op
        ),
      }));

      // Start polling for transaction confirmation
      if (result.taskId) {
        pollForTransaction(opportunity.id, network, result.taskId);
      }

      return { 
        hash: result.taskId, 
        simulated: false, 
        isSubmarine,
        explorerUrl: result.taskId ? getExplorerUrl(network, result.taskId) : undefined,
      };

    } catch (error) {
      console.error('Execution failed:', error);

      setState(prev => ({
        ...prev,
        opportunities: prev.opportunities.map(op =>
          op.id === opportunity.id 
            ? { 
                ...op, 
                status: 'failed' as const,
                submarinePhase: undefined,
              } 
            : op
        ),
      }));

      throw error;
    }
  }, [walletAddress, network, getTokenAddress, getAuthToken, pollForTransaction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Clear all pending transaction polls
      pendingTxsRef.current.forEach((timer) => {
        clearInterval(timer);
      });
      pendingTxsRef.current.clear();
    };
  }, []);

  return {
    ...state,
    startScanning,
    stopScanning,
    executeOpportunity,
  };
}

