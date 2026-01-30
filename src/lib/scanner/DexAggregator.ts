import { ethers } from 'ethers';
import { Network } from '@/types/defi';

// DEX Factory addresses by network
const DEX_FACTORIES: Record<Network, {
  uniswapV2: string;
  uniswapV3: string;
  sushiswap: string;
  quickswap?: string;
  pancakeswap?: string;
}> = {
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
    quickswap: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
  },
  bsc: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    pancakeswap: '0x1097053Fd2ea711dad45caCcc45eF9c61d23Be0c',
  },
};

// Token addresses by network
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
};

// Uniswap V3 fee tiers
const UNISWAP_V3_FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// RPC URLs for each network
const RPC_URLS: Record<Network, string> = {
  ethereum: 'https://eth.llamarpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  bsc: 'https://bsc-dataseed.binance.org',
};

/**
 * DEX Price Information
 */
export interface DexPrice {
  dex: string;
  token0: string;
  token1: string;
  price0: number; // price of token0 in terms of token1
  price1: number; // price of token1 in terms of token0
  liquidity: number; // USD value of liquidity
  lastUpdated: number;
}

/**
 * DexAggregator - Aggregates prices from multiple DEXs
 * 
 * Provides unified access to price data from:
 * - Uniswap V2
 * - Uniswap V3
 * - SushiSwap
 * - QuickSwap (Polygon)
 * - PancakeSwap (BSC)
 */
export class DexAggregator {
  private providers: Map<Network, ethers.JsonRpcProvider> = new Map();
  private cache: Map<string, { data: DexPrice[]; timestamp: number }> = new Map();
  private cacheTimeout = 5000; // 5 seconds

  constructor() {
    this.initProviders();
  }

  /**
   * Initialize providers for each network
   */
  private initProviders(): void {
    for (const [network, url] of Object.entries(RPC_URLS)) {
      try {
        this.providers.set(network as Network, new ethers.JsonRpcProvider(url));
      } catch (error) {
        console.error(`Failed to create provider for ${network}:`, error);
      }
    }
  }

  /**
   * Get provider for a network
   */
  private getProvider(network: Network): ethers.JsonRpcProvider | null {
    return this.providers.get(network) || null;
  }

  /**
   * Get cache key
   */
  private getCacheKey(network: Network, tokenIn: string, tokenOut: string): string {
    return `${network}:${tokenIn}:${tokenOut}`;
  }

