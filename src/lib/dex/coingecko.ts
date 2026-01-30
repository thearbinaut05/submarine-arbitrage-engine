/**
 * CoinGecko API Service for Real-Time Price Data
 * 
 * Free API endpoints for fetching token prices across multiple DEXs
 * API Docs: https://www.coingecko.com/en/api/documentation
 */

// CoinGecko API base URLs (free tier)
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Rate limiting for free tier (10-50 calls/minute) - optimized
const RATE_LIMIT_DELAY = 1000; // 1 second between calls (faster but still safe)

// Token ID mappings for supported tokens
const TOKEN_IDS: Record<string, Record<string, string>> = {
  ethereum: {
    ETH: 'ethereum',
    WETH: 'ethereum',
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
    WBTC: 'wrapped-bitcoin',
    LINK: 'chainlink',
    UNI: 'uniswap',
    AAVE: 'aave',
    MATIC: 'matic-network',
  },
  arbitrum: {
    ETH: 'ethereum',
    WETH: 'ethereum',
    ARB: 'arbitrum',
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
    WBTC: 'wrapped-bitcoin',
    LINK: 'chainlink',
    UNI: 'uniswap',
  },
  polygon: {
    MATIC: 'matic-network',
    WMATIC: 'matic-network',
    WETH: 'ethereum',
    ETH: 'ethereum',
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
    QUICK: 'quick',
    AAVE: 'aave',
  },
  bsc: {
    BNB: 'binancecoin',
    WBNB: 'binancecoin',
    ETH: 'ethereum',
    WETH: 'ethereum',
    BUSD: 'binance-usd',
    USDT: 'tether',
    USDC: 'usd-coin',
    BTC: 'bitcoin',
    BTCB: 'bitcoin',
    CAKE: 'pancakeswap-token',
  },
  optimism: {
    ETH: 'ethereum',
    WETH: 'ethereum',
    USDC: 'usd-coin',
    USDT: 'tether',
    DAI: 'dai',
  },
  base: {
    ETH: 'ethereum',
    WETH: 'ethereum',
    USDC: 'usd-coin',
    CBETH: 'coinbase-wrapped-staked-eth',
  },
};

// DEX platforms supported by CoinGecko (lowercase for matching)
const DEX_PLATFORMS = [
  'uniswap',
  'sushiswap',
  'quickswap',
  'pancakeswap',
  'pancake',
  'balancer',
  'curve',
  '1inch',
  'kyberswap',
  'meshswap',
  'traderjoe',
  'spookyswap',
  'spiritswap',
];

// Quote tokens for trading pairs
const QUOTE_TOKENS = ['USDC', 'USDT', 'DAI', 'WETH', 'ETH', 'WBTC', 'BTC', 'BNB', 'BUSD'];

export interface TokenPrice {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
}

export interface DexPrice {
  dex: string;
  baseToken: string;
  quoteToken: string;
  price: number;
  volume24h: number;
  liquidity: number;
  priceChange24h: number;
  tradeUrl: string;
}

export interface ArbitrageOpportunity {
  id: string;
  network: string;
  tokenIn: string;
  tokenOut: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  profitUsd: number;
  gasEstimate: number;
  netProfit: number;
  confidence: number;
  timestamp: number;
  route: string[];
}

// Rate limiter singleton
let lastApiCall = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  if (timeSinceLastCall < RATE_LIMIT_DELAY) {
    await new Promise(resolve => 
      setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastCall)
    );
  }
  
  lastApiCall = Date.now();
}

// Simple in-memory cache
const priceCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

function getCached<T>(key: string): T | null {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  priceCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Get token price from CoinGecko
 */
export async function getTokenPrice(
  network: string,
  tokenSymbol: string
): Promise<TokenPrice | null> {
  const tokenId = TOKEN_IDS[network]?.[tokenSymbol];
  if (!tokenId) {
    console.warn(`Token ${tokenSymbol} not found for network ${network}`);
    return null;
  }

  const cacheKey = `price_${network}_${tokenSymbol}`;
  const cached = getCached<TokenPrice>(cacheKey);
  if (cached) return cached;

  await rateLimit();

  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tokenData = data[tokenId];

    if (!tokenData) {
      return null;
    }

    const result: TokenPrice = {
      id: tokenId,
      symbol: tokenSymbol,
      name: tokenSymbol,
      currentPrice: tokenData.usd,
      priceChange24h: tokenData.usd_24h_change || 0,
      priceChangePercentage24h: tokenData.usd_24h_change || 0,
      volume24h: tokenData.usd_24h_vol || 0,
      marketCap: tokenData.usd_market_cap || 0,
      lastUpdated: new Date().toISOString(),
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`Error fetching ${tokenSymbol} price:`, error);
    return null;
  }
}

