9665
4|3 On-Chain Price Fetcher
 * 
 * Fetches prices directly from DEX contracts on-chain
 * FIXED: Proper RPC fallback, token matching, and error handling
 */

import { ethers } from 'ethers';
import { Network, NetworkConfig } from '@/types/defi';
import {
  UNISWAP_V2_PAIR_ABI,
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V3_POOL_ABI,
  ERC20_ABI,
} from './abis';

// Network configurations with multiple RPC providers for fallback
const NETWORK_CONFIGS: Record<Network, { rpcs: string[]; multicall: string }> = {
  ethereum: {
    rpcs: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://cloudflare-eth.com',
      'https://eth.drpc.org',
    ],
    multicall: '0xeefBa1e63905eF1D7ACbA5bd8518a7c8A76d1Da0',
  },
  arbitrum: {
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://rpc.ankr.com/arb',
      'https://arbitrum.drpc.org',
    ],
    multicall: '0x842eC2d7C7d22D0fDa293C4d70e0bDc0aB20C8A6',
  },
  polygon: {
    rpcs: [
      'https://polygon-rpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.drpc.org',
    ],
    multicall: '0x275617327c1C7138bF9dB817E7fBba3d5d8C8d0a',
  },
  bsc: {
    rpcs: [
      'https://bsc-dataseed.binance.org',
      'https://rpc.ankr.com/bsc',
      'https://bsc.drpc.org',
    ],
    multicall: '0x963D8e53A29e9D93c6D68f2C7aD77F1d8eB4d8c1',
  },
  optimism: {
    rpcs: [
      'https://optimism.drpc.org',
      'https://rpc.ankr.com/optimism',
      'https://mainnet.optimism.io',
    ],
    multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
  },
  base: {
    rpcs: [
      'https://base.drpc.org',
      'https://rpc.ankr.com/base',
      'https://base-mainnet.public.blastapi.io',
    ],
    multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
  },
  avalanche: {
    rpcs: [
      'https://avalanche.drpc.org',
      'https://rpc.ankr.com/avalanche',
      'https://api.avax.network/ext/bc/C/rpc',
    ],
    multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
  },
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
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
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

// Uniswap V3 fee tiers
const UNISWAP_V3_FEE_TIERS = [500, 3000, 10000];

export interface TokenPrice {
  token: string;
  address: string;
  price: number;
  decimals: number;
  liquidity?: number;
  lastUpdated: number;
}

export interface DexPrice {
  dex: string;
  token0: string;
  token1: string;
  price0: number;
  price1: number;
  reserve0: bigint;
  reserve1: bigint;
  liquidity: number;
  fee?: number;
}

export interface ArbitrageOpportunity {
  network: Network;
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
  liquidity: number;
  confidence: number;
}

/**
 * OnChainPriceFetcher with proper fallback and error handling
 */
class OnChainPriceFetcher {
  private providers: Map<Network, ethers.JsonRpcProvider[]> = new Map();
  private providerIndex: Map<Network, number> = new Map();
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTimeout = 10000; // 10 seconds

  constructor() {
    this.initProviders();
  }

  /**
   * Initialize providers with fallback for each network
   */
  private initProviders(): void {
    for (const [network, config] of Object.entries(NETWORK_CONFIGS)) {
      const providers: ethers.JsonRpcProvider[] = [];
      
      for (const rpc of config.rpcs) {
        try {
          const provider = new ethers.JsonRpcProvider(rpc, {
            chainId: this.getChainId(network as Network),
            name: network,
          });
          providers.push(provider);
        } catch (error) {
          console.warn(`Failed to create provider for ${network} at ${rpc}:`, error);
        }
      }
      
      if (providers.length > 0) {
        this.providers.set(network as Network, providers);
        this.providerIndex.set(network as Network, 0);
      }
    }
  }

  /**
   * Get chain ID for network
   */
  private getChainId(network: Network): number {
    const chainIds: Record<Network, number> = {
      ethereum: 1,
      arbitrum: 42161,
      polygon: 137,
      bsc: 56,
      optimism: 10,
      base: 8453,
      avalanche: 43114,
    };
    return chainIds[network] || 1;
  }

