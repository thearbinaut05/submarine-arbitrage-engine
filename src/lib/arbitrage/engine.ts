import { ethers } from 'ethers';
import type { ArbitrageOpportunity, Network } from '@/types/defi';

export interface RiskConfig {
  maxLoanUsd: number;
  maxGasGwei: number;
  maxSlippageBps: number;
  minNetProfitUsd: number;
  mevCostUsd: number;
  maxQuoteAgeMs: number;
  dailyFailureBudget: number;
  circuitBreakerEnabled: boolean;
  networks: Network[];
  allowedTokens: string[];
  scanIntervalMs: number;
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxLoanUsd: 100,
  maxGasGwei: 100,
  maxSlippageBps: 50,
  minNetProfitUsd: 3,
  mevCostUsd: 0,
  maxQuoteAgeMs: 30_000,
  dailyFailureBudget: 3,
  circuitBreakerEnabled: true,
  networks: ['ethereum', 'arbitrum', 'polygon', 'bsc', 'optimism', 'base', 'avalanche'],
  allowedTokens: ['WETH', 'WPOL', 'WBNB', 'WAVAX', 'USDC', 'USDT', 'DAI', 'WBTC', 'BTCB', 'cbETH'],
  scanIntervalMs: 30_000,
};

export interface RouteQuoteEvidence {
  quoteId: string;
  source: string;
  router: string;
  pool: string | null;
  blockNumber: number;
  blockTimestamp: number;
  quotedAt: number;
  expiresAt: number;
  amountIn: string;
  expectedOut: string;
  unitOut: string;
  priceImpactBps: number;
  liquidityRaw: string;
  liquiditySymbol: string;
  dexFeeBps: number;
}

export interface PaperEvidence {
  mode: 'paper';
  chainId: number;
  blockNumber: number;
  blockTimestamp: number;
  expiresAt: number;
  tokenInAddress: string;
  tokenOutAddress: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
  amountInBase: string;
  expectedIntermediateBase: string;
  expectedOutputBase: string;
  minimumOutputBase: string;
  repaymentBase: string;
  providerFeeBase: string;
  providerFeeBps: number;
  provider: string;
  providerAddress: string | null;
  dexFeesBase: string;
  gasUnits: number;
  gasPriceWei: string;
  gasNative: string;
  gasUsd: number;
  slippageBps: number;
  priceImpactBps: number;
  mevCostUsd: number;
  liquidityRaw: string;
  tokenInUsdQuote: string;
  nativeUsdQuote: string;
  quotes: [RouteQuoteEvidence, RouteQuoteEvidence];
  simulation: 'route_quote_only' | 'preflight_rejected';
  rejectionReasons: string[];
}

export interface PaperOpportunity extends ArbitrageOpportunity {
  evidence: PaperEvidence;
}

export interface NetProfitInput {
  principal: bigint;
  quotedOutput: bigint;
  providerFeeBps: bigint;
  maxSlippageBps: number;
  gasInPrincipalToken: bigint;
  mevInPrincipalToken: bigint;
}

export interface NetProfitResult {
  providerFee: bigint;
  repayment: bigint;
  minimumOutput: bigint;
  netAfterCosts: bigint;
}

export function ceilBps(amount: bigint, bps: bigint): bigint {
  if (amount < 0n || bps < 0n) throw new Error('Amounts and fees must not be negative');
  return (amount * bps + 9_999n) / 10_000n;
}

export function floorBps(amount: bigint, bps: number): bigint {
  if (amount < 0n || !Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new Error('Invalid slippage basis points');
  }
  return (amount * BigInt(10_000 - bps)) / 10_000n;
}

export function calculateNetProfit(input: NetProfitInput): NetProfitResult {
  if (input.principal <= 0n || input.quotedOutput < 0n || input.gasInPrincipalToken < 0n || input.mevInPrincipalToken < 0n) {
    throw new Error('Invalid net-profit inputs');
  }
  const providerFee = ceilBps(input.principal, input.providerFeeBps);
  const repayment = input.principal + providerFee;
  const minimumOutput = floorBps(input.quotedOutput, input.maxSlippageBps);
  return {
    providerFee,
    repayment,
    minimumOutput,
    netAfterCosts: minimumOutput - repayment - input.gasInPrincipalToken - input.mevInPrincipalToken,
  };
}