/**
 * Get multiple token prices at once (more efficient)
 */
export async function getMultipleTokenPrices(
  network: string,
  tokenSymbols: string[]
): Promise<Map<string, TokenPrice>> {
  const results = new Map<string, TokenPrice>();

  // Filter tokens that have mappings
  const validTokens = tokenSymbols.filter(
    symbol => TOKEN_IDS[network]?.[symbol]
  );

  if (validTokens.length === 0) {
    return results;
  }

  const tokenIds = validTokens.map(
    symbol => TOKEN_IDS[network]![symbol]
  ).join(',');

  const cacheKey = `prices_${network}_${validTokens.join('_')}`;
  const cached = getCached<Map<string, TokenPrice>>(cacheKey);
  if (cached) return cached;

  await rateLimit();

  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${tokenIds}&vs_currencies=usd&include_24hr_change=true&include_24h_vol=true&include_market_cap=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    for (const symbol of validTokens) {
      const tokenId = TOKEN_IDS[network]![symbol];
      const tokenData = data[tokenId];

      if (tokenData) {
        const result: TokenPrice = {
          id: tokenId,
          symbol,
          name: symbol,
          currentPrice: tokenData.usd,
          priceChange24h: tokenData.usd_24h_change || 0,
          priceChangePercentage24h: tokenData.usd_24h_change || 0,
          volume24h: tokenData.usd_24h_vol || 0,
          marketCap: tokenData.usd_market_cap || 0,
          lastUpdated: new Date().toISOString(),
        };
        results.set(symbol, result);
      }
    }

    setCache(cacheKey, results);
  } catch (error) {
    console.error('Error fetching multiple token prices:', error);
  }

  return results;
}

/**
 * Get prices from specific DEX on a network
 * Uses CoinGecko'sDEX ticker endpoint
 */
export async function getDexPrices(
  network: string,
  tokenSymbol: string,
  dexName: string
): Promise<DexPrice[]> {
  const tokenId = TOKEN_IDS[network]?.[tokenSymbol];
  if (!tokenId) {
    return [];
  }

  await rateLimit();

  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/tickers?include_exchange=true&depth=true`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tickers = data.tickers || [];

    // Filter by DEX name
    const dexTickers = tickers.filter((ticker: { exchange: { name: string } }) =>
      ticker.exchange?.name?.toLowerCase().includes(dexName.toLowerCase())
    );

    return dexTickers.map((ticker: { market: { identifier: string; name: string }; base: string; target: string; last: number; volume: number; trade_url: string }) => ({
      dex: ticker.market?.name || dexName,
      baseToken: ticker.base,
      quoteToken: ticker.target,
      price: ticker.last,
      volume24h: ticker.volume || 0,
      liquidity: ticker.volume * ticker.last || 0,
      priceChange24h: 0, // Tickers endpoint doesn't include 24h change
      tradeUrl: ticker.trade_url || '',
    }));
  } catch (error) {
    console.error(`Error fetching DEX prices from ${dexName}:`, error);
    return [];
  }
}

/**
 * Get all available DEX prices for a token
 */
export async function getAllDexPricesForToken(
  network: string,
  tokenSymbol: string
): Promise<DexPrice[]> {
  const tokenId = TOKEN_IDS[network]?.[tokenSymbol];
  if (!tokenId) {
    return [];
  }

  const cacheKey = `dex_prices_${network}_${tokenSymbol}`;
  const cached = getCached<DexPrice[]>(cacheKey);
  if (cached) return cached;

  await rateLimit();

  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/tickers?include_exchange=true&depth=true&order=volume_desc`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tickers = data.tickers || [];

    // Filter for stablecoin pairs (include both DEXs and CEXs for broader arbitrage detection)
    const dexPrices: DexPrice[] = tickers
      .filter((ticker: { target: string; trust_score: string }) =>
        ['USDC', 'USDT', 'DAI', 'WETH', 'ETH', 'WBTC', 'BTC', 'BUSD'].includes(ticker.target) &&
        ticker.trust_score !== 'red' // Skip red trust score
      )
      .slice(0, 20) // Limit to top 20 results
      .map((ticker: {
        market: { identifier: string; name: string };
        base: string;
        target: string;
        last: number;
        volume: number;
        trade_url: string;
        trust_score: string;
      }) => ({
        dex: ticker.market?.name || 'Unknown',
        baseToken: ticker.base,
        quoteToken: ticker.target,
        price: ticker.last,
        volume24h: ticker.volume || 0,
        liquidity: (ticker.volume || 0) * ticker.last,
        priceChange24h: ticker.trust_score === 'green' ? 0.5 : 0,
        tradeUrl: ticker.trade_url || '',
      }));

    setCache(cacheKey, dexPrices);
    return dexPrices;
  } catch (error) {
    console.error(`Error fetching all DEX prices for ${tokenSymbol}:`, error);
    return [];
  }
}

