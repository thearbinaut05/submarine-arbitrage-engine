import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DEX API endpoints for price data
const DEX_APIS: Record<string, string> = {
  '1inch': 'https://api.1inch.dev/swap/v6.0',
  'paraswap': 'https://apiv5.paraswap.io',
  'kyberswap': 'https://aggregator-api.kyberswap.com',
};

// Token addresses by network
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
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
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  polygon: {
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  bsc: {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
};

interface ScanRequest {
  networks: string[];
  minProfitPercent: number;
  minProfitUsd: number;
}

interface PriceData {
  dex: string;
  price: number;
  liquidity: number;
  gasEstimate: number;
}

interface ArbitrageOpportunity {
  id: string;
  type: 'flash_loan' | 'flash_swap' | 'cross_chain';
  sourceNetwork: string;
  targetNetwork?: string;
  sourceDex: string;
  targetDex: string;
  tokenIn: string;
  tokenOut: string;
  profitPercent: number;
  profitUsd: number;
  gasEstimate: string;
  netProfit: number;
  confidence: number;
  timestamp: number;
  route: string[];
  priceData: {
    buy: PriceData;
    sell: PriceData;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ScanRequest = await req.json();
    const { networks, minProfitPercent, minProfitUsd } = body;

    // Scan for opportunities across networks and DEXes
    const opportunities: ArbitrageOpportunity[] = [];

    for (const network of networks) {
      const tokens = TOKEN_ADDRESSES[network];
      if (!tokens) continue;

      const tokenPairs = generateTokenPairs(Object.keys(tokens));

      for (const [tokenIn, tokenOut] of tokenPairs) {
        // Simulate price fetching from multiple DEXes
        const priceData = await simulatePriceDiscovery(network, tokenIn, tokenOut);
        
        if (priceData) {
          const opportunity = calculateArbitrageOpportunity(
            network,
            tokenIn,
            tokenOut,
            priceData,
            minProfitPercent,
            minProfitUsd
          );

          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      }
    }

    // Sort by net profit descending
    opportunities.sort((a, b) => b.netProfit - a.netProfit);

    return new Response(JSON.stringify({
      success: true,
      opportunities: opportunities.slice(0, 10), // Return top 10
      scannedNetworks: networks,
      timestamp: Date.now(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scanner error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateTokenPairs(tokens: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      pairs.push([tokens[i], tokens[j]]);
    }
  }
  return pairs;
}

async function simulatePriceDiscovery(
  network: string,
  tokenIn: string,
  tokenOut: string
): Promise<{ buy: PriceData; sell: PriceData } | null> {
  // In production, this would make actual API calls to DEX aggregators
  // For now, we simulate price discovery with realistic spreads
  
  const dexes = ['Uniswap V3', 'SushiSwap', 'Curve', '1inch', 'Balancer'];
  const basePrice = Math.random() * 1000 + 100;
  const spread = Math.random() * 0.03; // 0-3% spread
  
  const buyDex = dexes[Math.floor(Math.random() * dexes.length)];
  let sellDex = dexes[Math.floor(Math.random() * dexes.length)];
  while (sellDex === buyDex) {
    sellDex = dexes[Math.floor(Math.random() * dexes.length)];
  }

  return {
    buy: {
      dex: buyDex,
      price: basePrice,
      liquidity: Math.random() * 10000000,
      gasEstimate: Math.floor(Math.random() * 200000 + 100000),
    },
    sell: {
      dex: sellDex,
      price: basePrice * (1 + spread),
      liquidity: Math.random() * 10000000,
      gasEstimate: Math.floor(Math.random() * 200000 + 100000),
    },
  };
}

function calculateArbitrageOpportunity(
  network: string,
  tokenIn: string,
  tokenOut: string,
  priceData: { buy: PriceData; sell: PriceData },
  minProfitPercent: number,
  minProfitUsd: number
): ArbitrageOpportunity | null {
  const { buy, sell } = priceData;
  
  // Calculate profit
  const profitPercent = ((sell.price - buy.price) / buy.price) * 100;
  const tradeAmount = 10000; // $10k trade size
  const profitUsd = tradeAmount * (profitPercent / 100);
  
  // Estimate gas costs
  const gasPrice = 30; // gwei
  const totalGas = buy.gasEstimate + sell.gasEstimate;
  const gasCostEth = (totalGas * gasPrice) / 1e9;
  const ethPrice = 3500; // USD
  const gasCostUsd = gasCostEth * ethPrice;
  
  const netProfit = profitUsd - gasCostUsd;
  
  // Check thresholds
  if (profitPercent < minProfitPercent || profitUsd < minProfitUsd || netProfit <= 0) {
    return null;
  }
  
  // Calculate confidence based on liquidity and spread
  const liquidityScore = Math.min(buy.liquidity, sell.liquidity) / 1000000;
  const spreadScore = profitPercent / 2;
  const confidence = Math.min(60 + liquidityScore * 20 + spreadScore * 10, 98);
  
  return {
    id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'flash_loan',
    sourceNetwork: network,
    sourceDex: buy.dex,
    targetDex: sell.dex,
    tokenIn,
    tokenOut,
    profitPercent,
    profitUsd,
    gasEstimate: `$${gasCostUsd.toFixed(2)}`,
    netProfit,
    confidence,
    timestamp: Date.now(),
    route: [tokenIn, 'WETH', tokenOut].filter((v, i, a) => a.indexOf(v) === i),
    priceData,
  };
}
