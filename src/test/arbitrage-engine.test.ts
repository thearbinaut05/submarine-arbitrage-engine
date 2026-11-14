import { describe, expect, it } from 'vitest';
import {
  calculateNetProfit,
  decimalConversion,
  evaluateRepaymentInvariant,
  floorBps,
  priceImpactBps,
  quoteStaleness,
  reconcileTransaction,
  summarizeLifecycle,
  usdBaseToPrincipalToken,
} from '@/lib/arbitrage/engine';

describe('exact net-profit engine', () => {
  it('deducts provider fee, slippage, gas, and MEV from quoted output', () => {
    const result = calculateNetProfit({ principal: 100_000000n, quotedOutput: 101_000000n, providerFeeBps: 5n, maxSlippageBps: 50, gasInPrincipalToken: 100000n, mevInPrincipalToken: 50000n });
    expect(result.providerFee).toBe(50000n);
    expect(result.repayment).toBe(100_050000n);
    expect(result.minimumOutput).toBe(100_495000n);
    expect(result.netAfterCosts).toBe(295000n);
  });

  it('rounds provider fees up and slippage bounds down', () => {
    expect(calculateNetProfit({ principal: 1n, quotedOutput: 101n, providerFeeBps: 5n, maxSlippageBps: 50, gasInPrincipalToken: 0n, mevInPrincipalToken: 0n }).providerFee).toBe(1n);
    expect(floorBps(101n, 50)).toBe(100n);
  });

  it.each([6, 8, 18])('parses exact base units for %i decimals', (decimals) => {
    expect(decimalConversion('1.234567', decimals)).toBe(BigInt(`1234567${'0'.repeat(Math.max(0, decimals - 6))}`));
  });

  it('sizes from fresh quote ratios without floating point prices', () => {
    expect(usdBaseToPrincipalToken(100_000000n, 10n ** 8n, 100000_000000n)).toBe(10000000n);
  });

  it('rejects stale and future quotes', () => {
    expect(quoteStaleness(900, 1000, 50)).toMatch('expired');
    expect(quoteStaleness(2000, 1000, 50)).toMatch('future');
  });

  it('rejects negative net profit and enforces strict minimum', () => {
    const loss = calculateNetProfit({ principal: 100n, quotedOutput: 99n, providerFeeBps: 0n, maxSlippageBps: 0, gasInPrincipalToken: 0n, mevInPrincipalToken: 0n });
    expect(loss.netAfterCosts).toBe(-1n);
    expect(evaluateRepaymentInvariant(0n, loss, 0n)).toMatch('no positive');
    const exact = calculateNetProfit({ principal: 100n, quotedOutput: 110n, providerFeeBps: 0n, maxSlippageBps: 0, gasInPrincipalToken: 0n, mevInPrincipalToken: 0n });
    expect(evaluateRepaymentInvariant(0n, exact, 10n)).toMatch('strictly exceed');
  });

  it('detects price impact after route size changes', () => {
    expect(priceImpactBps(1000n, 100n, 1n, 90_000n)).toBe(1000);
  });

  it('repayment failure cannot be counted as realized profit', () => {
    const reverted = reconcileTransaction({ hash: '0xabc', status: 0, blockNumber: 20, confirmations: 5, realizedNetProfitBase: '999' });
    expect(reverted.state).toBe('reverted');
    expect(reverted.realizedNetProfitBase).toBeNull();
  });

  it('keeps pending, reorged, and confirmed states separate', () => {
    expect(reconcileTransaction({ hash: '0xabc', status: 1, blockNumber: 20, confirmations: 1 }, 2).state).toBe('submitted');
    expect(reconcileTransaction({ hash: '0xabc', status: 1, blockNumber: 20, confirmations: 9, reorged: true }, 2).state).toBe('submitted');
    expect(reconcileTransaction({ hash: '0xabc', status: 1, blockNumber: 20, confirmations: 2, realizedNetProfitBase: '12' }, 2).realizedNetProfitBase).toBe('12');
  });

  it('sums only confirmed realized net proceeds', () => {
    const summary = summarizeLifecycle([], [
      { state: 'confirmed', hash: '0x1', blockNumber: 1, realizedNetProfitBase: '12' },
      { state: 'submitted', hash: '0x2', blockNumber: null, realizedNetProfitBase: '500' },
      { state: 'reverted', hash: '0x3', blockNumber: 2, realizedNetProfitBase: '900' },
    ]);
    expect(summary.realizedNetProfitBase).toBe(12n);
  });
});
