import { ethers } from 'ethers';
import { Network } from '@/types/defi';
import { DexAggregator, DexPrice } from './DexAggregator';

// Token addresses by network - needed for accurate token matching
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

export interface PriceMonitorConfig {
  networks: Network[];
  tokens: string[];
  checkIntervalMs: number;
  priceChangeThresholdPercent: number;
  alertCallback?: (alert: PriceAlert) => void;
}

export interface PriceAlert {
  type: 'spike' | 'drop' | 'arbitrage';
  network: Network;
  token: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  timestamp: number;
}

interface TrackedPrice {
  symbol: string;
  network: Network;
  currentPrice: number;
  previousPrice: number;
  history: number[];
  lastUpdated: number;
}

export class PriceMonitor {
  private config: PriceMonitorConfig;
  private trackedPrices: Map<string, TrackedPrice> = new Map();
  private dexAggregator: DexAggregator;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;
  private alertCallback?: (alert: PriceAlert) => void;

  constructor(config?: Partial<PriceMonitorConfig>) {
    this.config = {
      networks: ['ethereum', 'arbitrum', 'polygon', 'bsc'],
      tokens: ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK'],
      checkIntervalMs: 2000,
      priceChangeThresholdPercent: 0.5,
      ...config,
    };
    this.dexAggregator = new DexAggregator();
    this.alertCallback = this.config.alertCallback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.initializeTrackedPrices();
    this.checkAllPrices();
    this.intervalId = setInterval(() => this.checkAllPrices(), this.config.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async initializeTrackedPrices(): Promise<void> {
    for (const network of this.config.networks) {
      for (const token of this.config.tokens) {
        const key = this.getPriceKey(network, token);
        const prices = await this.dexAggregator.getAllPrices(network, token, 'USDC');
        const currentPrice = this.calculateAveragePrice(prices);
        this.trackedPrices.set(key, {
          symbol: token,
          network,
          currentPrice,
          previousPrice: currentPrice,
          history: [currentPrice],
          lastUpdated: Date.now(),
        });
      }
    }
  }

  private async checkAllPrices(): Promise<void> {
    for (const network of this.config.networks) {
      for (const token of this.config.tokens) {
        await this.checkPrice(network, token);
      }
    }
  }

  private async checkPrice(network: Network, token: string): Promise<void> {
    const key = this.getPriceKey(network, token);
    const prices = await this.dexAggregator.getAllPrices(network, token, 'USDC');
    const newPrice = this.calculateAveragePrice(prices);
    if (newPrice === 0) return;

    const tracked = this.trackedPrices.get(key);
    if (tracked) {
      tracked.previousPrice = tracked.currentPrice;
      tracked.currentPrice = newPrice;
      tracked.history.push(newPrice);
      tracked.lastUpdated = Date.now();
      if (tracked.history.length > 100) tracked.history = tracked.history.slice(-100);

      const changePercent = this.calculatePriceChange(tracked.previousPrice, newPrice);
      if (Math.abs(changePercent) >= this.config.priceChangeThresholdPercent) {
        const alert: PriceAlert = {
          type: changePercent > 0 ? 'spike' : 'drop',
          network,
          token,
          oldPrice: tracked.previousPrice,
          newPrice,
          changePercent,
          timestamp: Date.now(),
        };
        this.emitAlert(alert);
      }
    } else {
      this.trackedPrices.set(key, {
        symbol: token,
        network,
        currentPrice: newPrice,
        previousPrice: newPrice,
        history: [newPrice],
        lastUpdated: Date.now(),
      });
    }
  }

  async detectArbitrageOpportunities(
    network: Network,
    tokenInSymbol: string,
    tokenOutSymbol: string
  ): Promise<Array<{ buyDex: string; sellDex: string; spreadPercent: number; potentialProfit: number }>> {
    // Get token addresses
    const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
    const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

    if (!tokenInAddress || !tokenOutAddress) {
      console.warn(`Token addresses not found for ${tokenInSymbol}/${tokenOutSymbol} on ${network}`);
      return [];
    }

    const prices = await this.dexAggregator.getAllPrices(network, tokenInSymbol, tokenOutSymbol);
    const opportunities: Array<{ buyDex: string; sellDex: string; spreadPercent: number; potentialProfit: number }> = [];
    if (prices.length < 2) return opportunities;

    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const dex1 = prices[i];
        const dex2 = prices[j];

        // Get normalized prices for tokenIn in terms of tokenOut
        const normalized1 = this.getTokenPriceInTermsOf(dex1, tokenInAddress, tokenOutAddress);
        const normalized2 = this.getTokenPriceInTermsOf(dex2, tokenInAddress, tokenOutAddress);

        if (normalized1 === 0 || normalized2 === 0) continue;

        // Calculate spread - this is the price difference between DEXs
        const minPrice = Math.min(normalized1, normalized2);
        const maxPrice = Math.max(normalized1, normalized2);
        const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;
        const potentialProfit = 10000 * (spreadPercent / 100);

        // Only consider if spread is significant and profitable
        if (spreadPercent > 0.5 && potentialProfit > 50) {
          // Buy on DEX with lower price, sell on DEX with higher price
          const buyDex = normalized1 < normalized2 ? dex1 : dex2;
          const sellDex = normalized1 < normalized2 ? dex2 : dex1;
          const buyPrice = Math.min(normalized1, normalized2);
          const sellPrice = Math.max(normalized1, normalized2);

          opportunities.push({
            buyDex: buyDex.dex,
            sellDex: sellDex.dex,
            spreadPercent,
            potentialProfit,
          });
        }
      }
    }
    return opportunities.sort((a, b) => b.potentialProfit - a.potentialProfit).slice(0, 10);
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

  private calculateAveragePrice(prices: DexPrice[]): number {
    if (prices.length === 0) return 0;
    const validPrices = prices.map(p => p.price0 > 0 ? p.price0 : p.price1).filter(p => p > 0);
    if (validPrices.length === 0) return 0;
    return validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
  }

  private calculatePriceChange(oldPrice: number, newPrice: number): number {
    if (oldPrice === 0) return 0;
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  private emitAlert(alert: PriceAlert): void {
    console.log(`Price Alert: ${alert.token} on ${alert.network} - ${alert.changePercent.toFixed(2)}%`);
    if (this.alertCallback) this.alertCallback(alert);
  }

  async getCurrentPrice(network: Network, token: string): Promise<number> {
    const key = this.getPriceKey(network, token);
    const tracked = this.trackedPrices.get(key);
    if (tracked) return tracked.currentPrice;
    const prices = await this.dexAggregator.getAllPrices(network, token, 'USDC');
    return this.calculateAveragePrice(prices);
  }

  getPriceHistory(network: Network, token: string, points: number = 50): number[] {
    const key = this.getPriceKey(network, token);
    const tracked = this.trackedPrices.get(key);
    return tracked?.history.slice(-points) || [];
  }

  getPriceStats(network: Network, token: string) {
    const key = this.getPriceKey(network, token);
    const tracked = this.trackedPrices.get(key);
    if (!tracked || tracked.history.length === 0) return null;
    const history = tracked.history;
    return {
      current: tracked.currentPrice,
      high24h: Math.max(...history),
      low24h: Math.min(...history),
      change24h: history[0] > 0 ? ((tracked.currentPrice - history[0]) / history[0]) * 100 : 0,
    };
  }

  setAlertCallback(callback: (alert: PriceAlert) => void): void {
    this.alertCallback = callback;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      trackedPairs: this.trackedPrices.size,
      networks: this.config.networks,
      tokens: this.config.tokens,
    };
  }

  private getPriceKey(network: Network, token: string): string {
    return `${network}:${token}`;
  }
}

export const priceMonitor = new PriceMonitor();

