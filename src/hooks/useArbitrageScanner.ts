import { useState, useCallback, useEffect, useRef } from 'react';
import { ArbitrageOpportunity, ScannerConfig, Network } from '@/types/defi';

const MOCK_DEXES = ['Uniswap V3', 'SushiSwap', 'Curve', '1inch', 'Balancer', 'PancakeSwap', 'QuickSwap'];
const MOCK_TOKENS = ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'CRV', 'MATIC'];
const NETWORKS: Network[] = ['ethereum', 'arbitrum', 'polygon', 'bsc'];

function generateMockOpportunity(): ArbitrageOpportunity {
  const sourceNetwork = NETWORKS[Math.floor(Math.random() * NETWORKS.length)];
  const isCrossChain = Math.random() > 0.7;
  const targetNetwork = isCrossChain 
    ? NETWORKS.filter(n => n !== sourceNetwork)[Math.floor(Math.random() * (NETWORKS.length - 1))]
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

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: true }));
  }, []);

  const stopScanner = useCallback(() => {
    setConfig(prev => ({ ...prev, isActive: false }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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

  useEffect(() => {
    if (config.isActive) {
      intervalRef.current = setInterval(() => {
        const newOpp = generateMockOpportunity();
        
        if (
          newOpp.profitPercent >= config.minProfitPercent &&
          newOpp.profitUsd >= config.minProfitUsd &&
          config.networks.includes(newOpp.sourceNetwork)
        ) {
          setOpportunities(prev => [newOpp, ...prev].slice(0, 50));
          setStats(prev => ({
            ...prev,
            totalScanned: prev.totalScanned + 1,
          }));

          if (config.autoExecute && newOpp.netProfit > 0 && newOpp.confidence > 80) {
            setTimeout(() => executeOpportunity(newOpp.id), 500);
          }
        }
      }, config.scanInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [config, executeOpportunity]);

  return {
    opportunities,
    config,
    stats,
    startScanner,
    stopScanner,
    toggleAutoExecute,
    executeOpportunity,
    updateConfig,
  };
}
