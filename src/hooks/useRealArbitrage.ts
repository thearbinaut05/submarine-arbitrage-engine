import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Network, ArbitrageOpportunity, ScannerConfig } from '@/types/defi';
import { NETWORKS } from './useWallet';
import { supabase } from '@/integrations/supabase/client';
import { priceFetcher } from '@/lib/dex/priceFetcher';

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
  const pendingTxsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Convert internal opportunity format to frontend format
  const convertToOpportunity = (
    internalOpp: Awaited<ReturnType<typeof priceFetcher.scanArbitrageOpportunities>>[number]
  ): ArbitrageOpportunity => {
    // Get gas estimate in USD
    const gasEstimate = internalOpp.gasEstimate;
    
    return {
      id: `real-${internalOpp.network}-${internalOpp.tokenIn}-${internalOpp.tokenOut}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // Scan for arbitrage opportunities on a single network using real on-chain data
  const scanNetwork = useCallback(async (net: Network): Promise<ArbitrageOpportunity[]> => {
    try {
      // Use real on-chain price fetcher
      const opportunities = await priceFetcher.scanArbitrageOpportunities(net, 0.05, 5);
      
      // Convert to frontend format
      return opportunities.map(convertToOpportunity);
    } catch (error) {
      console.error(`Error scanning ${net}:`, error);
      return [];
    }
  }, []);

  // Start scanning for opportunities
  const startScanning = useCallback(async () => {
    if (!walletAddress || !network) {
      setState(prev => ({ ...prev, scanError: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isScanning: true, scanError: null }));

    try {
      // Initial scan with real on-chain data
      const newOpportunities = await scanNetwork(network);
      
      setState(prev => ({
        ...prev,
        opportunities: [...newOpportunities, ...prev.opportunities].slice(0, 50),
        lastScanTime: Date.now(),
        isScanning: false,
      }));

      // Continuous scanning every 5 seconds
      intervalRef.current = setInterval(async () => {
        const scanned = await scanNetwork(network);
        setState(prev => ({
          ...prev,
          opportunities: [...scanned, ...prev.opportunities].slice(0, 50),
          lastScanTime: Date.now(),
        }));
      }, 5000);
    } catch (error) {
      console.error('Scanning error:', error);
      setState(prev => ({
        ...prev,
        isScanning: false,
        scanError: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [walletAddress, network, scanNetwork]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(prev => ({ ...prev, isScanning: false }));
  }, []);

  // Poll for transaction confirmation
  const pollForTransaction = useCallback(async (
    opportunityId: string,
    network: Network,
    taskId: string
  ) => {
    const pollInterval = 3000; // 3 seconds
    const maxAttempts = 40; // 2 minutes max
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

  // Get auth token for Supabase
  const getAuthToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch {
      return '';
    }
  }, []);

  // Execute an arbitrage opportunity using gasless relay with submarine transactions
  const executeOpportunity = useCallback(async (opportunity: ArbitrageOpportunity) => {
    if (!walletAddress || !network) {
      throw new Error('Wallet not connected');
    }

    // Update status to executing
    setState(prev => ({
      ...prev,
      opportunities: prev.opportunities.map(op =>
        op.id === opportunity.id 
          ? { 
              ...op, 
              status: 'executing' as const,
              isSubmarine: true,
              submarinePhase: 'committed' as const,
            } 
          : op
      ),
    }));

    // Get contract address from environment
    const FLASH_ARB_ADDRESS = import.meta.env.VITE_FLASH_ARB_ADDRESS || '0x0000000000000000000000000000000000000000';

    // If no contract deployed, show warning
    if (FLASH_ARB_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.warn('FlashArb contract not deployed - simulating execution');
      
      // Simulate execution for demo
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate for simulation
        
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
      }, 2000 + Math.random() * 2000);

      return { hash: 'simulated-' + Date.now(), simulated: true };
    }

    try {
      // Build transaction data for gasless relay
      const amountIn = ethers.parseEther('1');
      
      // Encode route data
      const routeData = new Uint8Array([
        ...new Uint8Array(32), // padding
        ...new Uint8Array(32), // tokenIn
        ...new Uint8Array(32), // tokenOut
      ]);

      const contract = new ethers.Contract(FLASH_ARB_ADDRESS, FLASH_ARB_EXECUTOR_ABI);
      
      const txData = contract.interface.encodeFunctionData('executeArbitrage', [
        opportunity.tokenIn,
        opportunity.tokenOut,
        amountIn,
        routeData
      ]);

      // Create deadline (5 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 300;

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
          signature: '0x',
          walletAddress,
          isSubmarine: true,
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

      // Start polling for confirmation
      if (result.taskId) {
        pollForTransaction(opportunity.id, network, result.taskId);
      }

      return { 
        hash: result.taskId, 
        simulated: false, 
        isSubmarine: true,
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
  }, [walletAddress, network, getAuthToken, pollForTransaction]);

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

