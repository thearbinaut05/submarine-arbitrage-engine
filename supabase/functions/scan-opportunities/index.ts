import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deployed FlashArbExecutor contract addresses
const FLASH_ARB_EXECUTOR: Record<string, string> = {
  ethereum: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  arbitrum: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
  polygon: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  bsc: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  optimism: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  base: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  avalanche: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
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
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
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
    cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF',
  },
  avalanche: {
    WAVAX: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    WBTC: '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
  },
};

// DEX Factory addresses
const DEX_FACTORIES: Record<string, { uniswapV2: string; uniswapV3: string; sushiswap: string }> = {
  ethereum: {
    uniswapV2: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
  },
  arbitrum: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
  polygon: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
  bsc: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
  optimism: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
  base: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
  avalanche: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
};

// RPC URLs
const RPC_URLS: Record<string, string> = {
  ethereum: 'https://eth.llamarpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  bsc: 'https://bsc-dataseed.binance.org',
  optimism: 'https://mainnet.optimism.io',
  base: 'https://mainnet.base.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

// Uniswap V3 fee tiers
const UNISWAP_V3_FEE_TIERS = [500, 3000, 10000];

interface ScanRequest {
  networks: string[];
  minProfitPercent: number;
  minProfitUsd: number;
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
  isSubmarine: boolean;
  executorAddress: string;
}

// Fetch price from a single Uniswap V2 pair
async function fetchUniswapV2Price(
  rpcUrl: string,
  pairAddress: string
): Promise<{ price: number; liquidity: number } | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: pairAddress,
          data: '0x0902f1ac'
        }, 'latest']
      })
    });

    const data = await response.json();
    if (!data.result || data.result === '0x') return null;

    const result = data.result.slice(2);
    const reserve0 = BigInt('0x' + result.slice(0, 64));
    const reserve1 = BigInt('0x' + result.slice(64, 128));

    const amount0 = Number(reserve0) / 1e18;
    const amount1 = Number(reserve1) / 1e6;

    if (amount0 === 0 || amount1 === 0) return null;

    const price = amount1 / amount0;
    const liquidity = (amount0 + amount1) * 2 * 100;

    return { price, liquidity };
  } catch {
    return null;
  }
}

// Get Uniswap V2 pair address from factory
async function getPairAddress(
  rpcUrl: string,
  factoryAddress: string,
  token0: string,
  token1: string
): Promise<string | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: factoryAddress,
          data: '0xe6a43905' + token0.slice(2).padStart(64, '0') + token1.slice(2).padStart(64, '0')
        }, 'latest']
      })
    });

    const data = await response.json();
    if (!data.result || data.result === '0x') return null;

    const address = '0x' + data.result.slice(26);
    if (address === '0x0000000000000000000000000000000000000000') return null;

    return address;
  } catch {
    return null;
  }
}

// Get Uniswap V3 pool address
async function getUniswapV3PoolAddress(
  rpcUrl: string,
  factoryAddress: string,
  token0: string,
  token1: string,
  fee: number
): Promise<string | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: factoryAddress,
          data: '0xa16431f6' + token0.slice(2).padStart(64, '0') + token1.slice(2).padStart(64, '0') + fee.toString(16).padStart(64, '0')
        }, 'latest']
      })
    });

    const data = await response.json();
    if (!data.result || data.result === '0x') return null;

    const address = '0x' + data.result.slice(26);
    if (address === '0x0000000000000000000000000000000000000000') return null;

    return address;
  } catch {
    return null;
  }
}

// Get price from Uniswap V3 pool
async function getUniswapV3Price(
  rpcUrl: string,
  poolAddress: string
): Promise<{ price: number; liquidity: number } | null> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: poolAddress,
          data: '0x3850c7bd'
        }, 'latest']
      })
    });

    const data = await response.json();
    if (!data.result || data.result === '0x') return null;

    const result = data.result.slice(2);
    const sqrtPriceX96 = BigInt('0x' + result.slice(0, 64));
    const price = Number(sqrtPriceX96) ** 2 / (2 ** 192);
    
    return { price, liquidity: 1000000 };
  } catch {
    return null;
  }
}