  /**
   * Check cache
   */
  private getCachedPrices(network: Network, tokenIn: string, tokenOut: string): DexPrice[] | null {
    const key = this.getCacheKey(network, tokenIn, tokenOut);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(network: Network, tokenIn: string, tokenOut: string, data: DexPrice[]): void {
    const key = this.getCacheKey(network, tokenIn, tokenOut);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get all DEX prices for a token pair
   */
  async getAllPrices(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<DexPrice[]> {
    // Check cache first
    const cached = this.getCachedPrices(network, tokenInSymbol, tokenOutSymbol);
    if (cached) return cached;

    const prices: DexPrice[] = [];
    const tokenIn = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
    const tokenOut = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

    if (!tokenIn || !tokenOut) {
      console.warn(`Token pair ${tokenInSymbol}/${tokenOutSymbol} not found on ${network}`);
      return prices;
    }

    const dexes = DEX_FACTORIES[network];
    if (!dexes) {
      console.warn(`DEX factories not configured for ${network}`);
      return prices;
    }

    // Fetch from all DEXs in parallel
    const promises: Promise<DexPrice | null>[] = [];

    // Uniswap V2
    promises.push(this.getUniswapV2Price(network, dexes.uniswapV2, tokenIn, tokenOut, 'Uniswap V2'));

    // SushiSwap
    promises.push(this.getUniswapV2Price(network, dexes.sushiswap, tokenIn, tokenOut, 'SushiSwap'));

    // Uniswap V3 (all fee tiers)
    for (const fee of UNISWAP_V3_FEE_TIERS) {
      promises.push(this.getUniswapV3Price(network, dexes.uniswapV3, tokenIn, tokenOut, fee, `Uniswap V3 (${fee / 10000}%)`));
    }

    // QuickSwap on Polygon
    if (network === 'polygon' && dexes.quickswap) {
      promises.push(this.getUniswapV2Price(network, dexes.quickswap, tokenIn, tokenOut, 'QuickSwap'));
    }

    // PancakeSwap on BSC
    if (network === 'bsc' && dexes.pancakeswap) {
      promises.push(this.getUniswapV2Price(network, dexes.pancakeswap, tokenIn, tokenOut, 'PancakeSwap'));
    }

    const results = await Promise.all(promises);
    
    for (const price of results) {
      if (price) prices.push(price);
    }

    // Cache results
    this.setCache(network, tokenInSymbol, tokenOutSymbol, prices);

    return prices;
  }

  /**
   * Get price from Uniswap V2 pair
   */
  private async getUniswapV2Price(
    network: Network,
    factoryAddress: string,
    token0Address: string,
    token1Address: string,
    dexName: string
  ): Promise<DexPrice | null> {
    const provider = this.getProvider(network);
    if (!provider) return null;

    try {
      // Get pair address
      const pairAddress = await this.getPairAddress(provider, factoryAddress, token0Address, token1Address);
      if (!pairAddress || pairAddress === ethers.ZeroAddress) return null;

      // Get pair data
      const pair = new ethers.Contract(pairAddress, [
        'function getReserves() view (uint112, uint112, uint32)',
        'function token0() view (address)',
        'function token1() view (address)',
      ], provider);

      const [reserve0, reserve1] = await pair.getReserves();
      const actualToken0 = await pair.token0();
      const actualToken1 = await pair.token1();

      // Get decimals
      const decimals0 = await this.getTokenDecimals(provider, actualToken0);
      const decimals1 = await this.getTokenDecimals(provider, actualToken1);

      // Calculate prices
      const amount0 = Number(ethers.formatUnits(reserve0, decimals0));
      const amount1 = Number(ethers.formatUnits(reserve1, decimals1));

      if (amount0 === 0 || amount1 === 0) return null;

      const price0 = amount1 / amount0;
      const price1 = amount0 / amount1;

      // Calculate liquidity (simplified USD estimate)
      const liquidity = (amount0 + amount1) * 100; // Assume $100 per token unit

      return {
        dex: dexName,
        token0: actualToken0,
        token1: actualToken1,
        price0,
        price1,
        liquidity,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get price from Uniswap V3 pool
   */
  private async getUniswapV3Price(
    network: Network,
    factoryAddress: string,
    token0Address: string,
    token1Address: string,
    fee: number,
    dexName: string
  ): Promise<DexPrice | null> {
    const provider = this.getProvider(network);
    if (!provider) return null;

    try {
      // Get pool address
      const poolAddress = await this.getUniswapV3PoolAddress(provider, factoryAddress, token0Address, token1Address, fee);
      if (!poolAddress || poolAddress === ethers.ZeroAddress) return null;

      // Get pool data
      const pool = new ethers.Contract(poolAddress, [
        'function slot0() view (uint160, int24, uint16, uint16, uint16, uint8, int256)',
        'function token0() view (address)',
        'function token1() view (address)',
        'function liquidity() view (uint128)',
      ], provider);

      const slot0 = await pool.slot0();
      const actualToken0 = await pool.token0();
      const actualToken1 = await pool.token1();
      const liquidity = await pool.liquidity();

      // Calculate price from sqrtPriceX96
      const sqrtPriceX96 = slot0[0];
      const price = Number(sqrtPriceX96) ** 2 / (2 ** 192);
      const price0 = price;
      const price1 = 1 / price;

      // Calculate liquidity in USD (simplified)
      const liquidityUsd = Number(ethers.formatUnits(liquidity, 18)) * 100;

      return {
        dex: dexName,
        token0: actualToken0,
        token1: actualToken1,
        price0,
        price1,
        liquidity: liquidityUsd,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Uniswap V2 pair address
   */
  private async getPairAddress(
    provider: ethers.JsonRpcProvider,
    factoryAddress: string,
    token0: string,
    token1: string
  ): Promise<string | null> {
    try {
      const factory = new ethers.Contract(factoryAddress, [
        'function getPair(address, address) view (address)',
      ], provider);

      const pairAddress = await factory.getPair(token0, token1);
      return pairAddress;
    } catch {
      return null;
    }
  }

  /**
   * Get Uniswap V3 pool address
   */
  private async getUniswapV3PoolAddress(
    provider: ethers.JsonRpcProvider,
    factoryAddress: string,
    token0: string,
    token1: string,
    fee: number
  ): Promise<string | null> {
    try {
      const factory = new ethers.Contract(factoryAddress, [
        'function getPool(address, address, uint24) view (address)',
      ], provider);

      const poolAddress = await factory.getPool(token0, token1, fee);
      return poolAddress;
    } catch {
      return null;
    }
  }

  /**
   * Get token decimals
   */
  private async getTokenDecimals(
    provider: ethers.JsonRpcProvider,
    tokenAddress: string
  ): Promise<number> {
    try {
      const token = new ethers.Contract(tokenAddress, [
        'function decimals() view (uint8)',
      ], provider);

      return await token.decimals();
    } catch {
      return 18; // Default to 18
    }
  }

  /**
   * Get best price for buying a token
   */
  async getBestBuyPrice(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<{ price: number; dex: string } | null> {
    // Get token addresses
    const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
    const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

    if (!tokenInAddress || !tokenOutAddress) {
      console.warn(`Token addresses not found for ${tokenInSymbol}/${tokenOutSymbol} on ${network}`);
      return null;
    }

    const prices = await this.getAllPrices(network, tokenInSymbol, tokenOutSymbol);
    
    if (prices.length === 0) return null;

    // Find lowest price for tokenIn (best place to buy)
    let bestPrice = Infinity;
    let bestDex = '';

    for (const dexPrice of prices) {
      const tokenInPrice = this.getTokenPriceInTermsOf(dexPrice, tokenInAddress, tokenOutAddress);

      if (tokenInPrice < bestPrice && tokenInPrice > 0) {
        bestPrice = tokenInPrice;
        bestDex = dexPrice.dex;
      }
    }

    if (bestPrice === Infinity) return null;

    return { price: bestPrice, dex: bestDex };
  }

  /**
   * Get best price for selling a token
   */
  async getBestSellPrice(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<{ price: number; dex: string } | null> {
    // Get token addresses
    const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
    const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

    if (!tokenInAddress || !tokenOutAddress) {
      console.warn(`Token addresses not found for ${tokenInSymbol}/${tokenOutSymbol} on ${network}`);
      return null;
    }

    const prices = await this.getAllPrices(network, tokenInSymbol, tokenOutSymbol);
    
    if (prices.length === 0) return null;

    // Find highest price for tokenIn (best place to sell)
    let bestPrice = 0;
    let bestDex = '';

    for (const dexPrice of prices) {
      const tokenInPrice = this.getTokenPriceInTermsOf(dexPrice, tokenInAddress, tokenOutAddress);

      if (tokenInPrice > bestPrice) {
        bestPrice = tokenInPrice;
        bestDex = dexPrice.dex;
      }
    }

    if (bestPrice === 0) return null;

    return { price: bestPrice, dex: bestDex };
  }

  /**
   * Get the price of tokenIn in terms of tokenOut from a DEX price
   * This correctly handles the token order in the pair
   */
  private getTokenPriceInTermsOf(
    dexPrice: DexPrice,
    tokenInAddress: string,
    tokenOutAddress: string
  ): number {
    const tokenInLower = tokenInAddress.toLowerCase();
    const tokenOutLower = tokenOutAddress.toLowerCase();
    const token0Lower = dexPrice.token0.toLowerCase();
    const token1Lower = dexPrice.token1.toLowerCase();

    if (token0Lower === tokenInLower && token1Lower === tokenOutLower) {
      // token0 = tokenIn, token1 = tokenOut
      // price0 is how many tokenOut you get for 1 tokenIn
      return dexPrice.price0;
    } else if (token1Lower === tokenInLower && token0Lower === tokenOutLower) {
      // token1 = tokenIn, token0 = tokenOut
      // price1 is how many tokenOut you get for 1 tokenIn
      return dexPrice.price1;
    }

    // Token not found in this pair
    return 0;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const dexAggregator = new DexAggregator();
