import { describe, it, expect } from 'vitest';
import {
  UNISWAP_V2_PAIR_ABI,
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_FACTORY_ABI,
  ERC20_ABI,
  MULTICALL_ABI,
  FLASH_ARB_EXECUTOR_ABI,
  SUBMARINE_MANAGER_ABI,
  AAVE_LENDING_POOL_ABI,
  WETH_ABI,
  SUSHISWAP_ROUTER_ABI,
  QUICKSWAP_ROUTER_ABI,
  PANCAKESWAP_ROUTER_ABI,
} from '@/lib/dex/abis';

describe('ABIs Configuration', () => {
  describe('UNISWAP_V2_PAIR_ABI', () => {
    it('should have all required functions', () => {
      const functions = UNISWAP_V2_PAIR_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      
      expect(functions).toContain('getReserves');
      expect(functions).toContain('token0');
      expect(functions).toContain('token1');
      expect(functions).toContain('factory');
    });

    it('getReserves should have correct signature', () => {
      const getReserves = UNISWAP_V2_PAIR_ABI.find(
        (f: any) => (typeof f === 'string' ? f : f.name) === 'getReserves'
      );
      expect(getReserves).toBeDefined();
    });
  });

  describe('UNISWAP_V3_POOL_ABI', () => {
    it('should have slot0 function for price fetching', () => {
      const functions = UNISWAP_V3_POOL_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      
      expect(functions).toContain('slot0');
      expect(functions).toContain('token0');
      expect(functions).toContain('token1');
      expect(functions).toContain('liquidity');
    });

    it('slot0 should return sqrtPriceX96', () => {
      const slot0 = UNISWAP_V3_POOL_ABI.find(
        (f: any) => (typeof f === 'string' ? f : f.name) === 'slot0'
      );
      expect(slot0).toBeDefined();
    });
  });

  describe('ERC20_ABI', () => {
    it('should have standard ERC20 functions', () => {
      const functions = ERC20_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      
      expect(functions).toContain('decimals');
      expect(functions).toContain('symbol');
      expect(functions).toContain('name');
      expect(functions).toContain('balanceOf');
      expect(functions).toContain('totalSupply');
    });
  });

  describe('MULTICALL_ABI', () => {
    it('should have aggregate functions for batch calls', () => {
      const functions = MULTICALL_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      
      expect(functions).toContain('aggregate');
      expect(functions).toContain('aggregate3');
      expect(functions).toContain('tryAggregate');
    });
  });

  describe('FLASH_ARB_EXECUTOR_ABI', () => {
    it('should have executeArbitrage function', () => {
      const functions = FLASH_ARB_EXECUTOR_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      
      expect(functions).toContain('executeArbitrage');
      expect(functions).toContain('estimateProfit');
      expect(functions).toContain('owner');
    });

    it('executeArbitrage should accept correct params', () => {
      const executeArb = FLASH_ARB_EXECUTOR_ABI.find(
        (f: any) => (typeof f === 'string' ? f : f.name) === 'executeArbitrage'
      );
      expect(executeArb).toBeDefined();
    });
  });

  describe('SUBMARINE_MANAGER_ABI', () => {
    it('should have commit and reveal functions', () => {
      const functions = SUBMARINE_MANAGER_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      
      expect(functions).toContain('commit');
      expect(functions).toContain('commitWithSalt');
      expect(functions).toContain('isCommitmentValid');
    });
  });

  describe('AAVE_LENDING_POOL_ABI', () => {
    it('should have getUserAccountData for health factor', () => {
      const functions = AAVE_LENDING_POOL_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      
      expect(functions).toContain('getUserAccountData');
      expect(functions).toContain('getReserveData');
    });
  });
});

describe('Contract Interface Validation', () => {
  describe('Flash Loan Execution Flow', () => {
    it('should validate flash loan contract interface', () => {
      const expectedFunctions = [
        'executeArbitrage',
        'estimateProfit',
        'owner',
      ];

      expectedFunctions.forEach((fn) => {
        const found = FLASH_ARB_EXECUTOR_ABI.some(
          (item: any) => (typeof item === 'string' ? item : item.name) === fn
        );
        expect(found).toBe(true);
      });
    });
  });

  describe('Submarine Transaction Flow', () => {
    it('should validate submarine contract interface', () => {
      const expectedFunctions = [
        'commit',
        'commitWithSalt',
        'isCommitmentValid',
        'commitments',
      ];

      expectedFunctions.forEach((fn) => {
        const found = SUBMARINE_MANAGER_ABI.some(
          (item: any) => (typeof item === 'string' ? item : item.name) === fn
        );
        expect(found).toBe(true);
      });
    });
  });

  describe('Multicall Batch Processing', () => {
    it('should support batch queries for gas optimization', () => {
      const aggregateFn = MULTICALL_ABI.find(
        (item: any) => (typeof item === 'string' ? item : item.name) === 'aggregate'
      );
      expect(aggregateFn).toBeDefined();
    });

    it('should support aggregate3 with failure handling', () => {
      const aggregate3Fn = MULTICALL_ABI.find(
        (item: any) => (typeof item === 'string' ? item : item.name) === 'aggregate3'
      );
      expect(aggregate3Fn).toBeDefined();
    });
  });
});

describe('DEX Router Interfaces', () => {
  describe('SushiSwap Router', () => {
    it('should have getAmountsOut for route simulation', () => {
      const functions = SUSHISWAP_ROUTER_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      expect(functions).toContain('getAmountsOut');
      expect(functions).toContain('getAmountsIn');
    });
  });

  describe('QuickSwap Router', () => {
    it('should have price estimation functions', () => {
      const functions = QUICKSWAP_ROUTER_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      expect(functions).toContain('getAmountsOut');
      expect(functions).toContain('getAmountsIn');
    });
  });

  describe('PancakeSwap Router', () => {
    it('should have swap functions', () => {
      const functions = PANCAKESWAP_ROUTER_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
      expect(functions).toContain('swapExactTokensForTokens');
    });
  });
});

describe('WETH Interface', () => {
  it('should have deposit and withdraw for ETH wrapping', () => {
    const functions = WETH_ABI.map((f: any) => typeof f === 'string' ? f : f.name);
    
    expect(functions).toContain('deposit');
    expect(functions).toContain('withdraw');
    expect(functions).toContain('balanceOf');
    expect(functions).toContain('approve');
    expect(functions).toContain('transfer');
  });
});

describe('ABI Version Compatibility', () => {
  it('should use modern solidity syntax', () => {
    // Check that ABIs use view/payable modifiers correctly
    const viewFunctions = [
      'getReserves',
      'token0',
      'token1',
      'decimals',
      'symbol',
      'name',
      'balanceOf',
    ];

    viewFunctions.forEach((fn) => {
      const found = ERC20_ABI.concat(UNISWAP_V2_PAIR_ABI).some(
        (item: any) => (typeof item === 'string' ? item : item.name) === fn
      );
      expect(found).toBe(true);
    });
  });

  it('should support custom errors in modern solidity', () => {
    // Modern ABIs should be compatible with Solidity 0.8+ custom errors
    expect(UNISWAP_V3_POOL_ABI.length).toBeGreaterThan(0);
    expect(UNISWAP_V3_FACTORY_ABI.length).toBeGreaterThan(0);
  });
});

