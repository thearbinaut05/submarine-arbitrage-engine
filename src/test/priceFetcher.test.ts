import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { ethers } from 'ethers';
import { OnChainPriceFetcher, type ArbitrageOpportunity, type DexPrice, type TokenPrice } from '@/lib/dex/priceFetcher';
import { Network } from '@/types/defi';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: vi.fn(),
    Contract: vi.fn().mockImplementation(() => ({
      decimals: vi.fn().mockResolvedValue(18),
      symbol: vi.fn().mockResolvedValue('WETH'),
      name: vi.fn().mockResolvedValue('Wrapped Ether'),
      getReserves: vi.fn().mockResolvedValue([
        BigInt('1000000000000000000'),
        BigInt('3500000000000000000000'),
      ]),
      token0: vi.fn().mockResolvedValue('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
      token1: vi.fn().mockResolvedValue('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'),
      factory: vi.fn().mockResolvedValue('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'),
      slot0: vi.fn().mockResolvedValue([
        BigInt('79228162514264337593543950336'), // sqrtPriceX96 for 1:1
        0,
        0,
        0,
        0,
        0,
        true,
      ]),
      liquidity: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
      getPool: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000'),
      getPair: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000'),
    })),
    formatUnits: vi.fn((val: bigint | string, decimals: number) => {
      const value = typeof val === 'string' ? BigInt(val) : val;
      const divisor = BigInt(10) ** BigInt(decimals);
      return String(Number(value) / Number(divisor));
    }),
    formatEther: vi.fn((val: bigint | string) => {
      const value = typeof val === 'string' ? BigInt(val) : val;
      return String(Number(value) / 1e18);
    }),
    parseEther: vi.fn((val: string) => BigInt(Math.floor(Number(val) * 1e18))),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
  },
}));

describe('OnChainPriceFetcher', () => {
  let priceFetcher: OnChainPriceFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    priceFetcher = new OnChainPriceFetcher();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should initialize providers for all networks', () => {
      expect(priceFetcher).toBeInstanceOf(OnChainPriceFetcher);
    });

    it('should have providers initialized', () => {
      // Access private property for testing
      const providers = (priceFetcher as any).providers;
      expect(providers.size).toBeGreaterThan(0);
    });
  });

  describe('getTokenDecimals', () => {
    it('should return default 18 for unknown tokens', async () => {
      const decimals = await priceFetcher.getTokenDecimals('ethereum', '0x1234');
      expect(decimals).toBe(18);
    });

    it('should fetch decimals from contract', async () => {
      const decimals = await priceFetcher.getTokenDecimals(
        'ethereum',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
      );
      expect(decimals).toBe(18);
    });
  });

  describe('calculatePriceFromReserves', () => {
    it('should calculate correct prices from reserves', () => {
      const reserve0 = BigInt('1000000000000000000'); // 1 ETH
      const reserve1 = BigInt('3500000000000000000000'); // 3500 USDC
      const decimals0 = 18;
      const decimals1 = 6;

      const result = (priceFetcher as any).calculatePriceFromReserves(
        reserve0,
        r gInt(1000),
        18,
        6
      );
      expect(result.price0).toBe(0);
      expect(result.price1).toBe(0);
    });
  });

  describe('getUniswapV2PairAddress', () => {
    it('should return pair address from factory', async () => {
      const address = await priceFetcher.getUniswapV2PairAddress(
        'ethereum',
        '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      );
      expect(address).toBeDefined();
    });
  });

  describe('getUniswapV2PairData', () => {
    it('should return pair data with prices and liquidity', async () => {
      const pairData = await priceFetcher.getUniswapV2PairData(
        'ethereum',
        '0x0000000000000000000000000000000000000001'
      );

      expect(pairData).not.toBeNull();
      expect(pairData?.dex).toBe('Uniswap V2');
      expect(pairData?.price0).toBeGreaterThan(0);
      expect(pairData?.price1).toBeGreaterThan(0);
      expect(pairData?.liquidity).toBeGreaterThan(0);
    });

    it('should return null for zero address', async () => {
      const pairData = await priceFetcher.getUniswapV2PairData(
        'ethereum',
        ethers.ZeroAddress
      );
      expect(pairData).toBeNull();
    });
  });

  describe('getUniswapV3PoolPrice', () => {
    it('should return pool data from V3 pool', async () => {
      const poolData = await priceFetcher.getUniswapV3PoolPrice(
        'ethereum',
        '0x0000000000000000000000000000000000000001'
      );

      expect(poolData).not.toBeNull();
      expect(poolData?.dex).toBe('Uniswap V3');
      expect(poolData?.price0).toBeGreaterThan(0);
    });

    it('should handle null pool address', async () => {
      const poolData = await priceFetcher.getUniswapV3PoolPrice(
        'ethereum',
        ethers.ZeroAddress
      );
      expect(poolData).toBeNull();
    });
  });

  describe('getAllDexPrices', () => {
    it('should return prices from multiple DEXs', async () => {
      const prices = await priceFetcher.getAllDexPrices(
        'ethereum',
        'WETH',
        'USDC'
      );

      expect(Array.isArray(prices)).toBe(true);
    });

    it('should return empty array for invalid token pair', async () => {
      const prices = await priceFetcher.getAllDexPrices(
        'ethereum',
        'INVALID',
        'TOKEN'
      );
      expect(prices).toEqual([]);
    });
  });

  describe('scanArbitrageOpportunities', () => {
    it('should return array of opportunities', async () => {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(
        'ethereum',
        0.1,
        10
      );

      expect(Array.isArray(opportunities)).toBe(true);
    });

    it('should filter by minimum profit percent', async () => {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(
        'ethereum',
        1.0, // 1% minimum
        10
      );

      opportunities.forEach((opp) => {
        expect(opp.spreadPercent).toBeGreaterThanOrEqual(1.0);
      });
    });

    it('should filter by minimum profit USD', async () => {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(
        'ethereum',
        0.1,
        100 // $100 minimum
      );

      opportunities.forEach((opp) => {
        expect(opp.profitUsd).toBeGreaterThanOrEqual(100);
      });
    });

    it('should only return opportunities with positive net profit', async () => {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(
        'ethereum',
        0.1,
        10
      );

      opportunities.forEach((opp) => {
        expect(opp.netProfit).toBeGreaterThan(0);
      });
    });

    it('should sort by net profit descending', async () => {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(
        'ethereum',
        0.1,
        10
      );

      for (let i = 1; i < opportunities.length; i++) {
        expect(opportunities[i - 1].netProfit).toBeGreaterThanOrEqual(
          opportunities[i].netProfit
        );
      }
    });

    it('should limit to top 10 opportunities', async () => {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(
        'ethereum',
        0.01,
        1
      );

      expect(opportunities.length).toBeLessThanOrEqual(10);
    });

    it('should include correct network in opportunities', async () => {
      const networks: Network[] = ['ethereum', 'arbitrum', 'polygon', 'bsc'];

      for (const network of networks) {
        const opportunities = await priceFetcher.scanArbitrageOpportunities(
          network,
          0.1,
          10
        );

        opportunities.forEach((opp) => {
          expect(opp.network).toBe(network);
        });
      }
    });

    it('should calculate confidence score based on spread', async () => {
      const opportunities = await priceFetcher.scanArbitrageOpportunities(
        'ethereum',
        0.1,
        10
      );

      opportunities.forEach((opp) => {
        expect(opp.confidence).toBeGreaterThanOrEqual(50);
        expect(opp.confidence).toBeLessThanOrEqual(95);
      });
    });
  });

  describe('getEthPrice', () => {
    it('should return ETH price in USD', async () => {
      const price = await priceFetcher.getEthPrice('ethereum');
      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });

    it('should cache prices', async () => {
      const price1 = await priceFetcher.getEthPrice('ethereum');
      const price2 = await priceFetcher.getEthPrice('ethereum');
      expect(price1).toBe(price2);
    });
  });

  describe('Caching', () => {
    it('should cache results', async () => {
      // First call
      await priceFetcher.getEthPrice('ethereum');

      // Check cache exists
      const cache = (priceFetcher as any).cache;
      expect(cache.size).toBeGreaterThan(0);
    });

    it('should expire cache after timeout', async () => {
      vi.useFakeTimers();

      await priceFetcher.getEthPrice('ethereum');

      // Fast forward past cache timeout
      vi.advanceTimersByTime(15000);

      // Cache should be cleared
      const cache = (priceFetcher as any).cache;
      expect(cache.size).toBe(0);

      vi.useRealTimers();
    });
  });
});

