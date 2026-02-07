import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Network, ArbitrageOpportunity } from '@/types/defi';
import { NETWORKS } from './useWallet';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getExplorerUrl(network: Network, txHash: string): string {
  const explorerBase = NETWORKS[network]?.explorer || 'https://etherscan.io';
  return `${explorerBase}/tx/${txHash}`;
}

// Map backend network names to frontend Network type
const NETWORK_MAP: Record<string, Network> = {
  ethereum: 'ethereum',
  arbitrum: 'arbitrum',
  polygon: 'polygon',
  bsc: 'bsc',
  optimism: 'optimism',
  base: 'base',
  avalanche: 'avalanche',
};

export interface RealArbitrageState {
  opportunities: ArbitrageOpportunity[];
  isScanning: boolean;
  lastScanTime: number | null;
  scanError: string | null;
  totalProfit: number;
  transactionsExecuted: number;
  networksScanned: string[];
  scanStats: {
    totalPairsScanned: number;
    opportunitiesFound: number;
    avgConfidence: number;
    lastGasPrice: Record<string, number>;
  };
}

interface BackendOpportunity {
  id: string;
  type: 'flash_loan' | 'flash_swap' | 'cross_chain';
  sourceNetwork: string;
  targetNetwork?: string;
  sourceDex: string;
  targetDex: string;
  tokenIn: string;
  tokenOut: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: string; // Wei amount as string
  amountInUsd: number;
  profitPercent: number;
  profitUsd: number;
  gasEstimate: string;
  gasEstimateUsd: number;
  netProfit: number;
  confidence: number;
  timestamp: number;
  route: string[];
  isSubmarine: boolean;
  executorAddress: string;
  poolAddresses: { buy: string; sell: string };
  liquidityUsd: number;
  blockNumber: number;
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
    networksScanned: [],
    scanStats: {
      totalPairsScanned: 0,
      opportunitiesFound: 0,
      avgConfidence: 0,
      lastGasPrice: {},
    },
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingTxsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  // Store full backend opportunity data including amountIn for execution
  const backendOpportunitiesRef = useRef<Map<string, BackendOpportunity>>(new Map());

  // Convert backend opportunity to frontend format
  const convertToOpportunity = useCallback((backendOpp: BackendOpportunity): ArbitrageOpportunity => {
    return {
      id: backendOpp.id,
      type: backendOpp.type,
      sourceNetwork: NETWORK_MAP[backendOpp.sourceNetwork] || 'ethereum',
      targetNetwork: backendOpp.targetNetwork ? NETWORK_MAP[backendOpp.targetNetwork] : undefined,
      sourceDex: backendOpp.sourceDex,
      targetDex: backendOpp.targetDex,
      tokenIn: backendOpp.tokenIn,
      tokenOut: backendOpp.tokenOut,
      profitPercent: backendOpp.profitPercent,
      profitUsd: backendOpp.profitUsd,
      gasEstimate: backendOpp.gasEstimate,
      netProfit: backendOpp.netProfit,
      confidence: backendOpp.confidence,
      timestamp: backendOpp.timestamp,
      route: backendOpp.route,
      status: 'pending',
      isSubmarine: backendOpp.isSubmarine,
    };
  }, []);

  // Call the backend scanner edge function
  const scanNetworks = useCallback(async (networksToScan: string[]): Promise<ArbitrageOpportunity[]> => {
    if (!SUPABASE_URL) {
      console.error('SUPABASE_URL not configured');
      return [];
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/scan-opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          networks: networksToScan,
          minProfitPercent: 0.03, // Low threshold to catch more opportunities
          minProfitUsd: 3,
          maxConcurrent: 15,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Scanner failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      // Update scan stats
      setState(prev => ({
        ...prev,
        networksScanned: result.networksScanned || networksToScan,
        scanStats: {
          totalPairsScanned: result.totalPairsScanned || 0,
          opportunitiesFound: result.opportunities?.length || 0,
          avgConfidence: result.opportunities?.length > 0 
            ? result.opportunities.reduce((sum: number, o: BackendOpportunity) => sum + o.confidence, 0) / result.opportunities.length 
            : 0,
          lastGasPrice: result.gasEstimates || {},
        },
      }));

      if (result.opportunities && Array.isArray(result.opportunities)) {
        // Store backend opportunities for execution (includes amountIn)
        for (const opp of result.opportunities as BackendOpportunity[]) {
          backendOpportunitiesRef.current.set(opp.id, opp);
        }
        return result.opportunities.map(convertToOpportunity);
      }

      return [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, don't treat as error
        return [];
      }
      console.error('Error scanning networks:', error);
      setState(prev => ({
        ...prev,
        scanError: error instanceof Error ? error.message : 'Unknown error',
      }));
      return [];
    }
  }, [convertToOpportunity]);

