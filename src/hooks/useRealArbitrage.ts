import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Network, ArbitrageOpportunity, ScannerConfig } from '@/types/defi';
import { NETWORKS } from './useWallet';
import { supabase } from '@/integrations/supabase/client';
import { priceFetcher } from '@/lib/dex/priceFetcher';

// Flash loan executor ABI (minimal for execution)
const FLASH_ARB_EXECUTOR_ABI = [
  'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
  'function owner() view returns (address)',
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

  // Scan for arbitrage opportunities on a single network
  const scanNetwork = useCallback(async (net: Network): Promise<ArbitrageOpportunity[]> => {
    try {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(net, 0.05, 10);
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
    net: Network,
    taskId: string
  ) => {
    const pollInterval = 3000;
    const maxAttempts = 40;
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
          if (txData.real_tx_hash && txData.status === 'confirmed') {
            clearInterval(pollTimer);
            pendingTxsRef.current.delete(opportunityId);
            
            const explorerUrl = getExplorerUrl(net, txData.real_tx_hash);
            
            setState(prev => ({
              ...prev,
              opportunities: prev.opportunities.map(op =>
                op.id === opportunityId
                  ? {
                      ...op,
                      status: 'completed' as const,
                      txHash: txData.real_tx_hash,
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

    // Get contract addresses from environment
    const FLASH_ARB_ADDRESS = import.meta.env.VITE_FLASH_ARB_ADDRESS;
    const GELATO_RELAYER = import.meta.env.VITE_GELATO_RELAYER || '0xaBcC9b596420A9E9172FD5938620E265a0f9Df92';

    // Check if contract is deployed
    if (!FLASH_ARB_ADDRESS || FLASH_ARB_ADDRESS === '0x0000000000000000000000000000000000000000') {
      console.warn('FlashArb contract not deployed - simulating execution');
      
      // Simulate execution for demo
      setTimeout(() => {
        const success = Math.random() > 0.1;
        
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
      // Build transaction data for flash loan execution
      const amountIn = ethers.parseEther('1'); // 1 ETH worth
      
      // Encode the arbitrage parameters
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'address', 'uint256', 'bytes', 'bytes'],
        [
          opportunity.tokenIn,
          opportunity.tokenOut,
          opportunity.sourceDex,
          0, // minAmountOut
          '0x', // swapDataSource
          '0x', // swapDataTarget
        ]
      );

      // Get contract instance
      const contract = new ethers.Contract(
        FLASH_ARB_ADDRESS,
        FLASH_ARB_EXECUTOR_ABI,
        signer
      );

      // Encode function call
      const txData = contract.interface.encodeFunctionData('executeFlashLoan', [
        opportunity.tokenIn,
        amountIn,
        params,
      ]);

      // Create deadline (5 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 300;

      // Call gasless relay endpoint (via Supabase Edge Function)
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
        const errorText = await response.text();
        throw new Error(`Relay failed: ${response.statusText} - ${errorText}`);
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
  }, [walletAddress, network, signer, getAuthToken, pollForTransaction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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