describe('Arbitrage Opportunity Validation', () => {
  it('should validate arbitrage opportunity structure', () => {
    const opportunity: ArbitrageOpportunity = {
      network: 'ethereum',
      tokenIn: 'WETH',
      tokenOut: 'USDC',
      buyDex: 'Uniswap V2',
      sellDex: 'SushiSwap',
      buyPrice: 3500,
      sellPrice: 3510,
      spreadPercent: 0.2857,
      profitUsd: 28.57,
      gasEstimate: 20,
      netProfit: 8.57,
      liquidity: 1000000,
      confidence: 75,
    };

    expect(opportunity.network).toBe('ethereum');
    expect(opportunity.tokenIn).toBe('WETH');
    expect(opportunity.tokenOut).toBe('USDC');
    expect(opportunity.spreadPercent).toBeGreaterThan(0);
    expect(opportunity.netProfit).toBeGreaterThan(0);
  });

  it('should calculate correct spread', () => {
    const buyPrice = 100;
    const sellPrice = 105;
    const spreadPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

    expect(spreadPercent).toBe(5);
  });

  it('should calculate correct net profit', () => {
    const amount = 10000; // $10k trade
    const spreadPercent = 0.5; // 0.5% spread
    const gasEstimate = 20; // $20 gas

    const profitUsd = amount * (spreadPercent / 100); // $50
    const netProfit = profitUsd - gasEstimate; // $30

    expect(profitUsd).toBe(50);
    expect(netProfit).toBe(30);
  });
});

describe('DEX Price Comparison', () => {
  it('should identify price discrepancies', () => {
    const dexPrices: DexPrice[] = [
      {
        dex: 'Uniswap V2',
        token0: '0xWETH',
        token1: '0xUSDC',
        price0: 3500,
        price1: 0.0002857,
        reserve0: BigInt(1000),
        reserve1: BigInt(3500000),
        liquidity: 1000000,
      },
      {
        dex: 'SushiSwap',
        token0: '0xWETH',
        token1: '0xUSDC',
        price0: 3510,
        price1: 0.0002849,
        reserve0: BigInt(1000),
        reserve1: BigInt(3510000),
        liquidity: 1000000,
      },
    ];

    // Find best buy and sell
    const sortedByPrice0 = [...dexPrices].sort((a, b) => a.price0 - b.price0);
    const bestBuy = sortedByPrice0[0];
    const bestSell = sortedByPrice0[sortedByPrice0.length - 1];

    expect(bestBuy.dex).toBe('Uniswap V2');
    expect(bestSell.dex).toBe('SushiSwap');
    expect(bestBuy.price0).toBeLessThan(bestSell.price0);
  });

  it('should calculate correct spread between DEXs', () => {
    const price1 = 3500;
    const price2 = 3510;
    const spread = Math.abs(price1 - price2) / Math.min(price1, price2);

    expect(spread * 100).toBeCloseTo(0.2857, 4);
  });
});

