// Canonical FlashArbExecutor gasless execution helpers.
//
// Architecture (see MAINNET_FIXES.md):
// - Funding = Aave V3 flash loan only. No user trade capital.
// - Gasless = an owner-authorised SERVICE relayer wallet calls
//   FlashArbExecutor.executeFlashLoanGasless(asset, amount, params, profitRecipient)
//   where profitRecipient MUST equal the recipient encoded inside params and
//   MUST be the connected user's wallet. The service wallet pays gas; it never
//   receives trade profit and must never be a user private key.
// - GaslessRelayer.sol is a meta-tx helper, NOT an ERC-4337 paymaster.
//   Do NOT route this executor through Balancer Vault, a DEX router, or an
//   ERC-4337 bundler/paymaster. Those were legacy placeholders.
//
// No ethers dependency: selectors/calldata in production should be produced
// with the compiled ABI (ethers Interface.encodeFunctionData). The encoders
// below follow standard ABI head/tail encoding and are covered by the spec in
// supabase/functions/execute-flash-loan/GASLESS_MAINNET.md. Verify the
// function selector against the compiled artifact before any mainnet call:
//   cast sig "executeFlashLoanGasless(address,uint256,bytes,address)"

export const SUPPORTED_EXECUTOR_NETWORKS = [
  'ethereum',
  'arbitrum',
  'polygon',
  'base',
  'optimism',
] as const;

export type ExecutorNetwork = (typeof SUPPORTED_EXECUTOR_NETWORKS)[number];

export function isSupportedExecutorNetwork(network: string): network is ExecutorNetwork {
  return (SUPPORTED_EXECUTOR_NETWORKS as readonly string[]).includes(network);
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export function assertAddress(value: string, label: string): string {
  if (!ADDRESS_RE.test(value || '')) throw new Error(`Invalid ${label}: ${value}`);
  return `0x${value.slice(2).toLowerCase()}`;
}

/** FlashArbExecutor address for a network, from Supabase secrets only. */
export function getFlashArbExecutorAddress(network: string): string {
  if (!isSupportedExecutorNetwork(network)) {
    throw new Error(`FlashArbExecutor not supported on ${network} (no Aave V3 provider in config)`);
  }
  const key = `FLASH_ARB_EXECUTOR_${network.toUpperCase()}`;
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is not configured in Supabase secrets`);
  return assertAddress(value, key);
}

function wordAddress(address: string, label = 'address'): string {
  return assertAddress(address, label).slice(2).padStart(64, '0');
}

function wordUint(value: bigint | number, label: string): string {
  const v = BigInt(value);
  if (v < 0n) throw new Error(`${label} must be non-negative`);
  const hex = v.toString(16);
  if (hex.length > 64) throw new Error(`${label} overflows uint256`);
  return hex.padStart(64, '0');
}

export interface CanonicalArbParams {
  tokenOut: string;
  sourceRouter: string;
  targetRouter: string;
  sourceKind: 1 | 2;
  targetKind: 1 | 2;
  sourceFee?: number;
  targetFee?: number;
  minIntermediate: bigint | string | number;
  profitRecipient: string;
}

/**
 * Canonical params (single encoding, structured swaps built on-chain):
 * abi.encode(tokenOut, sourceRouter, targetRouter, sourceKind, targetKind,
 *            sourceFee, targetFee, minIntermediate, profitRecipient)
 * kind: 1 = V3 exactInputSingle, 2 = V2 swapExactTokensForTokens.
 */
export function encodeCanonicalArbParams(params: CanonicalArbParams): string {
  if (params.sourceKind !== 1 && params.sourceKind !== 2) throw new Error('sourceKind must be 1 or 2');
  if (params.targetKind !== 1 && params.targetKind !== 2) throw new Error('targetKind must be 1 or 2');
  return '0x' + [
    wordAddress(params.tokenOut, 'tokenOut'),
    wordAddress(params.sourceRouter, 'sourceRouter'),
    wordAddress(params.targetRouter, 'targetRouter'),
    wordUint(params.sourceKind, 'sourceKind'),
    wordUint(params.targetKind, 'targetKind'),
    wordUint(params.sourceFee ?? 0, 'sourceFee'),
    wordUint(params.targetFee ?? 0, 'targetFee'),
    wordUint(BigInt(params.minIntermediate), 'minIntermediate'),
    wordAddress(params.profitRecipient, 'profitRecipient'),
  ].join('');
}

function encodeDynamicBytesTail(dataHex: string): string {
  const data = dataHex.startsWith('0x') ? dataHex.slice(2) : dataHex;
  if (!/^[a-fA-F0-9]*$/.test(data) || data.length % 2 !== 0) throw new Error('Invalid params bytes');
  const byteLen = data.length / 2;
  const padded = data.padEnd(Math.ceil(Math.max(byteLen, 1) / 32) * 64, '0');
  return wordUint(byteLen, 'bytesLength') + padded;
}

export const EXECUTE_FLASH_LOAN_GASLESS_SIGNATURE =
  'executeFlashLoanGasless(address,uint256,bytes,address)';

/**
 * Build executeFlashLoanGasless calldata.
 * `selector` MUST come from the compiled FlashArbExecutor ABI
 * (e.g. ethers: new Interface(abi).encodeFunctionData(...), or cast sig).
 * Head: asset, amount, bytes offset (0x80), profitRecipient. Tail: len+data.
 */
export function buildExecuteFlashLoanGaslessCalldata(args: {
  selector: string;
  asset: string;
  amount: bigint | string | number;
  params: string;
  profitRecipient: string;
}): string {
  if (!/^0x[a-fA-F0-9]{8}$/.test(args.selector)) {
    throw new Error('selector must be 0x + 4 bytes from the compiled ABI');
  }
  const tail = encodeDynamicBytesTail(args.params);
  const head = [
    wordAddress(args.asset, 'asset'),
    wordUint(BigInt(args.amount), 'amount'),
    wordUint(128, 'bytesOffset'),
    wordAddress(args.profitRecipient, 'profitRecipient'),
  ].join('');
  return args.selector + head + tail;
}
