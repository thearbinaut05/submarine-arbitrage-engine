/**
 * On-Chain DEX Price Service
 * 
 * Fetches prices directly from DEX smart contracts via RPC calls.
 * NO external APIs = NO rate limits!
 * 
 * Supports:
 * - Uniswap V2/V3 pools
 * - SushiSwap, QuickSwap, PancakeSwap (V2 forks)
 * - Multiple RPC fallbacks per network
 */

import { ethers } from 'ethers';
import { Network } from '@/types/defi';

// ===== NETWORK CONFIGURATIONS =====
const NETWORK_RPCS: Record<Network, string[]> = {
  ethereum: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com',
    'https://eth.drpc.org',
  ],
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.drpc.org',
  ],
  polygon: [
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon.drpc.org',
  ],
  bsc: [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc.drpc.org',
  ],
  optimism: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.drpc.org',
  ],
  base: [
    'https://mainnet.base.org',
    'https://base.drpc.org',
    'https://rpc.ankr.com/base',
  ],
  avalanche: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche.drpc.org',
    'https://rpc.ankr.com/avalanche',
  ],
};

// ===== TOKEN CONFIGURATIONS =====
interface TokenConfig {
  address: string;
  decimals: number;
  symbol: string;
}

const TOKENS: Record<Network, Record<string, TokenConfig>> = {
  ethereum: {
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeACB5BE1023a', decimals: 18, symbol: 'DAI' },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, symbol: 'WBTC' },
    LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, symbol: 'LINK' },
  },
  arbitrum: {
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, symbol: 'DAI' },
    WBTC: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, symbol: 'WBTC' },
    ARB: { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB' },
  },
  polygon: {
    WMATIC: { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, symbol: 'WMATIC' },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, symbol: 'DAI' },
  },
  bsc: {
    WBNB: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, symbol: 'WBNB' },
    BUSD: { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, symbol: 'BUSD' },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT' },
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC' },
    ETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, symbol: 'ETH' },
  },
  optimism: {
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD96a8f233a91', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, symbol: 'DAI' },
  },
  base: {
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC' },
    cbETH: { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF', decimals: 18, symbol: 'cbETH' },
  },
  avalanche: {
    WAVAX: { address: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8', decimals: 18, symbol: 'WAVAX' },
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6', decimals: 6, symbol: 'USDT' },
  },
};

// ===== DEX CONFIGURATIONS =====
interface DexConfig {
  name: string;
  factory: string;
  type: 'v2' | 'v3';
  fee?: number; // For V2, standard 0.3%
}

const DEX_CONFIGS: Record<Network, DexConfig[]> = {
  ethereum: [
    { name: 'Uniswap V2', factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', type: 'v2', fee: 0.3 },
    { name: 'SushiSwap', factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac', type: 'v2', fee: 0.3 },
    { name: 'Uniswap V3', factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', type: 'v3' },
  ],
  arbitrum: [
    { name: 'Uniswap V2', factory: '0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9', type: 'v2', fee: 0.3 },
    { name: 'SushiSwap', factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0', type: 'v2', fee: 0.3 },
    { name: 'Camelot', factory: '0x6EcCab422D763aC031210895C81787E87B43A652', type: 'v2', fee: 0.3 },
    { name: 'Uniswap V3', factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', type: 'v3' },
  ],
  polygon: [
    { name: 'QuickSwap', factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', type: 'v2', fee: 0.3 },
    { name: 'SushiSwap', factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0', type: 'v2', fee: 0.3 },
    { name: 'Uniswap V3', factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', type: 'v3' },
  ],
  bsc: [
    { name: 'PancakeSwap V2', factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', type: 'v2', fee: 0.25 },
    { name: 'SushiSwap', factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0', type: 'v2', fee: 0.3 },
    { name: 'PancakeSwap V3', factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865', type: 'v3' },
  ],
  optimism: [
    { name: 'Velodrome', factory: '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746', type: 'v2', fee: 0.3 },
    { name: 'Uniswap V3', factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984', type: 'v3' },
  ],
  base: [
    { name: 'Aerodrome', factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da', type: 'v2', fee: 0.3 },
    { name: 'Uniswap V3', factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD', type: 'v3' },
  ],
  avalanche: [
    { name: 'TraderJoe', factory: '0x9Ad6C38BE94206cA50bb0d90783181d6547F1eeC', type: 'v2', fee: 0.3 },
    { name: 'SushiSwap', factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0', type: 'v2', fee: 0.3 },
  ],
};

// ===== ABIs =====
const V2_FACTORY_ABI = ['function getPair(address, address) view returns (address)'];
const V2_PAIR_ABI = [
  'function getReserves() view returns (uint112, uint112, uint32)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];
const V3_FACTORY_ABI = ['function getPool(address, address, uint24) view returns (address)'];
const V3_POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function liquidity() view returns (uint128)',
  'function fee() view returns (uint24)',
];

const V3_FEE_TIERS = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%

// ===== INTERFACES =====
export interface DexPrice {
  dex: string;
  network: Network;
  token0: string;
  token1: string;
  token0Address: string;
  token1Address: string;
  price: number; // token0 price in terms of token1
  inversePrice: number; // token1 price in terms of token0
  liquidity: number; // USD value
  fee: number; // DEX fee percentage
  timestamp: number;
}

export interface ArbitrageOpportunity {
  id: string;
  network: Network;
  tokenIn: string;
  tokenOut: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  profitUsd: number;
  gasEstimateUsd: number;
  netProfitUsd: number;
  minLiquidity: number;
  confidence: number;
  timestamp: number;
}

// ===== SERVICE CLASS =====
class OnChainPriceService {
  private providers: Map<Network, ethers.JsonRpcProvider> = new Map();
  private providerIndex: Map<Network, number> = new Map();
  private cache: Map<string, { data: DexPrice[]; timestamp: number }> = new Map();
  private cacheTimeout = 5000; // 5 seconds

  constructor() {
    this.initProviders();
  }

  private initProviders(): void {
    for (const [network, rpcs] of Object.entries(NETWORK_RPCS)) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcs[0]);
        this.providers.set(network as Network, provider);
        this.providerIndex.set(network as Network, 0);
      } catch (error) {
        console.warn(`Failed to create provider for ${network}:`, error);
      }
    }
  }

  private async getProvider(network: Network): Promise<ethers.JsonRpcProvider | null> {
    const provider = this.providers.get(network);
    if (!provider) return null;

    try {
      // Quick health check
      await provider.getBlockNumber();
      return provider;
    } catch {
      // Try to rotate to next RPC
      return this.rotateProvider(network);
    }
  }

  private rotateProvider(network: Network): ethers.JsonRpcProvider | null {
    const rpcs = NETWORK_RPCS[network];
    const currentIndex = this.providerIndex.get(network) || 0;
    const nextIndex = (currentIndex + 1) % rpcs.length;

    try {
      const provider = new ethers.JsonRpcProvider(rpcs[nextIndex]);
      this.providers.set(network, provider);
      this.providerIndex.set(network, nextIndex);
      console.log(`Rotated ${network} RPC to index ${nextIndex}`);
      return provider;
    } catch {
      return null;
    }
  }

  /**
   * Get V2 pair price
   */
  private async getV2Price(
    provider: ethers.JsonRpcProvider,
    network: Network,
    dex: DexConfig,
    token0: TokenConfig,
    token1: TokenConfig
  ): Promise<DexPrice | null> {
    try {
      const factory = new ethers.Contract(dex.factory, V2_FACTORY_ABI, provider);
      const pairAddress = await factory.getPair(token0.address, token1.address);

      if (!pairAddress || pairAddress === ethers.ZeroAddress) {
        return null;
      }

      const pair = new ethers.Contract(pairAddress, V2_PAIR_ABI, provider);
      const [reserve0, reserve1] = await pair.getReserves();
      const actualToken0 = await pair.token0();

      // Ensure correct token ordering
      const isToken0First = actualToken0.toLowerCase() === token0.address.toLowerCase();
      const [r0, r1] = isToken0First ? [reserve0, reserve1] : [reserve1, reserve0];
      const [d0, d1] = isToken0First ? [token0.decimals, token1.decimals] : [token1.decimals, token0.decimals];

      const amount0 = Number(ethers.formatUnits(r0, d0));
      const amount1 = Number(ethers.formatUnits(r1, d1));

      if (amount0 === 0 || amount1 === 0) return null;

      const price = amount1 / amount0; // token0 price in terms of token1
      const inversePrice = amount0 / amount1;

      // Estimate liquidity in USD (assume stablecoin ≈ $1)
      const stableSymbols = ['USDC', 'USDT', 'DAI', 'BUSD'];
      let liquidityUsd = 0;
      if (stableSymbols.includes(token0.symbol)) {
        liquidityUsd = amount0 * 2;
      } else if (stableSymbols.includes(token1.symbol)) {
        liquidityUsd = amount1 * 2;
      } else {
        // Rough estimate using token amounts
        liquidityUsd = (amount0 + amount1) * 1000; // Placeholder
      }

      return {
        dex: dex.name,
        network,
        token0: token0.symbol,
        token1: token1.symbol,
        token0Address: token0.address,
        token1Address: token1.address,
        price,
        inversePrice,
        liquidity: liquidityUsd,
        fee: dex.fee || 0.3,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Silently fail for missing pairs
      return null;
    }
  }

  /**
   * Get V3 pool price
   */
  private async getV3Price(
    provider: ethers.JsonRpcProvider,
    network: Network,
    dex: DexConfig,
    token0: TokenConfig,
    token1: TokenConfig,
    feeTier: number
  ): Promise<DexPrice | null> {
    try {
      const factory = new ethers.Contract(dex.factory, V3_FACTORY_ABI, provider);
      const poolAddress = await factory.getPool(token0.address, token1.address, feeTier);

      if (!poolAddress || poolAddress === ethers.ZeroAddress) {
        return null;
      }

      const pool = new ethers.Contract(poolAddress, V3_POOL_ABI, provider);
      const slot0 = await pool.slot0();
      const actualToken0 = await pool.token0();
      const liquidity = await pool.liquidity();

      const sqrtPriceX96 = slot0.sqrtPriceX96;
      const isToken0First = actualToken0.toLowerCase() === token0.address.toLowerCase();

      // Calculate price from sqrtPriceX96
      // price = (sqrtPriceX96 / 2^96)^2 * 10^(decimals0 - decimals1)
      const sqrtPrice = Number(sqrtPriceX96) / 2 ** 96;
      let rawPrice = sqrtPrice * sqrtPrice;

      // Adjust for decimals
      const decimalDiff = token0.decimals - token1.decimals;
      rawPrice = rawPrice * 10 ** decimalDiff;

      // Handle token ordering
      const price = isToken0First ? rawPrice : 1 / rawPrice;
      const inversePrice = 1 / price;

      // Estimate liquidity
      const liquidityNum = Number(liquidity);
      const liquidityUsd = liquidityNum / 1e18 * 1000; // Rough estimate

      return {
        dex: `${dex.name} (${feeTier / 10000}%)`,
        network,
        token0: token0.symbol,
        token1: token1.symbol,
        token0Address: token0.address,
        token1Address: token1.address,
        price,
        inversePrice,
        liquidity: Math.max(liquidityUsd, 10000),
        fee: feeTier / 10000,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all DEX prices for a token pair on a network
   */
  async getPricesForPair(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<DexPrice[]> {
    const cacheKey = `${network}:${tokenInSymbol}:${tokenOutSymbol}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const provider = await this.getProvider(network);
    if (!provider) return [];

    const tokens = TOKENS[network];
    const token0 = tokens?.[tokenInSymbol];
    const token1 = tokens?.[tokenOutSymbol];

    if (!token0 || !token1) {
      console.warn(`Tokens not found: ${tokenInSymbol}/${tokenOutSymbol} on ${network}`);
      return [];
    }

    const dexes = DEX_CONFIGS[network] || [];
    const prices: DexPrice[] = [];

    // Fetch prices from all DEXs in parallel
    const pricePromises: Promise<DexPrice | null>[] = [];

    for (const dex of dexes) {
      if (dex.type === 'v2') {
        pricePromises.push(this.getV2Price(provider, network, dex, token0, token1));
      } else if (dex.type === 'v3') {
        // Try all fee tiers for V3
        for (const feeTier of V3_FEE_TIERS) {
          pricePromises.push(this.getV3Price(provider, network, dex, token0, token1, feeTier));
        }
      }
    }

    const results = await Promise.allSettled(pricePromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        prices.push(result.value);
      }
    }

    // Cache results
    this.cache.set(cacheKey, { data: prices, timestamp: Date.now() });

    return prices;
  }

  /**
   * Scan for arbitrage opportunities on a network
   */
  async scanNetwork(
    network: Network,
    minProfitPercent: number = 0.05,
    minProfitUsd: number = 5
  ): Promise<ArbitrageOpportunity[]> {
    const tokens = TOKENS[network];
    if (!tokens) return [];

    const tokenSymbols = Object.keys(tokens);
    const opportunities: ArbitrageOpportunity[] = [];
    const gasEstimateUsd = this.getGasEstimate(network);

    // Generate token pairs (avoid duplicates)
    const pairs: [string, string][] = [];
    for (let i = 0; i < tokenSymbols.length; i++) {
      for (let j = i + 1; j < tokenSymbols.length; j++) {
        pairs.push([tokenSymbols[i], tokenSymbols[j]]);
      }
    }

    // Fetch prices for all pairs in parallel
    const pairPrices = await Promise.all(
      pairs.map(([t0, t1]) => this.getPricesForPair(network, t0, t1))
    );

    for (let i = 0; i < pairs.length; i++) {
      const [token0, token1] = pairs[i];
      const prices = pairPrices[i];

      if (prices.length < 2) continue;

      // Find arbitrage opportunities between DEXs
      for (let a = 0; a < prices.length; a++) {
        for (let b = a + 1; b < prices.length; b++) {
          const dexA = prices[a];
          const dexB = prices[b];

          // Check both directions
          const opp = this.checkArbitrage(dexA, dexB, gasEstimateUsd, minProfitPercent, minProfitUsd);
          if (opp) {
            opportunities.push(opp);
          }
        }
      }
    }

    // Sort by net profit
    opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);

    return opportunities.slice(0, 20); // Return top 20
  }

  /**
   * Check if there's an arbitrage opportunity between two DEX prices
   */
  private checkArbitrage(
    dexA: DexPrice,
    dexB: DexPrice,
    gasEstimateUsd: number,
    minProfitPercent: number,
    minProfitUsd: number
  ): ArbitrageOpportunity | null {
    // Direction 1: Buy on A, sell on B
    const spread1 = ((dexB.price - dexA.price) / dexA.price) * 100;
    // Direction 2: Buy on B, sell on A
    const spread2 = ((dexA.price - dexB.price) / dexB.price) * 100;

    let buyDex: DexPrice, sellDex: DexPrice, spreadPercent: number;

    if (spread1 > spread2 && spread1 > 0) {
      buyDex = dexA;
      sellDex = dexB;
      spreadPercent = spread1;
    } else if (spread2 > 0) {
      buyDex = dexB;
      sellDex = dexA;
      spreadPercent = spread2;
    } else {
      return null;
    }

    // Account for DEX fees
    const totalFees = buyDex.fee + sellDex.fee;
    const netSpread = spreadPercent - totalFees;

    if (netSpread < minProfitPercent) return null;

    // Calculate potential profit with $10k trade
    const tradeAmount = 10000;
    const minLiquidity = Math.min(buyDex.liquidity, sellDex.liquidity);
    const actualTradeAmount = Math.min(tradeAmount, minLiquidity * 0.1); // Max 10% of liquidity
    const grossProfitUsd = actualTradeAmount * (netSpread / 100);
    const netProfitUsd = grossProfitUsd - gasEstimateUsd;

    if (netProfitUsd < minProfitUsd) return null;

    // Calculate confidence
    const liquidityScore = Math.min(minLiquidity / 100000, 1) * 40;
    const spreadScore = Math.min(netSpread / 1, 1) * 40;
    const feeScore = totalFees < 0.5 ? 20 : 10;
    const confidence = Math.min(liquidityScore + spreadScore + feeScore, 95);

    return {
      id: `${buyDex.network}-${buyDex.token0}-${buyDex.token1}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      network: buyDex.network,
      tokenIn: buyDex.token0,
      tokenOut: buyDex.token1,
      tokenInAddress: buyDex.token0Address,
      tokenOutAddress: buyDex.token1Address,
      buyDex: buyDex.dex,
      sellDex: sellDex.dex,
      buyPrice: buyDex.price,
      sellPrice: sellDex.price,
      spreadPercent: netSpread,
      profitUsd: grossProfitUsd,
      gasEstimateUsd,
      netProfitUsd,
      minLiquidity,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Get estimated gas cost in USD for a network
   */
  private getGasEstimate(network: Network): number {
    const estimates: Record<Network, number> = {
      ethereum: 25, // ~$25 gas for arb tx
      arbitrum: 2,
      polygon: 0.5,
      bsc: 0.3,
      optimism: 1,
      base: 0.5,
      avalanche: 1,
    };
    return estimates[network] || 5;
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks(): Network[] {
    return Object.keys(NETWORK_RPCS) as Network[];
  }

  /**
   * Get supported tokens for a network
   */
  getSupportedTokens(network: Network): string[] {
    return Object.keys(TOKENS[network] || {});
  }
}

// Export singleton instance
export const onChainPriceService = new OnChainPriceService();