  const startScanning = useCallback(async () => {
    setState(prev => ({ ...prev, isScanning: true, scanError: null }));

    // Scan all 7 networks - frontend sends all, backend limits to top 3
    const allNetworks = ['ethereum', 'arbitrum', 'polygon', 'bsc', 'optimism', 'base', 'avalanche'];

    try {
      // Initial scan
      const newOpportunities = await scanNetworks(allNetworks);
      
      if (newOpportunities.length > 0) {
        setState(prev => ({
          ...prev,
          opportunities: newOpportunities.slice(0, 100), // Start fresh with top 100
          lastScanTime: Date.now(),
          isScanning: true, // Keep scanning flag true for interval
        }));
      }

      // Continuous scanning every 15 seconds (matches frontend interval)
      intervalRef.current = setInterval(async () => {
        const scanned = await scanNetworks(allNetworks);
        setState(prev => ({
          ...prev,
          opportunities: scanned.slice(0, 100), // Replace with latest scan results
          lastScanTime: Date.now(),
        }));
      }, 15000); // 15 second interval
    } catch (error) {
      console.error('Scanning error:', error);
      setState(prev => ({
        ...prev,
        isScanning: false,
        scanError: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [scanNetworks]);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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
            transactionsExecuted: prev.transactionsExecuted + 1,
            totalProfit: prev.totalProfit + (prev.opportunities.find(o => o.id === opportunityId)?.netProfit || 0),
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

        // Try direct RPC lookup
        const rpcUrl = NETWORKS[net]?.rpcUrl;
        if (rpcUrl) {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
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
                transactionsExecuted: prev.transactionsExecuted + 1,
              }));
              return;
            }
          } catch {}
        }

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
      return session?.access_token || SUPABASE_ANON_KEY || '';
    } catch {
      return SUPABASE_ANON_KEY || '';
    }
  }, []);

  const executeOpportunity = useCallback(async (opportunity: ArbitrageOpportunity) => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    const targetNetwork = opportunity.sourceNetwork;

    setState(prev => ({
      ...prev,
      opportunities: prev.opportunities.map(op =>
        op.id === opportunity.id 
          ? { ...op, status: 'executing' as const, isSubmarine: true, submarinePhase: 'committed' as const }
          : op
      ),
    }));

    try {
      // Get the full backend opportunity data including amountIn
      const backendOpp = backendOpportunitiesRef.current.get(opportunity.id);
      const amountIn = backendOpp?.amountIn;
      
      if (!amountIn) {
        throw new Error(`Missing amountIn for opportunity ${opportunity.id}. Please re-scan for opportunities.`);
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-flash-loan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${await getAuthToken()}` 
        },
        body: JSON.stringify({ 
          network: targetNetwork,
          tokenIn: opportunity.tokenIn,
          tokenOut: opportunity.tokenOut,
          amountIn: amountIn, // Include amountIn from backend opportunity
          sourceDex: opportunity.sourceDex,
          targetDex: opportunity.targetDex,
          profitRecipient: walletAddress,
          minProfit: opportunity.netProfit * 0.8, // 20% slippage protection
          isSubmarine: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Execution failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        opportunities: prev.opportunities.map(op => 
          op.id === opportunity.id 
            ? { ...op, submarinePhase: 'revealed' as const, txHash: result.taskId } 
            : op
        ),
      }));

      if (result.taskId) {
        pollForTransaction(opportunity.id, targetNetwork, result.taskId);
      }

      return { 
        hash: result.taskId, 
        simulated: false, 
        isSubmarine: true, 
        explorerUrl: result.taskId ? getExplorerUrl(targetNetwork, result.taskId) : undefined 
      };
    } catch (error) {
      console.error('Execution failed:', error);
      setState(prev => ({
        ...prev,
        opportunities: prev.opportunities.map(op => 
          op.id === opportunity.id 
            ? { ...op, status: 'failed' as const, submarinePhase: undefined } 
            : op
        ),
      }));
      throw error;
    }
  }, [walletAddress, getAuthToken, pollForTransaction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      pendingTxsRef.current.forEach((timer) => clearInterval(timer));
      pendingTxsRef.current.clear();
    };
  }, []);

  return { ...state, startScanning, stopScanning, executeOpportunity };
}