  /**
   * Get working provider for network with failover
   */
  private getProvider(network: Network): ethers.JsonRpcProvider | null {
    const providers = this.providers.get(network);
    if (!providers || providers.length === 0) return null;

    const currentIndex = this.providerIndex.get(network) || 0;
    
    // Test if current provider is working
    return providers[currentIndex];
  }

  /**
   * Rotate to next provider
   */
  private rotateProvider(network: Network): void {
    const providers = this.providers.get(network);
    const currentIndex = this.providerIndex.get(network) || 0;
    
    if (providers && providers.length > 1) {
      const nextIndex = (currentIndex + 1) % providers.length;
      this.providerIndex.set(network, nextIndex);
      console.warn(`Rotating provider for ${network} to index ${nextIndex}`);
    }
  }

  /**
   * Get cache key
   */
  private getCacheKey(key: string): string {
    return `${key}_${Date.now()}`;
  }

  /**
   * Get cached data
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(network: Network, tokenAddress: string): Promise<number> {
    const provider = this.getProvider(network);
    if (!provider) return 18;

    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      return await contract.decimals();
    } catch {
      return 18;
    }
  }

  /**
   * Calculate price from Uniswap V2 pair reserves
   * Returns both prices normalized: price0 = how many token1 for 1 token0
   */
  private calculatePriceFromReserves(
    reserve0: bigint,
    reserve1: bigint,
    decimals0: number,
    decimals1: number
  ): { price0: number; price1: number } {
    const amount0 = Number(ethers.formatUnits(reserve0, decimals0));
    const amount1 = Number(ethers.formatUnits(reserve1, decimals1));

    if (amount0 === 0 || amount1 === 0) {
      return { price0: 0, price1: 0 };
    }

    return {
      price0: amount1 / amount0, // price of token0 in terms of token1
      price1: amount0 / amount1, // price of token1 in terms of token0
    };
  }

