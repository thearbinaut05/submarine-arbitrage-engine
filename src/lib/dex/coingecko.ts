/**
 * CoinGecko API Service for Real-Time Price Data
 * 
 * Free API endpoints for fetching token prices across multiple DEXs
 * API Docs: https://www.coingecko.com/en/api/documentation
 * 
 * FIXED: Proper rate limiting, retry logic, and arbitrage detection
 */

// CoinGecko API base URLs (free tier) - multiple endpoints for redundancy
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_BACKUP = 'https://api.coingecko.com/api/v3'; // Same but could be different in production

// Rate limiting for free tier (10-50 calls/minute) - optimized with jitter
const RATE_LIMIT_DELAY = 1500; // 1.5 seconds between calls (safer for free tier)
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 2000; // Base retry delay in ms

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

// DEX platforms supported by CoinGecko (for filtering)
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
  'aerodrome',
  'camelot',
  'velodrome',
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
  trustScore: string;
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
  fees: {
    buyDexFee: number;
    sellDexFee: number;
    totalFees: number;
  };
}

// Rate limiter singleton
let lastApiCall = 0;
let consecutiveErrors = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 500;
  const adjustedDelay = RATE_LIMIT_DELAY + jitter;
  
  if (timeSinceLastCall < adjustedDelay) {
    await new Promise(resolve => 
      setTimeout(resolve, adjustedDelay - timeSinceLastCall)
    );
  }
  
  lastApiCall = Date.now();
}

/**
 * Exponential backoff retry wrapper
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      consecutiveErrors = 0; // Reset error counter on success
      return result;
    } catch (error) {
      consecutiveErrors++;
      const isRateLimit = error instanceof Error && error.message.includes('429');
      
      if (attempt === maxRetries - 1) {
        console.error(`${operationName} failed after ${maxRetries} attempts:`, error);
        return null;
      }

      // Exponential backoff with jitter
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt) + (Math.random() * 1000);
      console.warn(`${operationName} attempt ${attempt + 1} failed, retrying in ${delay.toFixed(0)}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

// Simple in-memory cache with TTL
const priceCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds for prices
const DEX_CACHE_DURATION = 60000; // 60 seconds for DEX prices

function getCached<T>(key: string, ttlMs: number = CACHE_DURATION): T | null {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number = CACHE_DURATION): void {
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

  return withRetry(async () => {
    await rateLimit();

    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited');
      }
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
  }, `getTokenPrice(${network}, ${tokenSymbol})`);
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

  return withRetry(async () => {
    await rateLimit();

    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${tokenIds}&vs_currencies=usd&include_24hr_change=true&include_24h_vol=true&include_market_cap=true`
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limited');
      }
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
    return results;
  }, `getMultipleTokenPrices(${network})`) || results;
}

/**
 * Get prices from specific DEX on a network
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

  return withRetry(async () => {
    await rateLimit();

    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/tickers?include_exchange=true&depth=true`
    );

    if (!response.ok) {
      if (response.status === 429) throw new Error('Rate limited');
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tickers = data.tickers || [];

    // Filter by DEX name
    const dexTickers = tickers.filter((ticker: { exchange: { name: string } }) =>
      ticker.exchange?.name?.toLowerCase().includes(dexName.toLowerCase())
    );

    return dexTickers.map((ticker: { market: { identifier: string; name: string }; base: string; target: string; last: number; volume: number; trade_url: string; trust_score: string }) => ({
      dex: ticker.market?.name || dexName,
      baseToken: ticker.base,
      quoteToken: ticker.target,
      price: ticker.last,
      volume24h: ticker.volume || 0,
      liquidity: ticker.volume * ticker.last || 0,
      priceChange24h: 0,
      tradeUrl: ticker.trade_url || '',
      trustScore: ticker.trust_score || 'unknown',
    }));
  }, `getDexPrices(${network}, ${tokenSymbol}, ${dexName})`) || [];
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
  const cached = getCached<DexPrice[]>(cacheKey, DEX_CACHE_DURATION);
  if (cached) return cached;

  return withRetry(async () => {
    await rateLimit();

    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/tickers?include_exchange=true&depth=true&order=volume_desc`
    );

    if (!response.ok) {
      if (response.status === 429) throw new Error('Rate limited');
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tickers = data.tickers || [];

    // Filter for relevant pairs (stablecoins and major tokens)
    const dexPrices: DexPrice[] = tickers
      .filter((ticker: { target: string; trust_score: string }) =>
        ['USDC', 'USDT', 'DAI', 'WETH', 'ETH', 'WBTC', 'BTC', 'BUSD', 'USD'].some(quote => 
          ticker.target?.toUpperCase().includes(quote)
        ) && ticker.trust_score !== 'red'
      )
      .slice(0, 20)
      .map((ticker: { market: { identifier: string; name: string }; base: string; target: string; last: number; volume: number; trade_url: string; trust_score: string }) => ({
        dex: ticker.market?.name || 'Unknown',
        baseToken: ticker.base,
        quoteToken: ticker.target,
        price: ticker.last,
        volume24h: ticker.volume || 0,
        liquidity: (ticker.volume || 0) * ticker.last,
        priceChange24h: ticker.trust_score === 'green' ? 0.5 : 0,
        tradeUrl: ticker.trade_url || '',
        trustScore: ticker.trust_score || 'unknown',
      }));

    setCache(cacheKey, dexPrices, DEX_CACHE_DURATION);
    return dexPrices;
  }, `getAllDexPricesForToken(${network}, ${tokenSymbol})`) || [];
}

/**
 * Get price history for trend analysis
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

  return withRetry(async () => {
    await rateLimit();

    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`
    );

    if (!response.ok) {
      if (response.status === 429) throw new Error('Rate limited');
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.prices || [];

    return prices.map(([timestamp, price]: [number, number]) => ({
      timestamp,
      price,
    }));
  }, `getPriceHistory(${network}, ${tokenSymbol})`) || [];
}

/**
 * Scan for arbitrage opportunities between DEXs
 * 
 * CORRECT ARBITRAGE LOGIC:
 * - Find the SAME token trading at different prices on different DEXs
 * - Buy cheap on DEX A (lower price), sell expensive on DEX B (higher price)
 * - Profit = (sellPrice - buyPrice) / buyPrice * 100 (spread percentage)
 * - Net Profit = Gross Profit - Gas - DEX Fees
 */
