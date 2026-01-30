import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn (classnames)', () => {
    it('should combine classnames correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar');
    });

    it('should handle empty inputs', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle mixed inputs', () => {
      expect(cn('base', ['conditional', 'classes'])).toBe('base conditional classes');
    });

    it('should handle tailwind merge conflicts', () => {
      // twMerge should handle conflicting tailwind classes
      expect(cn('p-2 p-4')).toBe('p-4');
      expect(cn('bg-red-500 bg-blue-500')).toBe('bg-blue-500');
    });
  });
});

describe('Formatting Utilities', () => {
  describe('ETH Formatting', () => {
    const formatEth = (wei: string | bigint): string => {
      const value = typeof wei === 'string' ? BigInt(wei) : wei;
      const eth = Number(value) / 1e18;
      return eth.toFixed(4);
    };

    it('should format wei to ETH correctly', () => {
      expect(formatEth('1000000000000000000')).toBe('1.0000');
      expect(formatEth('500000000000000000')).toBe('0.5000');
      expect(formatEth('10000000000000000')).toBe('0.0100');
    });

    it('should handle small amounts', () => {
      expect(formatEth('1000000000000000')).toBe('0.0010');
      expect(formatEth('100000000000000')).toBe('0.0001');
    });

    it('should handle bigint input', () => {
      expect(formatEth(BigInt('1000000000000000000'))).toBe('1.0000');
    });
  });

  describe('USD Formatting', () => {
    const formatUsd = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    it('should format USD amounts correctly', () => {
      expect(formatUsd(100)).toBe('$100.00');
      expect(formatUsd(99.99)).toBe('$99.99');
      expect(formatUsd(0)).toBe('$0.00');
    });

    it('should format large amounts', () => {
      expect(formatUsd(1000000)).toBe('$1,000,000.00');
    });
  });

  describe('Percentage Formatting', () => {
    const formatPercent = (value: number, decimals: number = 2): string => {
      return `${value.toFixed(decimals)}%`;
    };

    it('should format percentages correctly', () => {
      expect(formatPercent(0.5)).toBe('0.50%');
      expect(formatPercent(1.2345)).toBe('1.23%');
      expect(formatPercent(100)).toBe('100.00%');
    });

    it('should handle custom decimal places', () => {
      expect(formatPercent(0.5, 4)).toBe('0.5000%');
    });
  });
});

describe('Math Utilities', () => {
  describe('Slippage Calculation', () => {
    const calculateSlippage = (
      expectedPrice: number,
      actualPrice: number
    ): number => {
      return ((actualPrice - expectedPrice) / expectedPrice) * 100;
    };

    it('should calculate slippage correctly', () => {
      expect(calculateSlippage(100, 99)).toBe(-1);
      expect(calculateSlippage(100, 101)).toBe(1);
      expect(calculateSlippage(100, 100)).toBe(0);
    });
  });

  describe('Profit Calculation', () => {
    const calculateProfit = (
      buyPrice: number,
      sellPrice: number,
      amount: number
    ): { profit: number; profitPercent: number } => {
      const profit = (sellPrice - buyPrice) * amount;
      const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
      return { profit, profitPercent };
    };

    it('should calculate profit correctly', () => {
      const result = calculateProfit(100, 105, 1000);
      expect(result.profit).toBe(5000);
      expect(result.profitPercent).toBe(5);
    });

    it('should handle loss correctly', () => {
      const result = calculateProfit(100, 95, 1000);
      expect(result.profit).toBe(-5000);
      expect(result.profitPercent).toBe(-5);
    });
  });

  describe('Gas Cost Estimation', () => {
    const estimateGasCost = (
      gasUsed: bigint,
      gasPriceGwei: number,
      ethPriceUsd: number
    ): number => {
      const gasUsedEth = Number(gasUsed) * gasPriceGwei / 1e9;
      return gasUsedEth * ethPriceUsd;
    };

    it('should estimate gas cost correctly', () => {
      const cost = estimateGasCost(BigInt(100000), 50, 3500);
      expect(cost).toBeCloseTo(17.5, 1);
    });
  });
});