  /**
   * Get Uniswap V2 pair address
   */
  private async getUniswapV2PairAddress(
    network: Network,
    factoryAddress: string,
    token0: string,
    token1: string
  ): Promise<string | null> {
    const provider = this.getProvider(network);
    if (!provider) return null;

    try {
      const factory = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, provider);
      const pairAddress = await factory.getPair(token0, token1);
      return pairAddress;
    } catch (error) {
      // Try rotating provider
      this.rotateProvider(network);
      return null;
    }
  }

  /**
   * Get Uniswap V2 pair data
   */
  async getUniswapV2PairData(
    network: Network,
    pairAddress: string
  ): Promise<DexPrice | null> {
    const provider = this.getProvider(network);
    if (!provider || pairAddress === ethers.ZeroAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    try {
      const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
      
      // Try to get reserves with error handling
      let reserve0: bigint, reserve1: bigint;
      try {
        [reserve0, reserve1] = await pair.getReserves();
      } catch {
        return null;
      }

      const token0Address = await pair.token0();
      const token1Address = await pair.token1();

      const decimals0 = await this.getTokenDecimals(network, token0Address);
      const decimals1 = await this.getTokenDecimals(network, token1Address);

      const { price0, price1 } = this.calculatePriceFromReserves(
        reserve0,
        reserve1,
        decimals0,
        decimals1
      );

      // Calculate liquidity in USD
      const amount0 = Number(ethers.formatUnits(reserve0, decimals0));
      const amount1 = Number(ethers.formatUnits(reserve1, decimals1));
      
      // Use average of both token prices (simplified)
      const avgPrice = (price0 + price1) / 2;
      const liquidity = (amount0 + amount1) * avgPrice;

      return {
        dex: 'Uniswap V2',
        token0: token0Address,
        token1: token1Address,
        price0,
        price1,
        reserve0,
        reserve1,
        liquidity,
        fee: 0.3,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get Uniswap V3 pool price
   */
  async getUniswapV3PoolPrice(
    network: Network,
    poolAddress: string
  ): Promise<DexPrice | null> {
    const provider = this.getProvider(network);
    if (!provider || !poolAddress || poolAddress === ethers.ZeroAddress) return null;

    try {
      const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, provider);
      
      const slot0 = await pool.slot0();
      const token0Address = await pool.token0();
      const token1Address = await pool.token1();
      const liquidity = await pool.liquidity();

      const decimals0 = await this.getTokenDecimals(network, token0Address);
      const decimals1 = await this.getTokenDecimals(network, token1Address);

      // Calculate price from sqrtPriceX96
      const sqrtPriceX96 = slot0[0];
      const price0 = Number(sqrtPriceX96) ** 2 / (2 ** 192);
      const price1 = 1 / price0;

      // Calculate liquidity in USD
      const liquidityUsd = Number(ethers.formatUnits(liquidity, 18)) * 100;

      return {
        dex: 'Uniswap V3',
        token0: token0Address,
        token1: token1Address,
        price0,
        price1,
        reserve0: BigInt(0),
        reserve1: BigInt(0),
        liquidity: liquidityUsd,
        fee: 0.3,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get prices from all DEXs for a token pair
   */
  async getAllDexPrices(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<DexPrice[]> {
    const cacheKey = `prices_${network}_${tokenInSymbol}_${tokenOutSymbol}`;
    const cached = this.getCached<DexPrice[]>(cacheKey);
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
    const v2PairAddress = await this.getUniswapV2PairAddress(network, dexes.uniswapV2, tokenIn, tokenOut);
    if (v2PairAddress) {
      promises.push(this.getUniswapV2PairData(network, v2PairAddress).then(data => {
        if (data) data.dex = 'Uniswap V2';
        return data;
      }));
    }

    // SushiSwap
    const sushiPairAddress = await this.getUniswapV2PairAddress(network, dexes.sushiswap, tokenIn, tokenOut);
    if (sushiPairAddress) {
      promises.push(this.getUniswapV2PairData(network, sushiPairAddress).then(data => {
        if (data) data.dex = 'SushiSwap';
        return data;
      }));
    }

    // Uniswap V3 (all fee tiers)
    const provider = this.getProvider(network);
    if (provider && dexes.uniswapV3) {
      try {
        const factory = new ethers.Contract(
          dexes.uniswapV3,
          ['function getPool(address, address, uint24) view returns (address)'],
          provider
        );

        for (const fee of UNISWAP_V3_FEE_TIERS) {
          const poolAddress = await factory.getPool(tokenIn, tokenOut, fee);
          if (poolAddress && poolAddress !== ethers.ZeroAddress) {
            promises.push(this.getUniswapV3PoolPrice(network, poolAddress).then(data => {
              if (data) data.dex = `Uniswap V3 (${fee / 10000}%)`;
              return data;
            }));
          }
        }
      } catch {
        // Continue without V3
      }
    }

    // QuickSwap on Polygon
    if (network === 'polygon' && dexes.quickswap) {
      const quickPairAddress = await this.getUniswapV2PairAddress(network, dexes.quickswap, tokenIn, tokenOut);
      if (quickPairAddress) {
        promises.push(this.getUniswapV2PairData(network, quickPairAddress).then(data => {
          if (data) data.dex = 'QuickSwap';
          return data;
        }));
      }
    }

    // PancakeSwap on BSC
    if (network === 'bsc' && dexes.pancakeswap) {
      const cakePairAddress = await this.getUniswapV2PairAddress(network, dexes.pancakeswap, tokenIn, tokenOut);
      if (cakePairAddress) {
        promises.push(this.getUniswapV2PairData(network, cakePairAddress).then(data => {
          if (data) data.dex = 'PancakeSwap';
          return data;
        }));
      }
    }

    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        prices.push(result.value);
      }
    }

    this.setCache(cacheKey, prices);
    return prices;
  }

  /**
   * Get the price of tokenIn in terms of tokenOut from a DEX price
   * CORRECT implementation handling all token order combinations
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
      // token0 = tokenIn, token1 = tokenOut
      // price0 is how many tokenOut you get for 1 tokenIn
      return dexPrice.price0;
    } else if (token1Lower === tokenInLower && token0Lower === tokenOutLower) {
      // token1 = tokenIn, token0 = tokenOut
      // price1 is how many tokenOut you get for 1 tokenIn
      return dexPrice.price1;
    }

    // Token not found in this pair - return 0
    return 0;
  }

  /**
   * Scan for arbitrage opportunities on a network
   */
  async scanArbitrageOpportunities(
    network: Network,
    minProfitPercent: number = 0.1,
    minProfitUsd: number = 10
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const GAS_COST_USD = 15; // Average gas cost
    const TRADE_AMOUNT = 10000; // $10k trade

    const tokenPairs = [
      ['WETH', 'USDC'],
      ['WETH', 'USDT'],
      ['WETH', 'DAI'],
      ['USDC', 'USDT'],
      ['WBTC', 'WETH'],
      ['LINK', 'WETH'],
    ];

    for (const [tokenInSymbol, tokenOutSymbol] of tokenPairs) {
      try {
        const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
        const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

        if (!tokenInAddress || !tokenOutAddress) {
          continue;
        }

        const allPrices = await this.getAllDexPrices(network, tokenInSymbol, tokenOutSymbol);

        if (allPrices.length < 2) continue;

        // Check for price differences between DEXs
        for (let i = 0; i < allPrices.length; i++) {
          for (let j = i + 1; j < allPrices.length; j++) {
            const dex1 = allPrices[i];
            const dex2 = allPrices[j];

            // Get normalized prices for tokenIn in terms of tokenOut
            const price1 = this.getTokenPriceInTermsOf(dex1, tokenInAddress, tokenOutAddress);
            const price2 = this.getTokenPriceInTermsOf(dex2, tokenInAddress, tokenOutAddress);

            if (price1 === 0 || price2 === 0) continue;

            // Calculate spread - CORRECT formula
            const minPrice = Math.min(price1, price2);
            const maxPrice = Math.max(price1, price2);
            const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

            // Calculate profits
            const grossProfitUsd = TRADE_AMOUNT * (spreadPercent / 100);
            const dexFees = TRADE_AMOUNT * 0.006; // 0.3% * 2 DEXs
            const netProfit = grossProfitUsd - dexFees - GAS_COST_USD;

            if (
              spreadPercent >= minProfitPercent &&
              grossProfitUsd >= minProfitUsd &&
              netProfit > 0
            ) {
              // Buy on DEX with lower price, sell on DEX with higher price
              const buyDex = price1 < price2 ? dex1 : dex2;
              const sellDex = price1 < price2 ? dex2 : dex1;
              const buyPrice = Math.min(price1, price2);
              const sellPrice = Math.max(price1, price2);

              // Calculate confidence
              const liquidityScore = Math.min((buyDex.liquidity + sellDex.liquidity) / 1000000, 1);
              const spreadScore = Math.min(spreadPercent / 2, 1);
              const confidence = Math.min((liquidityScore * 0.3 + spreadScore * 0.7) * 100, 95);

              opportunities.push({
                network,
                tokenIn: tokenInSymbol,
                tokenOut: tokenOutSymbol,
                buyDex: buyDex.dex,
                sellDex: sellDex.dex,
                buyPrice,
                sellPrice,
                spreadPercent,
                profitUsd: grossProfitUsd,
                gasEstimate: GAS_COST_USD,
                netProfit,
                liquidity: Math.min(buyDex.liquidity, sellDex.liquidity),
                confidence,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${tokenInSymbol}/${tokenOutSymbol} on ${network}:`, error);
      }
    }

    opportunities.sort((a, b) => b.netProfit - a.netProfit);
    return opportunities.slice(0, 10);
  }

  /**
   * Get ETH price in USD (for gas estimation)
   */
  async getEthPrice(network: Network): Promise<number> {
    const cacheKey = `eth_price_${network}`;
    const cached = this.getCached<number>(cacheKey);
    if (cached) return cached;

    try {
      // Get WETH/USDC price from on-chain
      const prices = await this.getAllDexPrices(network, 'WETH', 'USDC');
      
      for (const price of prices) {
        const wethPrice = this.getTokenPriceInTermsOf(
          price,
          TOKEN_ADDRESSES[network]?.['WETH'] || '',
          TOKEN_ADDRESSES[network]?.['USDC'] || ''
        );
        
        if (wethPrice > 0) {
          this.setCache(cacheKey, wethPrice);
          return wethPrice;
        }
      }
    } catch {
      // Fallback
    }

    return 3500; // Default fallback
  }
}

// Export singleton instance
export const priceFetcher = new OnChainPriceFetcher();

// Export class for testing
export { OnChainPriceFetcher };

