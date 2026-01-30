import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Network, ArbitrageOpportunity } from '@/types/defi';
import { NETWORKS } from './useWallet';
import { supabase } from '@/integrations/supabase/client';
import { coinGeckoFetcher } from '@/lib/dex/coinGeckoFetcher';

const FLASH_ARB_EXECUTOR_ABI = [
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  'function executeFlashLoanGasless(address asset, uint256 amount, bytes calldata params, address profitRecipient) external',
  'function owner() view returns (address)',
];

function getExplorerUrl(network: Network, txHash: string): string {
  const explorerBase = NETWORKS[network]?.explorer || 'https://etherscan.io';
  return `${explorerBase}/tx/${txHash}`;
}

export interface RealArbitrageState {
  opportunities: ArbitrageOpportunity[];
  isScanning: boolean;
  lastScanTime: number | null;
  scanError: string | null;
  totalProfit: number;
  transactionsExecuted: number;
  apiStatus: {
    cacheSize: number;
    lastCallTime: number;
  };
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
    totalProfit: 0,
    transactionsExecuted: 0,
    apiStatus: {
      cacheSize: 0,
      lastCallTime: 0,
    },
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTxsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Convert CoinGecko opportunity to frontend format
  const convertToOpportunity = (
    internalOpp: Awaited<ReturnType<typeof coinGeckoFetcher.scanArbitrageOpportunities>>[number]
  ): ArbitrageOpportunity => {
    const gasEstimate = internalOpp.gasEstimate;
    return {
      id: `cg-${internalOpp.network}-${internalOpp.tokenIn}-${internalOpp.tokenOut}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'flash_loan',
      sourceNetwork: internalOpp.network,
      sourceDex: internalOpp.buyDex,
      targetDex: internalOpp.sellDex,
      tokenIn: internalOpp.tokenIn,
      tokenOut: internalOpp.tokenOut,
      profitPercent: internalOpp.spreadPercent,
      profitUsd: internalOpp.profitUsd,
      gasEstimate: `$${gasEstimate.toFixed(2)}`,
      netProfit: internalOpp.netProfit,
      confidence: internalOpp.confidence,
      timestamp: Date.now(),
      route: [internalOpp.tokenIn, internalOpp.tokenOut],
      status: 'pending',
      isSubmarine: true,
    };
  };

  const scanNetwork = useCallback(async (net: Network): Promise<ArbitrageOpportunity[]> => {
    try {
      // Update API status
      const status = coinGeckoFetcher.getStatus();
      setState(prev => ({
        ...prev,
        apiStatus: {
          cacheSize: status.cacheSize,
          lastCallTime: status.lastCallTime,
        },
      }));

      const opportunities = await coinGeckoFetcher.scanArbitrageOpportunities(
        net,
        0.05, // 0.05% min spread
        5 // $5 min profit
      );
      return opportunities.map(convertToOpportunity);
    } catch (error) {
      console.error(`Error scanning ${net}:`, error);
      setState(prev => ({
        ...prev,
        scanError: error instanceof Error ? error.message : 'Unknown error',
      }));
      return [];
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (!walletAddress || !network) {
      setState(prev => ({ ...prev, scanError: 'Wallet not connected' }));
      return;
    }

    // Clear cache for fresh data
    coinGeckoFetcher.clearCache();

    setState(prev => ({ ...prev, isScanning: true, scanError: null }));

    try {
      const newOpportunities = await scanNetwork(network);
      setState(prev => ({
        ...prev,
        opportunities: [...newOpportunities, ...prev.opportunities].slice(0, 50),
        lastScanTime: Date.now(),
        isScanning: false,
      }));

      // Continuous scanning every 10 seconds (CoinGecko rate limit)
      intervalRef.current = setInterval(async () => {
        const scanned = await scanNetwork(network);
        setState(prev => ({
          ...prev,
          opportunities: [...scanned, ...prev.opportunities].slice(0, 50),
          lastScanTime: Date.now(),
        }));
      }, 10000);
    } catch (error) {
      console.error('Scanning error:', error);
      setState(prev => ({
        ...prev,
        isScanning: false,
        scanError: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [walletAddress, network, scanNetwork]);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isScanning: false }));
  }, []);

  const pollForTransaction = useCallback(async (
    opportunityId: string,
    net: Network,
    taskId: string
  ) => {
    const pollInterval = 3000;
    const maxAttempts = 40;
    let attempts = 0;

    const pollTimer = setInterval(async () => {
      attempts++;
      
      try {
        const { data: txData, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('hash', taskId)
          .single();

        if (!error && txData && (txData as Record<string, unknown>).real_tx_hash && txData.status === 'confirmed') {
          clearInterval(pollTimer);
          pendingTxsRef.current.delete(opportunityId);
          const explorerUrl = getExplorerUrl(net, (txData as Record<string, unknown>).real_tx_hash as string);
          
          setState(prev => ({
            ...prev,
            opportunities: prev.opportunities.map(op =>
              op.id === opportunityId
                ? { ...op, status: 'completed' as const, txHash: (txData as Record<string, unknown>).real_tx_hash as string, explorerUrl, isRealExecution: true, executedAt: Date.now() }
                : op
            ),
          }));
          return;
        }

        if (txData && txData.status === 'failed') {
          clearInterval(pollTimer);
          pendingTxsRef.current.delete(opportunityId);
          setState(prev => ({
            ...prev,
            opportunities: prev.opportunities.map(op => op.id === opportunityId ? { ...op, status: 'failed' as const } : op),
          }));
          return;
        }

        const provider = new ethers.JsonRpcProvider(NETWORKS[net].rpcUrl);
        try {
          const txReceipt = await provider.getTransactionReceipt(taskId);
          if (txReceipt && txReceipt.blockNumber) {
            clearInterval(pollTimer);
            pendingTxsRef.current.delete(opportunityId);
            const explorerUrl = getExplorerUrl(net, taskId);
            setState(prev => ({
              ...prev,
              opportunities: prev.opportunities.map(op =>
                op.id === opportunityId
                  ? { ...op, status: 'completed' as const, txHash: taskId, explorerUrl, isRealExecution: true, executedAt: Date.now() }
                  : op
              ),
            }));
            return;
          }
        } catch {}

        if (attempts >= maxAttempts) {
          clearInterval(pollTimer);
          pendingTxsRef.current.delete(opportunityId);
          setState(prev => ({
            ...prev,
            opportunities: prev.opportunities.map(op => op.id === opportunityId ? { ...op, status: 'failed' as const } : op),
          }));
        }
      } catch (error) {
        console.error('Error polling for transaction:', error);
      }
    }, pollInterval);

    pendingTxsRef.current.set(opportunityId, pollTimer);
  }, []);

  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch {
      return '';
    }
  }, []);

  const executeOpportunity = useCallback(async (opportunity: ArbitrageOpportunity) => {
    if (!walletAddress || !network) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({
      ...prev,
      opportunities: prev.opportunities.map(op =>
        op.id === opportunity.id 
          ? { ...op, status: 'executing' as const, isSubmarine: true, submarinePhase: 'committed' as const }
          : op
      ),
    }));

    const FLASH_ARB_ADDRESS = import.meta.env.VITE_FLASH_ARB_ADDRESS;

    if (!FLASH_ARB_ADDRESS || FLASH_ARB_ADDRESS === '0x0000000000000000000000000000000000000000') {
      // No contract deployed - cannot execute
      setState(prev => ({
        ...prev,
        opportunities: prev.opportunities.map(op =>
          op.id === opportunity.id
            ? { ...op, status: 'failed' as const, scanError: 'Contract not deployed' }
            : op
        ),
      }));
      throw new Error('Flash arb contract not deployed');
    }

    try {
      const amountIn = ethers.parseEther('1');
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'address', 'uint256', 'bytes', 'bytes'],
        [opportunity.tokenIn, opportunity.tokenOut, opportunity.targetDex, 0, '0x', '0x']
      );

      const contract = new ethers.Contract(FLASH_ARB_ADDRESS, FLASH_ARB_EXECUTOR_ABI, signer);
      const deadline = Math.floor(Date.now() / 1000) + 300;

      const response = await fetch('/functions/v1/gasless-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getAuthToken()}` },
        body: JSON.stringify({ network, to: FLASH_ARB_ADDRESS, data: contract.interface.encodeFunctionData('executeFlashLoan', [opportunity.tokenIn, amountIn, params]), value: '0x0', deadline, signature: '0x', walletAddress, isSubmarine: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Relay failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        opportunities: prev.opportunities.map(op => op.id === opportunity.id ? { ...op, submarinePhase: 'revealed' as const, txHash: result.taskId } : op),
      }));

      if (result.taskId) {
        pollForTransaction(opportunity.id, network, result.taskId);
      }

      return { hash: result.taskId, simulated: false, isSubmarine: true, explorerUrl: result.taskId ? getExplorerUrl(network, result.taskId) : undefined };
    } catch (error) {
      console.error('Execution failed:', error);
      setState(prev => ({
        ...prev,
        opportunities: prev.opportunities.map(op => op.id === opportunity.id ? { ...op, status: 'failed' as const, submarinePhase: undefined } : op),
      }));
      throw error;
    }
  }, [walletAddress, network, signer, getAuthToken, pollForTransaction]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      pendingTxsRef.current.forEach((timer) => clearInterval(timer));
      pendingTxsRef.current.clear();
    };
  }, []);

  return { ...state, startScanning, stopScanning, executeOpportunity };
}