export function priceImpactBps(unitOut: bigint, amountIn: bigint, unitIn: bigint, actualOut: bigint): number {
  if (unitOut <= 0n || amountIn <= 0n || unitIn <= 0n || actualOut < 0n) return 10_000;
  const noImpactOut = (unitOut * amountIn) / unitIn;
  if (noImpactOut <= 0n || actualOut >= noImpactOut) return 0;
  return Number(((noImpactOut - actualOut) * 10_000n) / noImpactOut);
}

export function quoteStaleness(quotedAt: number, now: number, maxQuoteAgeMs: number): string | null {
  if (!Number.isFinite(quotedAt) || quotedAt <= 0) return 'Quote time is missing.';
  if (quotedAt > now + 5_000) return 'Quote timestamp is in the future.';
  if (now - quotedAt > maxQuoteAgeMs) return 'Quote expired. Refresh both routes before using it.';
  return null;
}

export function decimalConversion(amount: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Unsupported token decimals');
  return ethers.parseUnits(amount, decimals);
}

export function baseToDisplay(value: bigint, decimals: number): number {
  const converted = Number(ethers.formatUnits(value, decimals));
  return Number.isFinite(converted) ? converted : 0;
}

export function usdBaseToPrincipalToken(
  usdBase: bigint,
  tokenUnit: bigint,
  usdPerTokenUnit: bigint,
): bigint {
  if (usdBase < 0n || tokenUnit <= 0n || usdPerTokenUnit <= 0n) throw new Error('A fresh USD quote is required');
  return (usdBase * tokenUnit) / usdPerTokenUnit;
}

export function evaluateRepaymentInvariant(
  preLoanBalance: bigint,
  result: NetProfitResult,
  configuredMinimumNet: bigint,
): string | null {
  if (configuredMinimumNet < 0n) return 'Minimum net profit cannot be negative.';
  const postRepaymentBalance = preLoanBalance + result.netAfterCosts;
  if (postRepaymentBalance <= preLoanBalance) return 'Repayment leaves no positive return.';
  if (postRepaymentBalance <= preLoanBalance + configuredMinimumNet) {
    return 'Net return does not strictly exceed the configured minimum.';
  }
  return null;
}

export type TransactionEvidenceState = 'prepared' | 'submitted' | 'confirmed' | 'reverted';

export interface ReceiptFixture {
  hash: string;
  status: 0 | 1;
  blockNumber: number | null;
  confirmations: number;
  realizedNetProfitBase?: string;
  reorged?: boolean;
}

export interface TransactionEvidence {
  state: TransactionEvidenceState;
  hash: string | null;
  blockNumber: number | null;
  realizedNetProfitBase: string | null;
}

export function reconcileTransaction(
  receipt: ReceiptFixture,
  requiredConfirmations = 2,
): TransactionEvidence {
  if (receipt.reorged) {
    return { state: 'submitted', hash: receipt.hash, blockNumber: null, realizedNetProfitBase: null };
  }
  if (receipt.status === 0) {
    return { state: 'reverted', hash: receipt.hash, blockNumber: receipt.blockNumber, realizedNetProfitBase: null };
  }
  if (receipt.blockNumber !== null && receipt.confirmations >= requiredConfirmations) {
    return {
      state: 'confirmed',
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      realizedNetProfitBase: receipt.realizedNetProfitBase ?? null,
    };
  }
  return { state: 'submitted', hash: receipt.hash, blockNumber: receipt.blockNumber, realizedNetProfitBase: null };
}

export function summarizeLifecycle(
  opportunities: PaperOpportunity[],
  transactions: TransactionEvidence[],
) {
  return {
    liveMarketData: opportunities.reduce((sum, opportunity) => sum + opportunity.evidence.quotes.length, 0),
    simulated: opportunities.length,
    prepared: transactions.filter((tx) => tx.state === 'prepared').length,
    submitted: transactions.filter((tx) => tx.state === 'submitted').length,
    confirmed: transactions.filter((tx) => tx.state === 'confirmed').length,
    reverted: transactions.filter((tx) => tx.state === 'reverted').length,
    realizedNetProfitBase: transactions.reduce(
      (sum, tx) => sum + (tx.state === 'confirmed' && tx.realizedNetProfitBase ? BigInt(tx.realizedNetProfitBase) : 0n),
      0n,
    ),
  };
}
