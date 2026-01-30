/**
 * CoinGecko Price Fetcher
 * 
 * Replaces on-chain RPC calls with CoinGecko API for reliable price data
 */

import { Network } from '@/types/defi';
import {
  getTokenPrice,
  getMultipleTokenPrices,
  getAllDexPricesForToken,
  scanArbitrageOpportunities as scanViaCoinGecko,
  getNetworkOverview,
  getApiStatus,
  clearPriceCache,
  TokenPrice,
  DexPrice,
  ArbitrageOpportunity,
} from './coingecko';

// Token pairs to scan on each network
const TOKEN_PAIRS: Record<Network, string[][]> = {
  ethereum: [
    ['WETH', 'USDC'],
    ['WETH', 'USDT'],
    ['WETH', 'DAI'],
    ['USDC', 'USDT'],
    ['WBTC', 'WETH'],
    ['LINK', 'WETH'],
    ['UNI', 'WETH'],
    ['AAVE', 'WETH'],
    ['ETH', 'USDC'],
    ['ETH', 'USDT'],
  ],
  arbitrum: [
    ['WETH', 'USDC'],
    ['WETH', 'USDT'],
    ['WETH', 'DAI'],
    ['WBTC', 'WETH'],
    ['LINK', 'WETH'],
    ['ARB', 'WETH'],
    ['ETH', 'USDC'],
  ],
  polygon: [
    ['WMATIC', 'WETH'],
    ['WMATIC', 'USDC'],
    ['WETH', 'USDC'],
    ['WETH', 'USDT'],
    ['WETH', 'DAI'],
    ['MATIC', 'USDC'],
    ['QUICK', 'WETH'],
  ],
  bsc: [
    ['WBNB', 'BUSD'],
    ['WBNB', 'USDT'],
    ['WBNB', 'USDC'],
    ['ETH', 'USDT'],
    ['BTCB', 'USDT'],
    ['CAKE', 'WBNB'],
    ['BNB', 'BUSD'],
  ],
  optimism: [
    ['WETH', 'USDC'],
    ['WETH', 'USDT'],
    ['WETH', 'DAI'],
    ['ETH', 'USDC'],
  ],
  base: [
    ['WETH', 'USDC'],
    ['ETH', 'USDC'],
    ['CBETH', 'WETH'],
  ],
};

export interface CoinGeckoTokenPrice {
  token: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: number;
}

export interface CoinGeckoDexPrice {
  dex: string;
  pair: string;
  price: number;
  volume24h: number;
  liquidity: number;
  tradeUrl: string;
}

export interface CoinGeckoArbitrageOpportunity {
  id: string;
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
  timestamp: number;
  route: string[];
}

/**
 * CoinGecko Price Fetcher Class
 */
export class CoinGeckoPriceFetcher {
  private defaultGasEstimate: number = 15; // USD

  /**
   * Get token price from CoinGecko
   */
  async getTokenPrice(network: Network, tokenSymbol: string): Promise<CoinGeckoTokenPrice | null> {
    const price = await getTokenPrice(network, tokenSymbol);
    
    if (!price) return null;

    return {
      token: tokenSymbol,
      price: price.currentPrice,
      change24h: price.priceChangePercentage24h,
      volume24h: price.volume24h,
      marketCap: price.marketCap,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get multiple token prices at once
   */
  async getMultiplePrices(
    network: Network,
    tokenSymbols: string[]
  ): Promise<Map<string, CoinGeckoTokenPrice>> {
    const prices = await getMultipleTokenPrices(network, tokenSymbols);
    const result = new Map<string, CoinGeckoTokenPrice>();

    for (const [symbol, price] of prices) {
      result.set(symbol, {
        token: symbol,
        price: price.currentPrice,
        change24h: price.priceChangePercentage24h,
        volume24h: price.volume24h,
        marketCap: price.marketCap,
        lastUpdated: Date.now(),
      });
    }

    return result;
  }

  /**
   * Get prices from all DEXs for a token
   */
  async getAllDexPrices(
    network: Network,
    tokenSymbol: string
  ): Promise<CoinGeckoDexPrice[]> {
    const dexPrices = await getAllDexPricesForToken(network, tokenSymbol);

    return dexPrices.map(dex => ({
      dex: dex.dex,
      pair: `${dex.baseToken}/${dex.quoteToken}`,
      price: dex.price,
      volume24h: dex.volume24h,
      liquidity: dex.liquidity,
      tradeUrl: dex.tradeUrl,
    }));
  }

  /**
   * Scan for arbitrage opportunities using CoinGecko data
   */
  async scanArbitrageOpportunities(
    network: Network,
    minProfitPercent: number = 0.1,
    minProfitUsd: number = 10
  ): Promise<CoinGeckoArbitrageOpportunity[]> {
    const tokenPairs = TOKEN_PAIRS[network] || TOKEN_PAIRS.ethereum;

    const opportunities = await scanViaCoinGecko(
      network,
      tokenPairs,
      minProfitPercent,
      minProfitUsd
    );

    return opportunities.map(opp => ({
      id: opp.id,
      network: opp.network as Network,
      tokenIn: opp.tokenIn,
      tokenOut: opp.tokenOut,
      buyDex: opp.buyDex,
      sellDex: opp.sellDex,
      buyPrice: opp.buyPrice,
      sellPrice: opp.sellPrice,
      spreadPercent: opp.spreadPercent,
      profitUsd: opp.profitUsd,
      gasEstimate: opp.gasEstimate,
      netProfit: opp.netProfit,
      liquidity: 100000, // CoinGecko provides volume, use as liquidity proxy
      confidence: opp.confidence,
      timestamp: opp.timestamp,
      route: opp.route,
    }));
  }

  /**
   * Get market overview for a network
   */
  async getNetworkOverview(network: Network) {
    return getNetworkOverview(network);
  }

  /**
   * Get API status
   */
  getStatus() {
    return getApiStatus();
  }

  /**
   * Clear cache
   */
  clearCache() {
    clearPriceCache();
  }

  /**
   * Set gas estimate (can be adjusted based on network)
   */
  setGasEstimate(gasUsd: number) {
    this.defaultGasEstimate = gasUsd;
  }
}

// Export singleton instance
export const coinGeckoFetcher = new CoinGeckoPriceFetcher();