/**
 * Get price history for a token (for trend analysis)
 */
export async function getPriceHistory(
  network: string,
  tokenSymbol: string,
  days: number = 1
): Promise<{ timestamp: number; price: number }[]> {
  const tokenId = TOKEN_IDS[network]?.[tokenSymbol];
  if (!tokenId) {
    return [];
  }

  await rateLimit();

  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices || [];

    return prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  } catch (error) {
    console.error(`Error fetching price history for ${tokenSymbol}:`, error);
    return [];
  }
}

/**
 * Scan for arbitrage opportunities between DEXs
 * 
 * CORRECT ARBITRAGE LOGIC:
 * - Find the SAME token trading at different prices on different DEXs
 * - Buy cheap on DEX A, sell expensive on DEX B
 * - Profit = price difference (minus fees and gas)
 */
export async function scanArbitrageOpportunities(
  network: string,
  tokenPairs: string[][],
  minProfitPercent: number = 0.1,
  minProfitUsd: number = 10
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];
  const gasEstimate = 15; // Average gas cost in USD
  const TRADE_AMOUNT = 10000; // Simulated $10k trade for calculations

  for (const [tokenSymbol, quoteToken] of tokenPairs) {
    try {
      // Get all DEX prices for this trading pair
      const dexPrices = await getAllDexPricesForTokenOnQuote(network, tokenSymbol, quoteToken);
      
      if (dexPrices.length < 2) {
        continue; // Need at least 2 DEXs to find arbitrage
      }

      // Get the base token price in USD for conversion
      const tokenData = await getTokenPrice(network, tokenSymbol);
      if (!tokenData) {
        continue;
      }
      const tokenUsdPrice = tokenData.currentPrice;

      // Group prices by DEX and find best price (highest volume = most reliable)
      const dexPriceMap = new Map<string, { price: number; volume24h: number; liquidity: number; dex: string }>();
      
      for (const priceInfo of dexPrices) {
        const existing = dexPriceMap.get(priceInfo.dex);
        if (!existing || priceInfo.volume24h > existing.volume24h) {
          dexPriceMap.set(priceInfo.dex, {
            price: priceInfo.price,
            volume24h: priceInfo.volume24h,
            liquidity: priceInfo.liquidity,
            dex: priceInfo.dex
          });
        }
      }

      // Find best buy and sell prices across DEXs
      const prices = Array.from(dexPriceMap.values());
      if (prices.length < 2) continue;

      // Sort by price to find cheapest and most expensive
      prices.sort((a, b) => a.price - b.price);

      const cheapest = prices[0]; // Best price to buy
      const expensive = prices[prices.length - 1]; // Best price to sell

      if (cheapest.price === 0 || expensive.price === 0) continue;

      // Calculate spread (percentage difference)
      const spread = expensive.price - cheapest.price;
      const spreadPercent = (spread / cheapest.price) * 100;

      // Calculate profits
      // Buy 1 unit cheap, sell 1 unit expensive
      const profitPerUnit = spread;
      const profitUsd = (profitPerUnit / cheapest.price) * TRADE_AMOUNT;
      const netProfit = profitUsd - gasEstimate;

      // Check liquidity requirements
      const minLiquidity = 5000; // $5k minimum liquidity
      if (
        spreadPercent >= minProfitPercent &&
        profitUsd >= minProfitUsd &&
        netProfit > 0 &&
        cheapest.liquidity > minLiquidity &&
        expensive.liquidity > minLiquidity
      ) {
        opportunities.push({
          id: `arb-${network}-${tokenSymbol}-${quoteToken}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          network,
          tokenIn: tokenSymbol,
          tokenOut: quoteToken,
          buyDex: cheapest.dex,
          sellDex: expensive.dex,
          buyPrice: cheapest.price,
          sellPrice: expensive.price,
          spreadPercent,
          profitUsd,
          gasEstimate,
          netProfit,
          confidence: Math.min(spreadPercent * 30 + 50, 98),
          timestamp: Date.now(),
          route: [tokenSymbol, quoteToken],
        });
      }
    } catch (error) {
      console.error(`Error scanning ${tokenSymbol}/${quoteToken} on ${network}:`, error);
    }
  }

  // Sort by net profit and return top opportunities
  opportunities.sort((a, b) => b.netProfit - a.netProfit);
  return opportunities.slice(0, 20);
}

/**
 * Get prices for a token against a specific quote token from all DEXs
 * This is the correct way to find arbitrage - same pair across DEXs
 */
async function getAllDexPricesForTokenOnQuote(
  network: string,
  tokenSymbol: string,
  quoteToken: string
): Promise<DexPrice[]> {
  const tokenId = TOKEN_IDS[network]?.[tokenSymbol];
  if (!tokenId) {
    return [];
  }

  const cacheKey = `dex_prices_${network}_${tokenSymbol}_${quoteToken}`;
  const cached = getCached<DexPrice[]>(cacheKey);
  if (cached) return cached;

  await rateLimit();

  try {
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/tickers?include_exchange=true&depth=true&order=volume_desc`
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tickers = data.tickers || [];

    // Filter tickers by target/quote token (include both DEXs and CEXs)
    const filteredTickers = tickers
      .filter((ticker: { target: string; trust_score: string }) =>
        ticker.target?.toUpperCase() === quoteToken &&
        ticker.trust_score !== 'red' // Skip red trust score
      );

    const dexPrices: DexPrice[] = filteredTickers
      .slice(0, 15) // Limit to top 15 results per pair
      .map((ticker: { 
        market: { identifier: string; name: string }; 
        base: string; 
        target: string; 
        last: number; 
        volume: number; 
        trade_url: string;
      }) => ({
        dex: ticker.market?.name || 'Unknown',
        baseToken: ticker.base,
        quoteToken: ticker.target,
        price: ticker.last,
        volume24h: ticker.volume || 0,
        liquidity: (ticker.volume || 0) * ticker.last,
        priceChange24h: 0,
        tradeUrl: ticker.trade_url || '',
      }));

    setCache(cacheKey, dexPrices);
    return dexPrices;
  } catch (error) {
    console.error(`Error fetching DEX prices for ${tokenSymbol}/${quoteToken}:`, error);
    return [];
  }
}

/**
 * Get market overview for a network
 */
export async function getNetworkOverview(network: string): Promise<{
  totalMarketCap: number;
  volume24h: number;
  topGainers: TokenPrice[];
  topLosers: TokenPrice[];
}> {
  const tokens = Object.keys(TOKEN_IDS[network] || {});
  const prices = await getMultipleTokenPrices(network, tokens);

  const tokenList = Array.from(prices.values());
  
  // Sort by price change
  const sorted = [...tokenList].sort(
    (a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h
  );

  return {
    totalMarketCap: tokenList.reduce((sum, t) => sum + t.marketCap, 0),
    volume24h: tokenList.reduce((sum, t) => sum + t.volume24h, 0),
    topGainers: sorted.slice(0, 5),
    topLosers: sorted.slice(-5).reverse(),
  };
}

/**
 * Clear the price cache
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Get API status
 */
export function getApiStatus(): {
  isReady: boolean;
  lastCallTime: number;
  cacheSize: number;
} {
  return {
    isReady: true,
    lastCallTime: lastApiCall,
    cacheSize: priceCache.size,
  };
}


  'hivemapper',
  'hivemapper',
