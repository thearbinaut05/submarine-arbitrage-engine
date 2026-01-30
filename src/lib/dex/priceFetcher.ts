import { ethers } from 'ethers';
import { Network, NetworkConfig } from '@/types/defi';
import {
  UNISWAP_V2_PAIR_ABI,
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V3_POOL_ABI,
  ERC20_ABI,
  MULTICALL_ABI,
} from './abis';

// Network configurations with DEX factory addresses
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
    DAI: '0x6B175474E89094C44Da98b954EescdeCB5BE1023a',
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
};

// Uniswap V3 fee tiers
const UNISWAP_V3_FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

export interface TokenPrice {
  token: string;
  address: string;
  price: number; // in USD
  decimals: number;
  liquidity?: number;
  lastUpdated: number;
}

export interface DexPrice {
  dex: string;
  token0: string;
  token1: string;
  price0: number; // price of token0 in token1
  price1: number; // price of token1 in token0
  reserve0: bigint;
  reserve1: bigint;
  liquidity: number; // in USD
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

class OnChainPriceFetcher {
  private providers: Map<Network, ethers.JsonRpcProvider> = new Map();
  private multicallAddress: Map<Network, string> = new Map();
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTimeout = 10000; // 10 seconds

  constructor() {
    // Initialize providers for each network
    this.initProviders();
  }

  private initProviders() {
    const rpcUrls: Record<Network, string> = {
      ethereum: 'https://eth.llamarpc.com',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      polygon: 'https://polygon-rpc.com',
      bsc: 'https://bsc-dataseed.binance.org',
    };

    for (const [network, url] of Object.entries(rpcUrls)) {
      try {
        this.providers.set(network as Network, new ethers.JsonRpcProvider(url));
      } catch (error) {
        console.error(`Failed to create provider for ${network}:`, error);
      }
    }

    // Multicall addresses
    this.multicallAddress.set('ethereum', '0xeefBa1e63905eF1D7ACbA5bd8518a7c8A76d1Da0');
    this.multicallAddress.set('arbitrum', '0x842eC2d7C7d22D0fDa293C4d70e0bDc0aB20C8A6');
    this.multicallAddress.set('polygon', '0x275617327c1C7138bF9dB817E7fBba3d5d8C8d0a');
    this.multicallAddress.set('bsc', '0x963D8e53A29e9D93c6D68f2C7aD77F1d8eB4d8c1');
  }

  private getProvider(network: Network): ethers.JsonRpcProvider | null {
    return this.providers.get(network) || null;
  }

  private getCacheKey(key: string): string {
    return `${key}_${Date.now()}`;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Get token decimals
  async getTokenDecimals(network: Network, tokenAddress: string): Promise<number> {
    const provider = this.getProvider(network);
    if (!provider) return 18;

    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      return await contract.decimals();
    } catch {
      return 18; // Default to 18
    }
  }

  // Calculate price from Uniswap V2 pair reserves
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

  // Get Uniswap V2 pair address
  async getUniswapV2PairAddress(
    network: Network,
    factoryAddress: string,
    token0: string,
    token1: string
  ): Promise<string | null> {
    const provider = this.getProvider(network);
    if (!provider) return null;

    try {
      const factory = new ethers.Contract(factoryAddress, UNISWAP_V2_FACTORY_ABI, provider);
      return await factory.getPair(token0, token1);
    } catch {
      return null;
    }
  }

  // Get Uniswap V2 pair data
  async getUniswapV2PairData(
    network: Network,
    pairAddress: string
  ): Promise<DexPrice | null> {
    const provider = this.getProvider(network);
    if (!provider || pairAddress === ethers.ZeroAddress) return null;

    try {
      const pair = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
      const [reserve0, reserve1] = await pair.getReserves();
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

      // Calculate liquidity (simplified, in USD)
      const amount0 = Number(ethers.formatUnits(reserve0, decimals0));
      const amount1 = Number(ethers.formatUnits(reserve1, decimals1));
      const liquidity = (amount0 + amount1) * 100; // Simplified: assume $100 per unit

      return {
        dex: 'Uniswap V2',
        token0: token0Address,
        token1: token1Address,
        price0,
        price1,
        reserve0,
        reserve1,
        liquidity,
      };
    } catch {
      return null;
    }
  }

