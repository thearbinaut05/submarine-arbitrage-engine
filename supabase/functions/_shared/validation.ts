import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

export const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address');
export const hexData = z.string().regex(/^0x[a-fA-F0-9]*$/, 'Invalid hex data');
export const numericString = z.string().regex(/^\d+$/, 'Must be a numeric string');
export const networkEnum = z.enum(['ethereum', 'arbitrum', 'polygon', 'bsc', 'optimism', 'base', 'avalanche']);
export const tokenRef = z.string().trim().min(2).max(32).regex(/^(0x[a-fA-F0-9]{40}|[A-Za-z0-9_.-]+)$/, 'Invalid token');
export const opportunityRef = z.string().trim().min(1).max(160);

export const FlashLoanSchema = z.object({
  network: networkEnum,
  tokenIn: tokenRef,
  tokenOut: tokenRef,
  tokenInAddress: ethAddress.optional(),
  tokenOutAddress: ethAddress.optional(),
  amountIn: z.union([numericString, z.number().positive()]).transform((v) => String(v)),
  sourceDex: z.string().min(1).max(100),
  targetDex: z.string().min(1).max(100),
  slippageTolerance: z.number().min(0).max(50).optional(),
  walletAddress: ethAddress.optional(),
  useGelato: z.boolean().optional(),
  opportunityId: opportunityRef.optional(),
  prepareOnly: z.boolean().optional(),
  enforceConnectedWallet: z.boolean().optional(),
  enforceGasless: z.boolean().optional(),
}).passthrough();


export const GaslessRelaySchema = z.object({
  network: networkEnum,
  to: ethAddress,
  data: hexData,
  value: z.union([numericString, z.number().nonnegative()]).optional().transform((v) => v === undefined ? '0' : String(v)),
  deadline: z.number().int().positive(),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature').optional(),
  walletAddress: ethAddress,
  walletType: z.enum(['metamask', 'bitget', 'injected', 'embedded']).optional(),
  isSubmarine: z.boolean().optional(),
  opportunityId: opportunityRef.optional(),
}).passthrough();

export const RebalanceSchema = z.object({
  network: networkEnum,
  positions: z.array(z.object({
    protocol: z.string().min(1).max(50),
    action: z.enum(['deposit', 'withdraw', 'borrow', 'repay']),
    asset: ethAddress,
    amount: z.union([numericString, z.number().positive()]).transform((v) => String(v)),
  })).min(1).max(10),
  targetHealthFactor: z.number().min(1.01).max(10.0).optional(),
  walletAddress: ethAddress.optional(),
  useFlashLoan: z.boolean().optional(),
  useGelato: z.boolean().optional(),
}).passthrough();

export const ScanSchema = z.object({
  networks: z.array(networkEnum).max(20).optional(),
  minProfitPercent: z.number().min(0).max(100).optional(),
  minProfitUsd: z.number().min(0).optional(),
}).passthrough();

export function validateOrError<T>(schema: z.ZodType<T>, body: unknown, corsHeaders: Record<string, string>) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false as const,
      response: new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request parameters',
          code: 'VALIDATION_ERROR',
          details: result.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { ok: true as const, data: result.data };
}

export function sanitizeError(error: unknown, context: string): { message: string; code: string; requestId: string } {
  const requestId = crypto.randomUUID();
  console.error(`[${context}] [${requestId}] Full error:`, error);
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('private_key') || lower.includes('_key') || lower.includes('not configured')) {
    return { message: 'Service configuration error. Please contact support.', code: 'CONFIG_ERROR', requestId };
  }
  if (lower.includes('gelato') || lower.includes('relay')) {
    return { message: 'Transaction relay service temporarily unavailable.', code: 'RELAY_ERROR', requestId };
  }
  if (lower.includes('balance') || lower.includes('insufficient')) {
    return { message: 'Insufficient funds for this operation.', code: 'INSUFFICIENT_FUNDS', requestId };
  }
  if (lower.includes('invalid') || lower.includes('validation')) {
    return { message: 'Invalid request parameters.', code: 'VALIDATION_ERROR', requestId };
  }
  if (lower.includes('unauth') || lower.includes('forbidden')) {
    return { message: 'Unauthorized.', code: 'UNAUTHORIZED', requestId };
  }
  return { message: 'An unexpected error occurred. Please try again.', code: 'UNKNOWN_ERROR', requestId };
}
