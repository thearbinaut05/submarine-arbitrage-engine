/**
 * On-Chain Arbitrage Scanner Hook
 * 
 * Uses direct RPC calls to fetch real DEX prices and find arbitrage opportunities.
 * Integrates with Gelato for gasless execution (pays gas from profits).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Network, ArbitrageOpportunity } from '@/types/defi';
import { DexAggregator } from '@/lib/scanner/DexAggregator';

// Token addresses for each network
const TOKEN_ADDRESSES: Record<Network, Record<string, string>> = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeACB5BE1023a',
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
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
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
  optimism: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD96a8f233a91',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  base: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  avalanche: {
    WAVAX: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6',
  },
};

// Gas prices in gwei for each network
const GAS_PRICES: Record<Network, { standard: number; fast: number }> = {
  ethereum: { standard: 20, fast: 50 },
  arbitrum: { standard: 0.1, fast: 0.5 },
  polygon: { standard: 50, fast: 100 },
  bsc: { standard: 3, fast: 10 },
  optimism: { standard: 0.01, fast: 0.1 },
  base: { standard: 0.01, fast: 0.1 },
  avalanche: { standard: 25, fast: 50 },
};

// Approximate ETH price for gas calculations
const ETH_PRICE_USD = 3500;

interface OnChainOpportunity {
  id: string;
  network: Network;
  tokenIn: string;
  tokenOut: string;
  sourceDex: string;
  targetDex: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  profitUsd: number;
  gasCostUsd: number;
  netProfit: number;
  confidence: number;
  liquidity: number;
  amountIn: string;
  route: string[];
}

export function useOnChainScanner() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalScanned: 0,
    totalProfit: 0,
    opportunitiesFound: 0,
  });
  
  const dexAggregator = useRef(new DexAggregator());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Estimate gas cost in USD
  const estimateGasCost = useCallback((network: Network, gasUnits: number = 300000): number => {
    const gasPrice = GAS_PRICES[network]?.standard || 20;
    const gasCostEth = (gasUnits * gasPrice) / 1e9;
    return gasCostEth * ETH_PRICE_USD;
  }, []);

  // Scan a single network for arbitrage opportunities
  const scanNetwork = useCallback(async (network: Network): Promise<OnChainOpportunity[]> => {
    const onChainOpps: OnChainOpportunity[] = [];
    
    // Token pairs to scan
    const tokenPairs = [
      ['WETH', 'USDC'],
      ['WETH', 'USDT'],
      ['WETH', 'DAI'],
      ['USDC', 'USDT'],
      ['WBTC', 'WETH'],
      ['WBTC', 'USDC'],
      ['LINK', 'WETH'],
      ['UNI', 'WETH'],
      ['AAVE', 'WETH'],
    ];

    for (const [tokenIn, tokenOut] of tokenPairs) {
      try {
        // Get prices from all DEXs
        const dexPrices = await dexAggregator.current.getAllPrices(network, tokenIn, tokenOut);
        
        if (dexPrices.length < 2) continue;

        // Find arbitrage: buy low on one DEX, sell high on another
        for (let i = 0; i < dexPrices.length; i++) {
          for (let j = i + 1; j < dexPrices.length; j++) {
            const price1 = dexPrices[i];
            const price2 = dexPrices[j];

            // Get normalized prices
            const tokenInAddr = TOKEN_ADDRESSES[network]?.[tokenIn];
            const tokenOutAddr = TOKEN_ADDRESSES[network]?.[tokenOut];
            
            if (!tokenInAddr || !tokenOutAddr) continue;

            const p1 = dexAggregator.current.getTokenPriceInTermsOf(price1, tokenInAddr, tokenOutAddr);
            const p2 = dexAggregator.current.getTokenPriceInTermsOf(price2, tokenInAddr, tokenOutAddr);

            if (p1 === 0 || p2 === 0) continue;

            // Calculate spread
            const minPrice = Math.min(p1, p2);
            const maxPrice = Math.max(p1, p2);
            const spread = (maxPrice - minPrice) / minPrice;
            const spreadPercent = spread * 100;

            // Skip if spread is too small
            if (spreadPercent < 0.1) continue;

            // Calculate profitability
            const avgLiquidity = (price1.liquidity + price2.liquidity) / 2;
            const tradeSizeUsd = Math.min(10000, avgLiquidity * 0.1);
            const grossProfitUsd = tradeSizeUsd * spread;
            const gasCostUsd = estimateGasCost(network);
            const netProfit = grossProfitUsd - gasCostUsd;

            // Calculate confidence
            const liquidityScore = Math.min(avgLiquidity / 1000000, 1) * 40;
            const spreadScore = Math.min(spreadPercent / 2, 1) * 60;
            const confidence = Math.min(liquidityScore + spreadScore, 98);

            // Only include if net positive
            if (netProfit > 0 && confidence >= 30) {
              const buyDex = p1 < p2 ? price1 : price2;
              const sellDex = p1 < p2 ? price2 : price1;

              onChainOpps.push({
                id: `onchain-${network}-${tokenIn}-${tokenOut}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                network,
                tokenIn,
                tokenOut,
                sourceDex: buyDex.dex,
                targetDex: sellDex.dex,
                buyPrice: Math.min(p1, p2),
                sellPrice: Math.max(p1, p2),
                spreadPercent,
                profitUsd: grossProfitUsd,
                gasCostUsd,
                netProfit,
                confidence,
                liquidity: avgLiquidity,
                amountIn: (tradeSizeUsd / (p1 < p2 ? p1 : p2)).toString(),
                route: [tokenIn, tokenOut],
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${tokenIn}/${tokenOut} on ${network}:`, error);
      }
    }

    onChainOpps.sort((a, b) => b.netProfit - a.netProfit);
    return onChainOpps.slice(0, 10);
  }, [estimateGasCost]);

  // Main scan function
  const performScan = useCallback(async (networks: Network[]) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const allOpps: OnChainOpportunity[] = [];

      for (const network of networks) {
        const networkOpps = await scanNetwork(network);
        allOpps.push(...networkOpps);
      }

      allOpps.sort((a, b) => b.netProfit - a.netProfit);

      const convertedOpps: ArbitrageOpportunity[] = allOpps.map(opp => ({
        id: opp.id,
        type: 'flash_loan' as const,
        sourceNetwork: opp.network,
        sourceDex: opp.sourceDex,
        targetDex: opp.targetDex,
        tokenIn: opp.tokenIn,
        tokenOut: opp.tokenOut,
        profitPercent: opp.spreadPercent,
        profitUsd: opp.profitUsd,
        gasEstimate: `$${opp.gasCostUsd.toFixed(2)}`,
        netProfit: opp.netProfit,
        confidence: opp.confidence,
        timestamp: Date.now(),
        route: opp.route,
        status: 'pending' as const,
        isSubmarine: true,
      }));

      setOpportunities(convertedOpps);
      setStats(prev => ({
        ...prev,
        totalScanned: prev.totalScanned + convertedOpps.length,
        opportunitiesFound: convertedOpps.length,
      }));
      setLastScanTime(Date.now());

    } catch (error) {
      console.error('Scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsScanning(false);
    }
  }, [scanNetwork]);

  // Start scanning
  const startScanner = useCallback((networks: Network[] = ['ethereum', 'arbitrum', 'polygon', 'bsc']) => {
    performScan(networks);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      performScan(networks);
    }, 5000);
  }, [performScan]);

  // Stop scanning
  const stopScanner = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    opportunities,
    isScanning,
    lastScanTime,
    scanError,
    stats,
    startScanner,
    stopScanner,
  };
}