  // Get Uniswap V3 pool price
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

      const liquidityUsd = Number(ethers.formatUnits(liquidity, 18)) * 100; // Simplified

      return {
        dex: 'Uniswap V3',
        token0: token0Address,
        token1: token1Address,
        price0,
        price1,
        reserve0: BigInt(0),
        reserve1: BigInt(0),
        liquidity: liquidityUsd,
      };
    } catch {
      return null;
    }
  }

  // Get prices from all DEXs for a token pair
  async getAllDexPrices(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<DexPrice[]> {
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

    // Get prices from Uniswap V2 (SushiSwap uses same factory)
    const v2PairAddress = await this.getUniswapV2PairAddress(network, dexes.uniswapV2, tokenIn, tokenOut);
    if (v2PairAddress) {
      const v2Data = await this.getUniswapV2PairData(network, v2PairAddress);
      if (v2Data) prices.push(v2Data);
    }

    // Also check SushiSwap
    const sushiPairAddress = await this.getUniswapV2PairAddress(network, dexes.sushiswap, tokenIn, tokenOut);
    if (sushiPairAddress) {
      const sushiData = await this.getUniswapV2PairData(network, sushiPairAddress);
      if (sushiData) {
        sushiData.dex = 'SushiSwap';
        prices.push(sushiData);
      }
    }

    // Get prices from Uniswap V3
    for (const feeTier of UNISWAP_V3_FEE_TIERS) {
      const provider = this.getProvider(network);
      if (!provider) continue;

      try {
        const factory = new ethers.Contract(
          dexes.uniswapV3,
          ['function getPool(address, address, uint24) view returns (address)'],
          provider
        );
        const poolAddress = await factory.getPool(tokenIn, tokenOut, feeTier);

        if (poolAddress && poolAddress !== ethers.ZeroAddress) {
          const v3Data = await this.getUniswapV3PoolPrice(network, poolAddress);
          if (v3Data) {
            v3Data.dex = `Uniswap V3 (${feeTier / 10000}%)`;
            prices.push(v3Data);
          }
        }
      } catch {
        // Continue to next fee tier
      }
    }

    // Check QuickSwap on Polygon
    if (network === 'polygon' && dexes.quickswap) {
      const quickPairAddress = await this.getUniswapV2PairAddress(network, dexes.quickswap, tokenIn, tokenOut);
      if (quickPairAddress) {
        const quickData = await this.getUniswapV2PairData(network, quickPairAddress);
        if (quickData) {
          quickData.dex = 'QuickSwap';
          prices.push(quickData);
        }
      }
    }

    // Check PancakeSwap on BSC
    if (network === 'bsc' && dexes.pancakeswap) {
      const cakePairAddress = await this.getUniswapV2PairAddress(network, dexes.pancakeswap, tokenIn, tokenOut);
      if (cakePairAddress) {
        const cakeData = await this.getUniswapV2PairData(network, cakePairAddress);
        if (cakeData) {
          cakeData.dex = 'PancakeSwap';
          prices.push(cakeData);
        }
      }
    }

    return prices;
  }

  // Scan for arbitrage opportunities on a network
  async scanArbitrageOpportunities(
    network: Network,
    minProfitPercent: number = 0.1,
    minProfitUsd: number = 10
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const tokenPairs = [
      ['WETH', 'USDC'],
      ['WETH', 'USDT'],
      ['WETH', 'DAI'],
      ['USDC', 'USDT'],
      ['WBTC', 'WETH'],
      ['LINK', 'WETH'],
    ];

    for (const [tokenIn, tokenOut] of tokenPairs) {
      try {
        const allPrices = await this.getAllDexPrices(network, tokenIn, tokenOut);

        if (allPrices.length < 2) continue;

        // Find best buy and sell prices
        let bestBuy: DexPrice | null = null;
        let bestSell: DexPrice | null = null;
        let maxSpread = 0;

        for (const price of allPrices) {
          // Determine which token is which in the pair
          const tokenInPrice = price.token0.toLowerCase() === tokenIn.toLowerCase() 
            ? price.price0 
            : price.price1;
          
          const tokenOutPrice = price.token0.toLowerCase() === tokenIn.toLowerCase()
            ? price.price1
            : price.price0;

          // Calculate spread (simplified)
          const spread = Math.abs(tokenInPrice - tokenOutPrice) / Math.min(tokenInPrice, tokenOutPrice);

          if (spread > maxSpread) {
            maxSpread = spread;
            bestBuy = price;
            bestSell = price;
          }
        }

        // Check for price differences between DEXs
        for (let i = 0; i < allPrices.length; i++) {
          for (let j = i + 1; j < allPrices.length; j++) {
            const dex1 = allPrices[i];
            const dex2 = allPrices[j];

            // Normalize prices to same direction
            const price1In = dex1.token0.toLowerCase() === tokenIn.toLowerCase()
              ? dex1.price0
              : dex1.price1;
            const price2In = dex2.token0.toLowerCase() === tokenIn.toLowerCase()
              ? dex2.price0
              : dex2.price1;

            if (price1In === 0 || price2In === 0) continue;

            // Calculate spread
            const spread = Math.abs(price1In - price2In) / Math.min(price1In, price2In);
            const spreadPercent = spread * 100;

            // Estimate gas cost (simplified)
            const gasEstimate = 0.02; // ~$20 in ETH
            const tradeAmount = 10000; // $10k trade
            const profitUsd = tradeAmount * (spreadPercent / 100);
            const netProfit = profitUsd - gasEstimate;

            if (
              spreadPercent >= minProfitPercent &&
              profitUsd >= minProfitUsd &&
              netProfit > 0
            ) {
              const buyDex = price1In < price2In ? dex1 : dex2;
              const sellDex = price1In < price2In ? dex2 : dex1;

              opportunities.push({
                network,
                tokenIn,
                tokenOut,
                buyDex: buyDex.dex,
                sellDex: sellDex.dex,
                buyPrice: Math.min(price1In, price2In),
                sellPrice: Math.max(price1In, price2In),
                spreadPercent,
                profitUsd,
                gasEstimate,
                netProfit,
                liquidity: Math.min(buyDex.liquidity, sellDex.liquidity),
                confidence: Math.min(spreadPercent * 50 + 50, 95),
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${tokenIn}/${tokenOut} on ${network}:`, error);
      }
    }

    // Sort by net profit
    opportunities.sort((a, b) => b.netProfit - a.netProfit);
    return opportunities.slice(0, 10);
  }

  // Get ETH price in USD (for gas estimation)
  async getEthPrice(network: Network): Promise<number> {
    const cacheKey = `eth_price_${network}`;
    const cached = this.getCached<number>(cacheKey);
    if (cached) return cached;

    try {
      // Get WETH/USDC price from on-chain
      const prices = await this.getAllDexPrices(network, 'WETH', 'USDC');
      
      if (prices.length > 0) {
        const wethUsdcPrice = prices[0];
        const price = wethUsdcPrice.token0.toLowerCase() === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'.toLowerCase()
          ? wethUsdcPrice.price0
          : wethUsdcPrice.price1;
        
        this.setCache(cacheKey, price);
        return price;
      }
    } catch {
      // Fallback to cached price or default
    }

    return 3500; // Default fallback
  }
}

// Export singleton instance
export const priceFetcher = new OnChainPriceFetcher();

// Export class for testing
export { OnChainPriceFetcher };