export async function scanArbitrageOpportunities(
  network: string,
  tokenPairs: string[][],
  minProfitPercent: number = 0.1,
  minProfitUsd: number = 10
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];
  const GAS_COST_USD = 15; // Average gas cost in USD for arbitrage tx
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
      const dexPriceMap = new Map<string, { price: number; volume24h: number; liquidity: number; dex: string; trustScore: string }>();
      
      for (const priceInfo of dexPrices) {
        const existing = dexPriceMap.get(priceInfo.dex);
        if (!existing || priceInfo.volume24h > existing.volume24h) {
          dexPriceMap.set(priceInfo.dex, {
            price: priceInfo.price,
            volume24h: priceInfo.volume24h,
            liquidity: priceInfo.liquidity,
            dex: priceInfo.dex,
            trustScore: priceInfo.trustScore,
          });
        }
      }

      // Find best buy and sell prices across DEXs
      const prices = Array.from(dexPriceMap.values());
      if (prices.length < 2) continue;

      // Sort by price to find cheapest (buy) and most expensive (sell)
      prices.sort((a, b) => a.price - b.price);

      const cheapest = prices[0]; // Best price to BUY (lowest)
      const expensive = prices[prices.length - 1]; // Best price to SELL (highest)

      if (cheapest.price === 0 || expensive.price === 0) continue;

      // Calculate spread (CORRECT formula)
      // Spread = (sellPrice - buyPrice) / buyPrice * 100
      const priceDiff = expensive.price - cheapest.price;
      const spreadPercent = (priceDiff / cheapest.price) * 100;

      // Estimate DEX fees ( Uniswap: 0.3%, Balancer: 0.2%, etc.)
      const buyDexFee = estimateDexFee(cheapest.dex);
      const sellDexFee = estimateDexFee(expensive.dex);
      const totalFeesPercent = buyDexFee + sellDexFee;

      // Calculate profits
      // Gross profit from spread
      const grossProfitUsd = (spreadPercent / 100) * TRADE_AMOUNT;
      
      // Subtract DEX fees (percentage of trade amount)
      const dexFeesUsd = (totalFeesPercent / 100) * TRADE_AMOUNT;
      
      // Net profit after all costs
      const netProfit = grossProfitUsd - dexFeesUsd - GAS_COST_USD;

      // Check liquidity requirements
      const minLiquidity = 5000; // $5k minimum liquidity
      const minTrustScore = 'yellow'; // At least yellow trust score

      if (
        spreadPercent >= minProfitPercent &&
        grossProfitUsd >= minProfitUsd &&
        netProfit > 0 &&
        cheapest.liquidity > minLiquidity &&
        expensive.liquidity > minLiquidity &&
        cheapest.trustScore !== 'red' &&
        expensive.trustScore !== 'red'
      ) {
        // Calculate confidence based on multiple factors
        const volumeScore = Math.min((cheapest.volume24h + expensive.volume24h) / 1000000, 1); // 1M volume = max score
        const liquidityScore = Math.min((cheapest.liquidity + expensive.liquidity) / 1000000, 1);
        const spreadScore = Math.min(spreadPercent / 2, 1); // 2% spread = max score
        const trustScore = (cheapest.trustScore === 'green' && expensive.trustScore === 'green') ? 1 : 
                          (cheapest.trustScore === 'yellow' || expensive.trustScore === 'yellow') ? 0.5 : 0;

        const confidence = Math.min(
          (volumeScore * 0.2 + liquidityScore * 0.2 + spreadScore * 0.4 + trustScore * 0.2) * 100,
          95
        );

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
          profitUsd: grossProfitUsd,
          gasEstimate: GAS_COST_USD,
          netProfit,
          confidence,
          timestamp: Date.now(),
          route: [tokenSymbol, quoteToken],
          fees: {
            buyDexFee,
            sellDexFee,
            totalFees: dexFeesUsd,
          },
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
 * Estimate DEX fee based on DEX name
 */
function estimateDexFee(dexName: string): number {
  const dexLower = dexName.toLowerCase();
  
  if (dexLower.includes('uniswap') || dexLower.includes('sushi')) return 0.3;
  if (dexLower.includes('balancer')) return 0.2;
  if (dexLower.includes('curve')) return 0.04;
  if (dexLower.includes('pancake')) return 0.25;
  if (dexLower.includes('quickswap')) return 0.3;
  if (dexLower.includes('1inch')) return 0.5; // Aggregator fee
  if (dexLower.includes('paraswap')) return 0.5;
  
  return 0.3; // Default fee
}

/**
 * Get prices for a token against a specific quote token from all DEXs
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
  const cached = getCached<DexPrice[]>(cacheKey, DEX_CACHE_DURATION);
  if (cached) return cached;

  return withRetry(async () => {
    await rateLimit();

    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${tokenId}/tickers?include_exchange=true&depth=true&order=volume_desc`
    );

    if (!response.ok) {
      if (response.status === 429) throw new Error('Rate limited');
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const tickers = data.tickers || [];

    // Filter tickers by target/quote token
    const quoteLower = quoteToken.toLowerCase();
    const filteredTickers = tickers
      .filter((ticker: { target: string; trust_score: string }) =>
        ticker.target?.toLowerCase().includes(quoteLower) &&
        ticker.trust_score !== 'red'
      );

    const dexPrices: DexPrice[] = filteredTickers
      .slice(0, 15)
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
        priceChange24h: 0,
        tradeUrl: ticker.trade_url || '',
        trustScore: ticker.trust_score || 'unknown',
      }));

    setCache(cacheKey, dexPrices, DEX_CACHE_DURATION);
    return dexPrices;
  }, `getAllDexPricesForTokenOnQuote(${network}, ${tokenSymbol}, ${quoteToken})`) || [];
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
  consecutiveErrors: number;
} {
  return {
    isReady: true,
    lastCallTime: lastApiCall,
    cacheSize: priceCache.size,
    consecutiveErrors,
  };
}

