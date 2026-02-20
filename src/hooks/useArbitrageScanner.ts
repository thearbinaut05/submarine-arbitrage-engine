import { useState, useCallback, useEffect, useRef } from 'react';
import { ArbitrageOpportunity, ScannerConfig, Network } from '@/types/defi';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

// Default thresholds - using backend edge function
const DEFAULT_MIN_PROFIT_PERCENT = 0.01;
const DEFAULT_MIN_PROFIT_USD = 1;
const DEFAULT_SCAN_INTERVAL = 10000;

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'undefined');
};

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
  amountIn: string;
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

export function useArbitrageScanner() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [config, setConfig] = useState<ScannerConfig>({
    isActive: false,
    autoExecute: false,
    minProfitPercent: DEFAULT_MIN_PROFIT_PERCENT,
    minProfitUsd: DEFAULT_MIN_PROFIT_USD,
    maxGasGwei: 100,
    networks: ['ethereum', 'arbitrum', 'polygon', 'bsc', 'optimism', 'base', 'avalanche'],
    scanInterval: DEFAULT_SCAN_INTERVAL,
  });
  const [stats, setStats] = useState({
    totalScanned: 0,
    totalProfit: 0,
    successRate: 0,
    avgProfit: 0,
    transactionsExecuted: 0,
  });
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<{ cacheSize: number; lastCallTime: number }>({
    cacheSize: 0,
    lastCallTime: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Store full backend opportunity data for execution
  const backendOpportunitiesRef = useRef<Map<string, BackendOpportunity>>(new Map());
  
  // PERSISTENCE: Store executing and completed opportunities separately
  const executingOpportunitiesRef = useRef<Map<string, ArbitrageOpportunity>>(new Map());
  const completedOpportunitiesRef = useRef<Map<string, ArbitrageOpportunity>>(new Map());

  // Convert backend opportunity to frontend format
  const convertToOpportunity = (backendOpp: BackendOpportunity): ArbitrageOpportunity => {
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
  };

  // Scan using backend edge function
  const scanWithBackend = useCallback(async () => {
    // Require Supabase configuration for real scanning
    if (!isSupabaseConfigured()) {
      setScanError('Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.');
      setIsScanning(false);
      return;
    }

    if (!config.networks.length) {
      setScanError('Configuration missing');
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/scan-opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          networks: config.networks,
          minProfitPercent: config.minProfitPercent,
          minProfitUsd: config.minProfitUsd,
          maxConcurrent: 15,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Scan failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // Update API status
      setApiStatus({
        cacheSize: result.scanStats?.totalPairsScanned || 0,
        lastCallTime: Date.now(),
      });

      if (result.opportunities && Array.isArray(result.opportunities)) {
        const backendOpps = result.opportunities as BackendOpportunity[];
        
        // Store full backend opportunities for execution
        for (const opp of backendOpps) {
          backendOpportunitiesRef.current.set(opp.id, opp);
        }
        
        const convertedOpps = backendOpps.map(convertToOpportunity);

        // Sort by net profit and merge with existing
        convertedOpps.sort((a, b) => b.netProfit - a.netProfit);

        // Get executing opportunities to preserve
        const executingOpps = Array.from(executingOpportunitiesRef.current.values());

        setOpportunities(prev => {
          const merged = [...convertedOpps, ...executingOpps];
          for (const old of prev) {
            if (!merged.some(o => o.id === old.id) && old.status !== 'pending') {
              merged.push(old);
            }
          }
          return merged.slice(0, 50);
        });

        setStats(prev => ({
          ...prev,
          totalScanned: prev.totalScanned + convertedOpps.length,
        }));
      } else {
        // No opportunities found - clear list but show empty state (not demo)
        const executingOpps = Array.from(executingOpportunitiesRef.current.values());
        
        setOpportunities(prev => {
          const merged = [...executingOpps];
          for (const old of prev) {
            if (!merged.some(o => o.id === old.id) && old.status !== 'pending') {
              merged.push(old);
            }
          }
          return merged.slice(0, 50);
        });
        
        console.log('No arbitrage opportunities found at this time. Markets may be too efficient.');
      }

      setLastScanTime(Date.now());
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return;
      }
      console.error('Backend scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Unknown error during scan');
    } finally {
      setIsScanning(false);
    }
  }, [config.networks, config.minProfitPercent, config.minProfitUsd]);

  const startScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: true }));
    scanWithBackend();

    intervalRef.current = setInterval(() => {
      scanWithBackend();
    }, config.scanInterval);
  }, [config.scanInterval, scanWithBackend]);

  const stopScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: false }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
  }, []);

  const toggleAutoExecute = useCallback(() => {
    setConfig(prev => ({ ...prev, autoExecute: !prev.autoExecute }));
  }, []);

  // Ref to store latest opportunities for executeOpportunity callback
  const opportunitiesRef = useRef<ArbitrageOpportunity[]>([]);
  opportunitiesRef.current = opportunities;

  // Validate opportunity viability before execution
  const validateOpportunity = (opp: ArbitrageOpportunity, backendOpp: BackendOpportunity): { valid: boolean; error?: string } => {
    // Check if profit is still positive after execution
    if (opp.netProfit <= 0) {
      return { valid: false, error: 'Net profit is not positive' };
    }

    // Check if confidence is sufficient
    if (opp.confidence < 50) {
      return { valid: false, error: 'Confidence too low - potential slippage' };
    }

    // Check if gas estimate is reasonable
    const gasUsd = opp.gasEstimate ? parseFloat(opp.gasEstimate) : 0;
    if (gasUsd > opp.netProfit) {
      return { valid: false, error: 'Gas costs exceed profit' };
    }

    // Check if liquidity is sufficient
    if (backendOpp.liquidityUsd < opp.profitUsd * 10) {
      return { valid: false, error: 'Insufficient liquidity in pools' };
    }

    return { valid: true };
  };

  // Get RPC URL for network
  const getRpcUrl = (network: Network): string | null => {
    const RPC_URLS: Record<Network, string> = {
      ethereum: 'https://eth.llamarpc.com',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      polygon: 'https://polygon-rpc.com',
      bsc: 'https://bsc-dataseed.binance.org',
      optimism: 'https://optimism.drpc.org',
      base: 'https://base.drpc.org',
      avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    };
    return RPC_URLS[network] || null;
  };

  // Poll for transaction confirmation - DEFINED FIRST so executeOpportunity can reference it
  const pollForTransaction = useCallback(async (
    opportunityId: string,
    network: Network,
    taskId: string
  ) => {
    const pollInterval = 3000;
    const maxAttempts = 40;
    let attempts = 0;

    const pollTimer = setInterval(async () => {
      attempts++;
      
      try {
        // Try to get transaction from Supabase - import client directly
        const supabaseModule = await import('@/integrations/supabase/client');
        const supabase = supabaseModule.supabase;
        const { data: txData, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('hash', taskId)
          .single();

        if (!error && txData && (txData as Record<string, unknown>).real_tx_hash && txData.status === 'confirmed') {
          clearInterval(pollTimer);
          
          // Move to completed
          const executingOpp = executingOpportunitiesRef.current.get(opportunityId);
          executingOpportunitiesRef.current.delete(opportunityId);
          
          const completedOpp: ArbitrageOpportunity = {
            ...(executingOpp || {
              id: opportunityId,
              type: 'flash_loan',
              sourceNetwork: network,
              sourceDex: 'unknown',
              targetDex: 'unknown',
              tokenIn: 'unknown',
              tokenOut: 'unknown',
              profitPercent: 0,
              profitUsd: 0,
              gasEstimate: '0',
              netProfit: 0,
              confidence: 0,
              timestamp: Date.now(),
              route: [],
              status: 'completed',
            }),
            status: 'completed',
            txHash: (txData as Record<string, unknown>).real_tx_hash as string,
            isRealExecution: true,
            executedAt: Date.now(),
          };
          completedOpportunitiesRef.current.set(opportunityId, completedOpp);
          
          setOpportunities(prev =>
            prev.map(op =>
              op.id === opportunityId
                ? { ...op, status: 'completed' as const, txHash: (txData as Record<string, unknown>).real_tx_hash as string, isRealExecution: true, executedAt: Date.now() }
                : op
            )
          );
          
          setStats(prev => ({
            ...prev,
            totalProfit: prev.totalProfit + (executingOpp?.netProfit || 0),
            transactionsExecuted: prev.transactionsExecuted + 1,
          }));
          return;
        }

        // Try direct RPC lookup for verification
        if (attempts >= 5) {
          const rpcUrl = getRpcUrl(network);
          if (rpcUrl) {
            const { ethers } = await import('ethers');
            try {
              const provider = new ethers.JsonRpcProvider(rpcUrl);
              const txReceipt = await provider.getTransactionReceipt(taskId);
              if (txReceipt && txReceipt.blockNumber) {
                clearInterval(pollTimer);
                
                const executingOpp = executingOpportunitiesRef.current.get(opportunityId);
                executingOpportunitiesRef.current.delete(opportunityId);
                
                const completedOpp: ArbitrageOpportunity = {
                  ...(executingOpp || {
                    id: opportunityId,
                    type: 'flash_loan',
                    sourceNetwork: network,
                    sourceDex: 'unknown',
                    targetDex: 'unknown',
                    tokenIn: 'unknown',
                    tokenOut: 'unknown',
                    profitPercent: 0,
                    profitUsd: 0,
                    gasEstimate: '0',
                    netProfit: 0,
                    confidence: 0,
                    timestamp: Date.now(),
                    route: [],
                    status: 'completed',
                  }),
                  status: 'completed',
                  txHash: taskId,
                  isRealExecution: true,
                  executedAt: Date.now(),
                };
                completedOpportunitiesRef.current.set(opportunityId, completedOpp);
                
                setOpportunities(prev =>
                  prev.map(op =>
                    op.id === opportunityId
                      ? { ...op, status: 'completed' as const, txHash: taskId, isRealExecution: true, executedAt: Date.now() }
                      : op
                  )
                );
                
                setStats(prev => ({
                  ...prev,
                  totalProfit: prev.totalProfit + (executingOpp?.netProfit || 0),
                  transactionsExecuted: prev.transactionsExecuted + 1,
                }));
                return;
              }
            } catch (rpcError) {
              // Silently continue - RPC lookup is optional fallback
            }
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollTimer);
          
          const executingOpp = executingOpportunitiesRef.current.get(opportunityId);
          executingOpportunitiesRef.current.delete(opportunityId);
          
          if (executingOpp) {
            const failedOpp: ArbitrageOpportunity = {
              ...executingOpp,
              status: 'failed',
            };
            completedOpportunitiesRef.current.set(opportunityId, failedOpp);
          }
          
          setOpportunities(prev =>
            prev.map(op => op.id === opportunityId ? { ...op, status: 'failed' as const } : op)
          );
        }
      } catch (error) {
        console.error('Error polling for transaction:', error);
      }
    }, pollInterval);
  }, []);

  // Real execution via backend edge function with validation
  const executeOpportunity = useCallback(async (id: string) => {
    // Use ref to get latest opportunities
    const executingOpp = opportunitiesRef.current.find(o => o.id === id);
    if (!executingOpp) return;
    
    if (!isSupabaseConfigured()) {
      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === id ? { ...opp, status: 'failed' as const } : opp
        )
      );
      setScanError('Cannot execute: Supabase not configured');
      return;
    }

    // Get the full backend opportunity data
    const backendOpp = backendOpportunitiesRef.current.get(id);
    if (!backendOpp) {
      setScanError('Opportunity data not found. Please re-scan.');
      return;
    }

    // Validate opportunity before execution
    const validation = validateOpportunity(executingOpp, backendOpp);
    if (!validation.valid) {
      console.warn(`Opportunity validation failed: ${validation.error}`);
      setScanError(`Cannot execute: ${validation.error}`);
      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === id ? { ...opp, status: 'failed' as const } : opp
        )
      );
      return;
    }

    // Store in executing ref for persistence
    executingOpportunitiesRef.current.set(id, { ...executingOpp, status: 'executing' });

    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === id ? { ...opp, status: 'executing' as const } : opp
      )
    );

    console.log(`Executing opportunity ${id}:`, {
      network: executingOpp.sourceNetwork,
      profit: executingOpp.netProfit,
      confidence: executingOpp.confidence,
      route: executingOpp.route,
    });

    try {
      const executionPayload = { 
        network: executingOpp.sourceNetwork,
        tokenIn: executingOpp.tokenIn,
        tokenOut: executingOpp.tokenOut,
        amountIn: backendOpp.amountIn,
        sourceDex: executingOpp.sourceDex,
        targetDex: executingOpp.targetDex,
        profitRecipient: backendOpp.executorAddress,
        minProfit: executingOpp.netProfit * 0.8, // 80% of estimated profit as minimum
        slippageTolerance: 0.5, // 0.5% slippage tolerance
        isSubmarine: true,
        opportunityId: id,
      };

      console.log('Execution payload:', executionPayload);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-flash-loan`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}` 
        },
        body: JSON.stringify(executionPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `Execution failed: ${response.status} ${response.statusText} - ${errorText}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      const result = await response.json();

      if (!result.taskId && !result.txHash) {
        throw new Error('No transaction ID returned from execution');
      }

      const txHash = result.taskId || result.txHash;
      console.log(`Transaction submitted: ${txHash}`);

      // Update with task ID
      const updatedOpp: ArbitrageOpportunity = {
        ...executingOpp,
        txHash,
        status: 'executing',
      };
      executingOpportunitiesRef.current.set(id, updatedOpp);

      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === id ? { ...opp, txHash, status: 'executing' as const } : opp
        )
      );

      // Poll for transaction completion
      pollForTransaction(id, executingOpp.sourceNetwork, txHash);

    } catch (error) {
      console.error('Execution error:', error);
      
      // Move to failed
      executingOpportunitiesRef.current.delete(id);
      const failedOpp: ArbitrageOpportunity = {
        ...executingOpp,
        status: 'failed',
      };
      completedOpportunitiesRef.current.set(id, failedOpp);
      
      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === id ? { ...opp, status: 'failed' as const } : opp
        )
      );
      
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      setScanError(errorMessage);
      console.error(`Opportunity ${id} execution failed: ${errorMessage}`);
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<ScannerConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const getCompletedOpportunities = useCallback((): ArbitrageOpportunity[] => {
    return Array.from(completedOpportunitiesRef.current.values()).sort(
      (a, b) => (b.executedAt || 0) - (a.executedAt || 0)
    );
  }, []);

  const getExecutingOpportunities = useCallback((): ArbitrageOpportunity[] => {
    return Array.from(executingOpportunitiesRef.current.values());
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

// Ref to store executeOpportunity for auto-execute effect
  const executeOpportunityRef = useRef(executeOpportunity);
  executeOpportunityRef.current = executeOpportunity;

  // Auto-execute high-confidence opportunities when found
  useEffect(() => {
    if (!config.autoExecute || opportunities.length === 0) return;
    
    // Find high-confidence pending opportunities
    const highConfidenceOpps = opportunities.filter(
      opp => opp.status === 'pending' && opp.netProfit > 0 && opp.confidence > 80
    );
    
    // Auto-execute top opportunity after a short delay
    if (highConfidenceOpps.length > 0) {
      const timer = setTimeout(() => {
        const topOpp = highConfidenceOpps[0];
        executeOpportunityRef.current(topOpp.id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    // No cleanup needed when no high confidence opportunities
  }, [opportunities, config.autoExecute]);

  return {
    opportunities,
    config,
    stats,
    startScanner,
    stopScanner,
    toggleAutoExecute,
    executeOpportunity,
    updateConfig,
    isScanning,
    lastScanTime,
    scanError,
    apiStatus,
    getCompletedOpportunities,
    getExecutingOpportunities,
  };
}
