import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { CHAIN_IDS, TOKEN_ADDRESSES, GAS_LIMITS, RPC_ENDPOINTS, EXPLORER_URLS } from "../_shared/mainnet-config.ts";
import { FlashLoanSchema, validateOrError, sanitizeError } from "../_shared/validation.ts";

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const NETWORKS: Record<string, { chainId: number; executorEnv: string }> = {
  ethereum: { chainId: 1, executorEnv: 'FLASH_ARB_EXECUTOR_ETHEREUM' },
  arbitrum: { chainId: 42161, executorEnv: 'FLASH_ARB_EXECUTOR_ARBITRUM' },
  polygon: { chainId: 137, executorEnv: 'FLASH_ARB_EXECUTOR_POLYGON' },
  base: { chainId: 8453, executorEnv: 'FLASH_ARB_EXECUTOR_BASE' },
};
const ROUTERS: Record<string, Record<string, { address: string; kind: number; fee?: number }>> = {
  ethereum: { uniswap_v3: { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', kind: 1, fee: 3000 }, sushiswap: { address: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', kind: 2 } },
  arbitrum: { uniswap_v3: { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', kind: 1, fee: 3000 }, sushiswap: { address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', kind: 2 }, camelot: { address: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d', kind: 2 } },
  polygon: { uniswap_v3: { address: '0xE592427A0AEce92De3Edee1F18E0157C05861564', kind: 1, fee: 3000 }, sushiswap: { address: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', kind: 2 }, quickswap: { address: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', kind: 2 } },
  base: { uniswap_v3: { address: '0x2626664c2603336E57B271c5C0b26F421741e481', kind: 1, fee: 3000 } },
};
const SELECTOR = '0x0a515a7d'; // executeFlashLoanGasless(address,uint256,bytes,address)

function isAddr(v: unknown): v is string { return typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v); }
function norm(a: string) { return `0x${a.slice(2).toLowerCase()}`; }
function word(v: string | number | bigint): string { if (typeof v === 'string' && isAddr(v)) return v.slice(2).toLowerCase().padStart(64, '0'); return BigInt(v).toString(16).padStart(64, '0'); }
function resolveRouter(network: string, dex: string) { const table = ROUTERS[network]; if (!table) return null; const key = String(dex || '').toLowerCase().replace(/[\s-]/g, '_'); if (table[key]) return table[key]; if (key.includes('uniswap') || key.includes('v3')) return table.uniswap_v3 ?? null; if (key.includes('sushi')) return table.sushiswap ?? null; if (key.includes('quick')) return table.quickswap ?? null; if (key.includes('camelot')) return table.camelot ?? null; return Object.values(table)[0] ?? null; }
function resolveToken(network: string, ref: string, explicit?: string) { const tokens = (TOKEN_ADDRESSES as any)[network] || {}; if (tokens[ref]) return { symbol: tokens[ref].symbol || ref, address: tokens[ref].address, decimals: tokens[ref].decimals }; const candidate = explicit || ref; if (isAddr(candidate)) { const n = norm(candidate); for (const [sym, t] of Object.entries<any>(tokens)) if (norm(t.address) === n) return { symbol: t.symbol || sym, address: t.address, decimals: t.decimals }; } return null; }
async function rpc(url: string, method: string, params: unknown[]) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }); const j = await r.json(); if (j.error) throw new Error(j.error.message || JSON.stringify(j.error)); return j.result as string; }
async function signAndSend(network: string, chainId: number, to: string, data: string): Promise<string> {
  const key = Deno.env.get('DEPLOYER_PRIVATE_KEY'); if (!key) throw new Error('DEPLOYER_PRIVATE_KEY is not configured');
  const { keccak_256 } = await import('https://esm.sh/@noble/hashes@1.4.0/sha3'); const { hmac } = await import('https://esm.sh/@noble/hashes@1.4.0/hmac'); const { sha256 } = await import('https://esm.sh/@noble/hashes@1.4.0/sha256'); const secp = await import('https://esm.sh/@noble/secp256k1@2.1.0');
  (secp as any).etc.hmacSha256Sync = (k: Uint8Array, ...m: Uint8Array[]) => { const h = hmac.create(sha256, k); m.forEach((x) => h.update(x)); return h.digest(); };
  const hexToBytes = (hex: string) => { const b = new Uint8Array(hex.length / 2); for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.substr(i, 2), 16); return b; };
  const bytesToHex = (b: Uint8Array) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
  const keyHex = key.startsWith('0x') ? key.slice(2) : key; const pub = secp.getPublicKey(hexToBytes(keyHex), false); const from = `0x${bytesToHex(keccak_256(pub.slice(1)).slice(-20))}`;
  const rpcs = (RPC_ENDPOINTS as any)[network] as string[]; if (!rpcs?.length) throw new Error(`No RPC for ${network}`);
  const sendRpc = network === 'ethereum' ? 'https://rpc.flashbots.net' : rpcs[0];
  const nonce = parseInt(await rpc(rpcs[0], 'eth_getTransactionCount', [from, 'pending']), 16); const gasPrice = BigInt(await rpc(rpcs[0], 'eth_gasPrice', [])) * 110n / 100n;
  const gasLimit = 2_000_000n; const dataBytes = hexToBytes(data.startsWith('0x') ? data.slice(2) : data); const toBytes = hexToBytes(to.slice(2));
  const num = (n: bigint | number) => { const v = BigInt(n); if (v === 0n) return new Uint8Array(0); const h = v.toString(16); return hexToBytes(h.length % 2 ? `0${h}` : h); };
  const encItem = (item: Uint8Array) => { if (item.length === 1 && item[0] < 0x80) return item; if (item.length <= 55) return new Uint8Array([0x80 + item.length, ...item]); const lb = num(BigInt(item.length)); return new Uint8Array([0xb7 + lb.length, ...lb, ...item]); };
  const encList = (items: Uint8Array[]) => { const enc = items.map(encItem); const total = enc.reduce((s, e) => s + e.length, 0); let prefix: Uint8Array; if (total <= 55) prefix = new Uint8Array([0xc0 + total]); else { const lb = num(BigInt(total)); prefix = new Uint8Array([0xf7 + lb.length, ...lb]); } const out = new Uint8Array(prefix.length + total); out.set(prefix); let o = prefix.length; enc.forEach((e) => { out.set(e, o); o += e.length; }); return out; };
  const unsigned = encList([num(nonce), num(gasPrice), num(gasLimit), toBytes, num(0n), dataBytes, num(chainId), new Uint8Array(0), new Uint8Array(0)]);
  const hash = keccak_256(unsigned); const sig: any = secp.sign(hash, hexToBytes(keyHex)); const v = BigInt(sig.recovery + chainId * 2 + 35);
  const signed = encList([num(nonce), num(gasPrice), num(gasLimit), toBytes, num(0n), dataBytes, num(v), num(sig.r), num(sig.s)]);
  return await rpc(sendRpc, 'eth_sendRawTransaction', [`0x${bytesToHex(signed)}`]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const start = Date.now(); const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let userId: string | null = null; const auth = req.headers.get('Authorization'); if (auth) { const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', '')); userId = user?.id ?? null; }
    const raw = await req.json(); const validation = validateOrError(FlashLoanSchema, raw, corsHeaders); if (!validation.ok) return validation.response;
    const body: any = { ...raw, ...validation.data }; const network = String(body.network); const cfg = NETWORKS[network]; if (!cfg) return json({ success: false, error: `Network '${network}' is not supported for Aave V3 gasless execution`, code: 'UNSUPPORTED_NETWORK' }, 400);
    const chainId = (CHAIN_IDS as any)[network] ?? cfg.chainId; const executor = Deno.env.get(cfg.executorEnv); if (!isAddr(executor)) return json({ success: false, error: `${cfg.executorEnv} is not configured`, code: 'EXECUTOR_NOT_CONFIGURED' }, 503);
    if (!isAddr(body.walletAddress)) return json({ success: false, error: 'A valid connected wallet address is required as profit recipient', code: 'INVALID_CONNECTED_WALLET' }, 400);
    const profitRecipient = norm(isAddr(body.profitRecipient) ? body.profitRecipient : body.walletAddress);
    const tokenIn = resolveToken(network, body.tokenIn, body.tokenInAddress); const tokenOut = resolveToken(network, body.tokenOut, body.tokenOutAddress); if (!tokenIn || !tokenOut) return json({ success: false, error: `Token not supported on ${network}` }, 400);
    let amount: bigint; try { amount = BigInt(String(body.amountIn)); if (amount <= 0n) throw new Error('positive'); } catch { return json({ success: false, error: 'amountIn must be a positive integer string', received: body.amountIn }, 400); }
    const source = resolveRouter(network, body.sourceDex); const target = resolveRouter(network, body.targetDex); if (!source || !target) return json({ success: false, error: 'No DEX router available', sourceDex: body.sourceDex, targetDex: body.targetDex }, 400);
    const minIntermediate = body.minIntermediate != null ? BigInt(String(body.minIntermediate)) : 0n; const sourceFee = body.sourceFee != null ? Number(body.sourceFee) : (source.fee ?? 3000); const targetFee = body.targetFee != null ? Number(body.targetFee) : (target.fee ?? 3000);
    const payload = [word(tokenOut.address), word(source.address), word(target.address), word(source.kind), word(target.kind), word(sourceFee), word(targetFee), word(minIntermediate), word(profitRecipient)].join('');
    const params = `0x${payload}`; const padded = payload.padEnd(Math.ceil(payload.length / 64) * 64, '0'); const calldata = SELECTOR + word(tokenIn.address) + word(amount) + word(128) + word(profitRecipient) + word(BigInt(payload.length / 2)) + padded;
    const prepared = { executor, calldata, params, signature: 'executeFlashLoanGasless(address,uint256,bytes,address)', asset: tokenIn.address, amountIn: amount.toString(), tokenOut: tokenOut.address, sourceRouter: source.address, targetRouter: target.address, sourceKind: source.kind, targetKind: target.kind, sourceFee, targetFee, minIntermediate: minIntermediate.toString(), profitRecipient };
    if (body.prepareOnly === true) return json({ success: true, prepared: true, method: 'flash-arb-executor-gasless', execution: { type: 'service_relayer_gasless', submitter: 'authorized service relayer (Supabase DEPLOYER_PRIVATE_KEY)', userSigned: false }, network, chainId, tx: { to: executor, data: calldata, value: '0', from: 'SERVICE_RELAYER' }, params: prepared, explorerUrl: (EXPLORER_URLS as any)[network], executionTimeMs: Date.now() - start });
    const gasPriceHex = await rpc((RPC_ENDPOINTS as any)[network][0], 'eth_gasPrice', []); const gasGwei = parseInt(gasPriceHex, 16) / 1e9; const limits = (GAS_LIMITS as any)[network]; if (limits && gasGwei > limits.max) return json({ success: false, error: 'Gas price too high for profitable execution', currentGasPrice: `${gasGwei.toFixed(2)} gwei`, maxAllowed: `${limits.max} gwei` }, 503);
    let oppId = body.opportunityId; if (!oppId) { const { data } = await supabase.from('arbitrage_opportunities').insert({ user_id: userId, type: 'flash_loan', source_network: network, source_dex: body.sourceDex, target_dex: body.targetDex, token_in: body.tokenIn, token_out: body.tokenOut, amount_in: Number(amount) / (10 ** tokenIn.decimals), profit_percent: 0, profit_usd: 0, gas_estimate: `${gasGwei.toFixed(2)} gwei`, net_profit: 0, confidence: 85, route: [body.tokenIn, body.tokenOut], status: 'executing' }).select().single(); oppId = data?.id; }
    const { data: tx } = await supabase.from('transactions').insert({ user_id: userId, opportunity_id: oppId, type: 'flash_loan', status: 'pending', network, is_gasless: true, is_submarine: true, gas_price: `${gasGwei.toFixed(2)} gwei`, relayer_address: executor }).select().single();
    try { const txHash = await signAndSend(network, chainId, executor, calldata); if (tx) await supabase.from('transactions').update({ hash: txHash, status: 'confirmed', is_gasless: true }).eq('id', tx.id); if (oppId) await supabase.from('arbitrage_opportunities').update({ status: 'completed', executed_at: new Date().toISOString() }).eq('id', oppId); const explorer = (EXPLORER_URLS as any)[network] || 'https://etherscan.io'; return json({ success: true, method: 'FlashArbExecutor.executeFlashLoanGasless', txHash, taskId: txHash, opportunityId: oppId, transactionId: tx?.id, network, chainId, executor, params: prepared, execution: { type: 'service_relayer_gasless', userSigned: false, funding: 'Aave V3 flashLoanSimple', gasPaidBy: 'service relayer', profitPaidTo: profitRecipient, isSubmarine: true, mevProtected: network === 'ethereum' }, explorerUrl: explorer, txUrl: `${explorer}/tx/${txHash}`, gasPrice: `${gasGwei.toFixed(2)} gwei`, executionTimeMs: Date.now() - start, profitDestination: { address: profitRecipient, source: 'connected' } }); }
    catch (e) { if (tx) await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id); if (oppId) await supabase.from('arbitrage_opportunities').update({ status: 'failed' }).eq('id', oppId); const details = e instanceof Error ? e.message : 'Unknown error'; return json({ success: false, error: 'Gasless flash-loan execution failed', details, network, executor, executionTimeMs: Date.now() - start }, details.toLowerCase().includes('insufficient funds') ? 402 : 500); }
  } catch (error) { const s = sanitizeError(error, 'execute-flash-loan'); return json({ success: false, error: s.message, code: s.code, requestId: s.requestId, executionTimeMs: Date.now() - start }, 500); }
});