// Scan for arbitrage opportunities on a network
async function scanNetwork(
  network: string,
  minProfitPercent: number,
  minProfitUsd: number
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];
  const rpcUrl = RPC_URLS[network];
  if (!rpcUrl) return [];

  const factories = DEX_FACTORIES[network];
  const tokens = TOKEN_ADDRESSES[network];
  if (!factories || !tokens) return [];

  const executorAddress = FLASH_ARB_EXECUTOR[network];

  const tokenPairs = [
    ['WETH', 'USDC'],
    ['WETH', 'USDT'],
    ['WETH', 'DAI'],
    ['USDC', 'USDT'],
    ['WBTC', 'WETH'],
    ['LINK', 'WETH'],
  ];

  for (const [tokenIn, tokenOut] of tokenPairs) {
    const tokenInAddr = tokens[tokenIn];
    const tokenOutAddr = tokens[tokenOut];
    
    if (!tokenInAddr || !tokenOutAddr) continue;

    try {
      const prices: { dex: string; price: number; liquidity: number }[] = [];

      // Uniswap V2
      const v2Pair = await getPairAddress(rpcUrl, factories.uniswapV2, tokenInAddr, tokenOutAddr);
      if (v2Pair) {
        const v2Price = await fetchUniswapV2Price(rpcUrl, v2Pair);
        if (v2Price) {
          prices.push({ dex: 'Uniswap V2', ...v2Price });
        }
      }

      // SushiSwap
      const sushiPair = await getPairAddress(rpcUrl, factories.sushiswap, tokenInAddr, tokenOutAddr);
      if (sushiPair) {
        const sushiPrice = await fetchUniswapV2Price(rpcUrl, sushiPair);
        if (sushiPrice) {
          prices.push({ dex: 'SushiSwap', ...sushiPrice });
        }
      }

      // Uniswap V3
      for (const fee of UNISWAP_V3_FEE_TIERS) {
        const v3Pool = await getUniswapV3PoolAddress(rpcUrl, factories.uniswapV3, tokenInAddr, tokenOutAddr, fee);
        if (v3Pool) {
          const v3Price = await getUniswapV3Price(rpcUrl, v3Pool);
          if (v3Price) {
            prices.push({ dex: `Uniswap V3 (${fee / 10000}%)`, ...v3Price });
          }
        }
      }

      if (prices.length < 2) continue;

      for (let i = 0; i < prices.length; i++) {
        for (let j = i + 1; j < prices.length; j++) {
          const buyPrice = Math.min(prices[i].price, prices[j].price);
          const sellPrice = Math.max(prices[i].price, prices[j].price);
          
          const spread = (sellPrice - buyPrice) / buyPrice;
          const spreadPercent = spread * 100;

          const tradeAmount = 10000;
          const profitUsd = tradeAmount * spread;
          const gasEstimate = 20;
          const netProfit = profitUsd - gasEstimate;

          if (
            spreadPercent >= minProfitPercent &&
            profitUsd >= minProfitUsd &&
            netProfit > 0
          ) {
            const buyDex = prices[i].price < prices[j].price ? prices[i] : prices[j];
            const sellDex = prices[i].price < prices[j].price ? prices[j] : prices[i];

            opportunities.push({
              id: `opp-${network}-${tokenIn}-${tokenOut}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'flash_loan',
              sourceNetwork: network,
              sourceDex: buyDex.dex,
              targetDex: sellDex.dex,
              tokenIn,
              tokenOut,
              profitPercent: spreadPercent,
              profitUsd,
              gasEstimate: `$${gasEstimate.toFixed(2)}`,
              netProfit,
              confidence: Math.min(spreadPercent * 30 + 60, 95),
              timestamp: Date.now(),
              route: [tokenIn, tokenOut],
              isSubmarine: true,
              executorAddress,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${tokenIn}/${tokenOut} on ${network}:`, error);
    }
  }

  return opportunities;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ScanRequest = await req.json();
    const { networks, minProfitPercent = 0.05, minProfitUsd = 10 } = body;

    const opportunities: ArbitrageOpportunity[] = [];

    const scanPromises = networks.map(network => 
      scanNetwork(network, minProfitPercent, minProfitUsd)
    );

    const results = await Promise.all(scanPromises);
    
    for (const networkOpps of results) {
      opportunities.push(...networkOpps);
    }

    opportunities.sort((a, b) => b.netProfit - a.netProfit);

    return new Response(JSON.stringify({
      success: true,
      opportunities: opportunities.slice(0, 20),
      scannedNetworks: networks,
      totalFound: opportunities.length,
      timestamp: Date.now(),
      deployedContracts: FLASH_ARB_EXECUTOR,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scanner error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
