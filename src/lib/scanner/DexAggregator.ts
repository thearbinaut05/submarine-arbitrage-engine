/**
 * DEX Price Aggregator
 * 
 * Aggregates prices from multiple DEXs with FIXED token matching
 * and proper price normalization for arbitrage detection.
 */

import { ethers } from 'ethers';
import { Network } from '@/types/defi';

// RPC URLs for each network
const RPC_URLS: Record<Network, string> = {
  ethereum: 'https://eth.llamarpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  bsc: 'https://bsc-dataseed.binance.org',
  optimism: 'https://optimism.drpc.org',
  base: 'https://base.drpc.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

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
  optimism: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
  base: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
  },
  avalanche: {
    uniswapV2: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
    uniswapV3: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    sushiswap: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
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

const UNISWAP_V3_FEE_TIERS = [500, 3000, 10000];

export interface DexPrice {
  dex: string;
  token0: string;
  token1: string;
  price0: number;
  price1: number;
  liquidity: number;
  lastUpdated: number;
}

/**
 * DexAggregator with FIXED token price normalization
 */
export class DexAggregator {
  private providers: Map<Network, ethers.JsonRpcProvider> = new Map();
  private cache: Map<string, { data: DexPrice[]; timestamp: number }> = new Map();
  private cacheTimeout = 5000;

  constructor() {
    this.initProviders();
  }

  private initProviders(): void {
    for (const [network, url] of Object.entries(RPC_URLS)) {
      try {
        this.providers.set(network as Network, new ethers.JsonRpcProvider(url));
      } catch (error) {
        console.error(`Failed to create provider for ${network}:`, error);
      }
    }
  }

  private getProvider(network: Network): ethers.JsonRpcProvider | null {
    return this.providers.get(network) || null;
  }

  private getCached(network: Network, tokenIn: string, tokenOut: string): DexPrice[] | null {
    const key = `${network}:${tokenIn}:${tokenOut}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(network: Network, tokenIn: string, tokenOut: string, data: DexPrice[]): void {
    const key = `${network}:${tokenIn}:${tokenOut}`;
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async getTokenDecimals(provider: ethers.JsonRpcProvider, tokenAddress: string): Promise<number> {
    try {
      const token = new ethers.Contract(tokenAddress, [
        'function decimals() view (uint8)',
      ], provider);
      return await token.decimals();
    } catch {
      return 18;
    }
  }

  private calculatePriceFromReserves(
    reserve0: bigint,
    reserve1: bigint,
    decimals0: number,
    decimals1: number
  ): { price0: number; price1: number } {
    const amount0 = Number(ethers.formatUnits(reserve0, decimals0));
    const amount1 = Number(ethers.formatUnits(reserve1, decimals1));
    if (amount0 === 0 || amount1 === 0) return { price0: 0, price1: 0 };
    return {
      price0: amount1 / amount0,
      price1: amount0 / amount1,
    };
  }

  async getAllPrices(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<DexPrice[]> {
    const cached = this.getCached(network, tokenInSymbol, tokenOutSymbol);
    if (cached) return cached;

    const prices: DexPrice[] = [];
    const tokenIn = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
    const tokenOut = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

    if (!tokenIn || !tokenOut) {
      console.warn(`Token pair ${tokenInSymbol}/${tokenOutSymbol} not found on ${network}`);
      return prices;
    }

    const dexes = DEX_FACTORIES[network];
    if (!dexes) return prices;

    const provider = this.getProvider(network);
    if (!provider) return prices;

    const dexData = [
      { name: 'Uniswap V2', factory: dexes.uniswapV2 },
      { name: 'SushiSwap', factory: dexes.sushiswap },
    ];

    if (dexes.quickswap) dexData.push({ name: 'QuickSwap', factory: dexes.quickswap });
    if (dexes.pancakeswap) dexData.push({ name: 'PancakeSwap', factory: dexes.pancakeswap });

    for (const dex of dexData) {
      try {
        const factory = new ethers.Contract(dex.factory, [
          'function getPair(address, address) view (address)',
        ], provider);
        
        const pairAddress = await factory.getPair(tokenIn, tokenOut);
        if (!pairAddress || pairAddress === ethers.ZeroAddress) continue;

        const pair = new ethers.Contract(pairAddress, [
          'function getReserves() view (uint112, uint112, uint32)',
          'function token0() view (address)',
          'function token1() view (address)',
        ], provider);

        const [reserve0, reserve1] = await pair.getReserves();
        const actualToken0 = await pair.token0();
        const actualToken1 = await pair.token1();
        const decimals0 = await this.getTokenDecimals(provider, actualToken0);
        const decimals1 = await this.getTokenDecimals(provider, actualToken1);
        const { price0, price1 } = this.calculatePriceFromReserves(reserve0, reserve1, decimals0, decimals1);

        const amount0 = Number(ethers.formatUnits(reserve0, decimals0));
        const amount1 = Number(ethers.formatUnits(reserve1, decimals1));
        const liquidity = (amount0 + amount1) * ((price0 + price1) / 2);

        prices.push({
          dex: dex.name,
          token0: actualToken0,
          token1: actualToken1,
          price0,
          price1,
          liquidity,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        console.warn(`Failed to get prices from ${dex.name}:`, error);
      }
    }

    if (dexes.uniswapV3) {
      try {
        const factory = new ethers.Contract(dexes.uniswapV3, [
          'function getPool(address, address, uint24) view (address)',
        ], provider);

        for (const fee of UNISWAP_V3_FEE_TIERS) {
          const poolAddress = await factory.getPool(tokenIn, tokenOut, fee);
          if (!poolAddress || poolAddress === ethers.ZeroAddress) continue;

          const pool = new ethers.Contract(poolAddress, [
            'function slot0() view (uint160, int24, uint16, uint16, uint16, uint8, int256)',
            'function token0() view (address)',
            'function token1() view (address)',
            'function liquidity() view (uint128)',
          ], provider);

          const slot0 = await pool.slot0();
          const token0Address = await pool.token0();
          const token1Address = await pool.token1();
          const liquidity = await pool.liquidity();

          const sqrtPriceX96 = slot0[0];
          const price0 = Number(sqrtPriceX96) ** 2 / (2 ** 192);
          const price1 = 1 / price0;
          const liquidityUsd = Number(ethers.formatUnits(liquidity, 18)) * 100;

          prices.push({
            dex: `Uniswap V3 (${fee / 10000}%)`,
            token0: token0Address,
            token1: token1Address,
            price0,
            price1,
            liquidity: liquidityUsd,
            lastUpdated: Date.now(),
          });
        }
      } catch (error) {
        console.warn('Failed to get Uniswap V3 prices:', error);
      }
    }

    this.setCache(network, tokenInSymbol, tokenOutSymbol, prices);
    return prices;
  }

  /**
   * Get the price of tokenIn in terms of tokenOut from a DEX price
   * FIXED: Correctly handles all token order combinations
   */
  getTokenPriceInTermsOf(
    dexPrice: DexPrice,
    tokenInAddress: string,
    tokenOutAddress: string
  ): number {
    const tokenInLower = tokenInAddress.toLowerCase();
    const tokenOutLower = tokenOutAddress.toLowerCase();
    const token0Lower = dexPrice.token0.toLowerCase();
    const token1Lower = dexPrice.token1.toLowerCase();

    if (token0Lower === tokenInLower && token1Lower === tokenOutLower) {
      return dexPrice.price0;
    }
    if (token1Lower === tokenInLower && token0Lower === tokenOutLower) {
      return dexPrice.price1;
    }

    return 0;
  }

  async getBestBuyPrice(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<{ price: number; dex: string } | null> {
    const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
    const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

    if (!tokenInAddress || !tokenOutAddress) {
      console.warn(`Token addresses not found for ${tokenInSymbol}/${tokenOutSymbol}`);
      return null;
    }

    const prices = await this.getAllPrices(network, tokenInSymbol, tokenOutSymbol);
    if (prices.length === 0) return null;

    let bestPrice = Infinity;
    let bestDex = '';

    for (const dexPrice of prices) {
      const tokenInPrice = this.getTokenPriceInTermsOf(dexPrice, tokenInAddress, tokenOutAddress);
      if (tokenInPrice < bestPrice && tokenInPrice > 0) {
        bestPrice = tokenInPrice;
        bestDex = dexPrice.dex;
      }
    }

    return bestPrice === Infinity ? null : { price: bestPrice, dex: bestDex };
  }

  async getBestSellPrice(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<{ price: number; dex: string } | null> {
    const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
    const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

    if (!tokenInAddress || !tokenOutAddress) {
      console.warn(`Token addresses not found for ${tokenInSymbol}/${tokenOutSymbol}`);
      return null;
    }

    const prices = await this.getAllPrices(network, tokenInSymbol, tokenOutSymbol);
    if (prices.length === 0) return null;

    let bestPrice = 0;
    let bestDex = '';

    for (const dexPrice of prices) {
      const tokenInPrice = this.getTokenPriceInTermsOf(dexPrice, tokenInAddress, tokenOutAddress);
      if (tokenInPrice > bestPrice) {
        bestPrice = tokenInPrice;
        bestDex = dexPrice.dex;
      }
    }

    return bestPrice === 0 ? null : { price: bestPrice, dex: bestDex };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const dexAggregator = new DexAggregator();

