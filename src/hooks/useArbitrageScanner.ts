import { useState, useCallback, useEffect, useRef } from 'react';
import { ArbitrageOpportunity, ScannerConfig, Network } from '@/types/defi';
import { coinGeckoFetcher } from '@/lib/dex/coinGeckoFetcher';

// Flag to use CoinGecko API instead of on-chain RPC
const USE_COINGECKO_API = true;

// Default thresholds optimized for CoinGecko API
const DEFAULT_MIN_PROFIT_PERCENT = 0.05; // 0.05% spread
const DEFAULT_MIN_PROFIT_USD = 5; // $5 minimum profit
const DEFAULT_SCAN_INTERVAL = 10000; // 10 seconds (API rate limit)

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

  // Convert CoinGecko opportunity format to frontend format
  const convertToOpportunity = (
    internalOpp: Awaited<ReturnType<typeof coinGeckoFetcher.scanArbitrageOpportunities>>[number]
  ): ArbitrageOpportunity => {
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
      gasEstimate: `$${internalOpp.gasEstimate.toFixed(2)}`,
      netProfit: internalOpp.netProfit,
      confidence: internalOpp.confidence,
      timestamp: Date.now(),
      route: [internalOpp.tokenIn, internalOpp.tokenOut],
      status: 'pending',
      isSubmarine: true,
    };
  };

  // Scan using CoinGecko API
  const scanWithCoinGecko = useCallback(async () => {
    if (!config.networks.length) return;

    setIsScanning(true);
    setScanError(null);

    try {
      // Update API status
      const status = coinGeckoFetcher.getStatus();
      setApiStatus({
        cacheSize: status.cacheSize,
        lastCallTime: status.lastCallTime,
      });

      const allOpportunities: ArbitrageOpportunity[] = [];

      for (const network of config.networks) {
        const networkOpps = await coinGeckoFetcher.scanArbitrageOpportunities(
          network as Network,
          config.minProfitPercent,
          config.minProfitUsd
        );
        
        for (const opp of networkOpps) {
          allOpportunities.push(convertToOpportunity(opp));
        }
      }

      // Sort by net profit and take top opportunities
      allOpportunities.sort((a, b) => b.netProfit - a.netProfit);
      
      setOpportunities(prev => [...allOpportunities, ...prev].slice(0, 50));
      setLastScanTime(Date.now());
      
      setStats(prev => ({
        ...prev,
        totalScanned: prev.totalScanned + allOpportunities.length,
      }));

      if (config.autoExecute) {
        for (const opp of allOpportunities.slice(0, 3)) {
          if (opp.netProfit > 0 && opp.confidence > 80) {
            setTimeout(() => executeOpportunity(opp.id), 1000);
          }
        }
      }
    } catch (error) {
      console.error('CoinGecko scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Unknown error - check API rate limits');
    } finally {
      setIsScanning(false);
    }
  }, [config.networks, config.minProfitPercent, config.minProfitUsd, config.autoExecute]);

  const startScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: true }));
    
    // Clear cache on start to get fresh data
    coinGeckoFetcher.clearCache();
    
    // Initial scan
    scanWithCoinGecko();
    
    // Continuous scanning
    intervalRef.current = setInterval(() => {
      scanWithCoinGecko();
    }, config.scanInterval);
  }, [config.scanInterval, scanWithCoinGecko]);

  const stopScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: false }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const toggleAutoExecute = useCallback(() => {
    setConfig(prev => ({ ...prev, autoExecute: !prev.autoExecute }));
  }, []);

  const executeOpportunity = useCallback((id: string) => {
    setOpportunities(prev => 
      prev.map(opp => 
        opp.id === id ? { ...opp, status: 'executing' as const } : opp
      )
    );

    setTimeout(() => {
      const success = Math.random() > 0.2;
      setOpportunities(prev => 
        prev.map(opp => 
          opp.id === id 
            ? { ...opp, status: success ? 'completed' as const : 'failed' as const } 
            : opp
        )
      );

      if (success) {
        const opp = opportunities.find(o => o.id === id);
        if (opp) {
          setStats(prev => ({
            ...prev,
            totalProfit: prev.totalProfit + opp.netProfit,
            successRate: ((prev.successRate * prev.totalScanned + 1) / (prev.totalScanned + 1)),
          }));
        }
      }
    }, 2000 + Math.random() * 3000);
  }, [opportunities]);

  const updateConfig = useCallback((updates: Partial<ScannerConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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
  };
}

