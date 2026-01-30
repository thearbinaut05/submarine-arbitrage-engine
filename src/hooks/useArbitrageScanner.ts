import { useState, useCallback, useEffect, useRef } from 'react';
import { ArbitrageOpportunity, ScannerConfig, Network } from '@/types/defi';
import { priceFetcher } from '@/lib/dex/priceFetcher';

const MOCK_DEXES = ['Uniswap V3', 'SushiSwap', 'Curve', '1inch', 'Balancer', 'PancakeSwap', 'QuickSwap'];
const MOCK_TOKENS = ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'CRV', 'MATIC'];
const MOCK_NETWORKS: Network[] = ['ethereum', 'arbitrum', 'polygon', 'bsc'];

// Flag to use real on-chain data instead of mock
const USE_REAL_DATA = true;

function generateMockOpportunity(): ArbitrageOpportunity {
  const sourceNetwork = MOCK_NETWORKS[Math.floor(Math.random() * MOCK_NETWORKS.length)];
  const isCrossChain = Math.random() > 0.7;
  const targetNetwork = isCrossChain 
    ? MOCK_NETWORKS.filter(n => n !== sourceNetwork)[Math.floor(Math.random() * (MOCK_NETWORKS.length - 1))]
    : undefined;

  const profitPercent = Math.random() * 2 + 0.1;
  const baseAmount = Math.random() * 100000 + 10000;
  const profitUsd = baseAmount * (profitPercent / 100);
  const gasEstimate = (Math.random() * 50 + 10).toFixed(2);
  const netProfit = profitUsd - parseFloat(gasEstimate);

  const tokenIn = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
  let tokenOut = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
  while (tokenOut === tokenIn) {
    tokenOut = MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)];
  }

  return {
    id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: isCrossChain ? 'cross_chain' : Math.random() > 0.5 ? 'flash_loan' : 'flash_swap',
    sourceNetwork,
    targetNetwork,
    sourceDex: MOCK_DEXES[Math.floor(Math.random() * MOCK_DEXES.length)],
    targetDex: MOCK_DEXES[Math.floor(Math.random() * MOCK_DEXES.length)],
    tokenIn,
    tokenOut,
    profitPercent,
    profitUsd,
    gasEstimate: `$${gasEstimate}`,
    netProfit,
    confidence: Math.random() * 40 + 60,
    timestamp: Date.now(),
    route: [tokenIn, 'WETH', tokenOut].filter((v, i, a) => a.indexOf(v) === i),
    status: 'pending',
  };
}

export function useArbitrageScanner() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [config, setConfig] = useState<ScannerConfig>({
    isActive: false,
    autoExecute: false,
    minProfitPercent: 0.5,
    minProfitUsd: 50,
    maxGasGwei: 100,
    networks: ['ethereum', 'arbitrum', 'polygon', 'bsc'],
    scanInterval: 2000,
  });
  const [stats, setStats] = useState({
    totalScanned: 0,
    totalProfit: 0,
    successRate: 0,
    avgProfit: 0,
  });
  const [useRealScanner, setUseRealScanner] = useState(USE_REAL_DATA);
  const [isRealScanning, setIsRealScanning] = useState(false);
  const [lastRealScanTime, setLastRealScanTime] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convert internal opportunity format to frontend format
  const convertToOpportunity = (
    internalOpp: Awaited<ReturnType<typeof priceFetcher.scanArbitrageOpportunities>>[number]
  ): ArbitrageOpportunity => {
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
      gasEstimate: `$${internalOpp.gasEstimate.toFixed(2)}`,
      netProfit: internalOpp.netProfit,
      confidence: internalOpp.confidence,
      timestamp: Date.now(),
      route: [internalOpp.tokenIn, internalOpp.tokenOut],
      status: 'pending',
      isSubmarine: true,
    };
  };

  // Scan using real on-chain data
  const scanWithRealData = useCallback(async () => {
    if (!config.networks.length) return;

    setIsRealScanning(true);
    setScanError(null);

    try {
      const allOpportunities: ArbitrageOpportunity[] = [];

      for (const network of config.networks) {
        const networkOpps = await priceFetcher.scanArbitrageOpportunities(
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
      setLastRealScanTime(Date.now());
      
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
      console.error('Real scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRealScanning(false);
    }
  }, [config.networks, config.minProfitPercent, config.minProfitUsd, config.autoExecute]);

  const startScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: true }));
    
    if (useRealScanner) {
      // Start real on-chain scanning
      scanWithRealData();
      
      // Continuous scanning
      intervalRef.current = setInterval(() => {
        scanWithRealData();
      }, config.scanInterval);
    }
  }, [useRealScanner, config.scanInterval, scanWithRealData]);

  const stopScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: false }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRealScanning(false);
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

  const toggleRealScanner = useCallback(() => {
    setUseRealScanner(prev => !prev);
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
    useRealScanner,
    toggleRealScanner,
    isRealScanning,
    lastRealScanTime,
    scanError,
  };
}

