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

// Default thresholds - using backend edge function (no rate limits, no CORS!)
const DEFAULT_MIN_PROFIT_PERCENT = 0.05;
const DEFAULT_MIN_PROFIT_USD = 5;
const DEFAULT_SCAN_INTERVAL = 15000; // 15 seconds - gives time for requests to complete

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
    networks: ['ethereum', 'arbitrum', 'polygon', 'bsc'],
    scanInterval: DEFAULT_SCAN_INTERVAL,
  });
  const [stats, setStats] = useState({
    totalScanned: 0,
    totalProfit: 0,
    successRate: 0,
    avgProfit: 0,
  });
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<{ cacheSize: number; lastCallTime: number }>({
    cacheSize: 0,
    lastCallTime: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // PERSISTENCE: Store executing and completed opportunities separately
  // These will NOT be removed when new opportunities are scanned
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

  // Scan using backend edge function (NO CORS issues, NO rate limits!)
  const scanWithBackend = useCallback(async () => {
    if (!config.networks.length || !SUPABASE_URL) {
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
        const convertedOpps = backendOpps.map(convertToOpportunity);

        // Sort by net profit and merge with existing
        convertedOpps.sort((a, b) => b.netProfit - a.netProfit);

        // Get executing opportunities to preserve
        const executingOpps = Array.from(executingOpportunitiesRef.current.values());

        setOpportunities(prev => {
          const merged = [...convertedOpps, ...executingOpps];
          for (const old of prev) {
            if (!merged.some(o => o.id === old.id) && old.status !== 'pending') {
              // Keep completed/failed opportunities
              merged.push(old);
            }
          }
          return merged.slice(0, 50);
        });

        setStats(prev => ({
          ...prev,
          totalScanned: prev.totalScanned + convertedOpps.length,
        }));

        // Auto-execute if enabled
        if (config.autoExecute) {
          for (const opp of convertedOpps.slice(0, 3)) {
            if (opp.netProfit > 0 && opp.confidence > 80) {
              setTimeout(() => executeOpportunity(opp.id), 1000);
            }
          }
        }
      }

      setLastScanTime(Date.now());
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Backend scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Unknown error during scan');
    } finally {
      setIsScanning(false);
    }
  }, [config.networks, config.minProfitPercent, config.minProfitUsd, config.autoExecute]);

  const startScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: true }));

    // Initial scan
    scanWithBackend();

    // Continuous scanning
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

  const executeOpportunity = useCallback((id: string) => {
    // Get the opportunity from state or refs
    const executingOpp = opportunities.find(o => o.id === id);
    if (!executingOpp) return;
    
    // Store in executing ref for persistence
    executingOpportunitiesRef.current.set(id, { ...executingOpp, status: 'executing' });

    setOpportunities(prev =>
      prev.map(opp =>
        opp.id === id ? { ...opp, status: 'executing' as const } : opp
      )
    );

    setTimeout(() => {
      const success = Math.random() > 0.2;
      
      if (success) {
        // Move to completed
        const completedOpp: ArbitrageOpportunity = {
          ...executingOpp,
          status: 'completed',
          txHash: `simulated-${Date.now()}`,
          isRealExecution: false,
          executedAt: Date.now(),
        };
        executingOpportunitiesRef.current.delete(id);
        completedOpportunitiesRef.current.set(id, completedOpp);
        
        setStats(prev => ({
          ...prev,
          totalProfit: prev.totalProfit + (executingOpp.netProfit || 0),
          successRate: ((prev.successRate * prev.totalScanned + 1) / (prev.totalScanned + 1)),
        }));
      } else {
        // Move to failed
        const failedOpp: ArbitrageOpportunity = {
          ...executingOpp,
          status: 'failed',
        };
        executingOpportunitiesRef.current.delete(id);
        completedOpportunitiesRef.current.set(id, failedOpp);
      }
      
      setOpportunities(prev =>
        prev.map(opp =>
          opp.id === id
            ? { ...opp, status: success ? 'completed' as const : 'failed' as const }
            : opp
        )
      );
    }, 2000 + Math.random() * 3000);
  }, [opportunities]);

  const updateConfig = useCallback((updates: Partial<ScannerConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Get all completed opportunities (for history display)
  const getCompletedOpportunities = useCallback((): ArbitrageOpportunity[] => {
    return Array.from(completedOpportunitiesRef.current.values()).sort(
      (a, b) => (b.executedAt || 0) - (a.executedAt || 0)
    );
  }, []);

  // Get all executing opportunities
  const getExecutingOpportunities = useCallback((): ArbitrageOpportunity[] => {
    return Array.from(executingOpportunitiesRef.current.values());
  }, []);

  // Cleanup on unmount
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
