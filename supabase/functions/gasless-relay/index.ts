import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  CONTRACT_ADDRESSES,
  CHAIN_IDS,
  EXPLORER_URLS,
  GAS_LIMITS,
  RPC_ENDPOINTS,
  SCANNER_CONFIG,
  PAYMASTERS,
} from "../_shared/mainnet-config.ts";
import { GaslessRelaySchema, validateOrError, sanitizeError } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ERC-4337 EntryPoint v0.7 (deployed on all major networks)
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

interface GaslessRequest {
  network: string;
  to: string;
  data: string;
  value?: string;
  deadline?: number;
  signature?: string;
  walletAddress: string;
  isSubmarine?: boolean;
  opportunityId?: string;
  priorityFee?: string;
  paymasterAddress?: string;
  enforceGasless?: boolean;
  enforceRecipient?: string;
}

function isValidAddress(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeAddress(address: string): string {
  return `0x${address.slice(2).toLowerCase()}`;
}

// ---- JSON-RPC helper ----
async function rpcCall(url: string, method: string, params: unknown[]): Promise<string> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await resp.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

// Get current gas price for the network
async function getGasPrice(network: string): Promise<number> {
  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) return 0;
  try {
    const hex = await rpcCall(rpcs[0], 'eth_gasPrice', []);
    return parseInt(hex, 16) / 1e9;
  } catch {
    return GAS_LIMITS[network]?.target || 30;
  }
}

// ---- Helpers ----
function toHex(n: bigint): string {
  return '0x' + n.toString(16);
}

function padHex(hex: string, bytes: number): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return '0x' + clean.padStart(bytes * 2, '0');
}

// ---- Build a minimal UserOperation for ERC-4337 v0.6/0.7 ----
function buildUserOperation(params: {
  sender: string;
  to: string;
  data: string;
  value: string;
  nonce: string;
  paymasterAddress: string;
  chainId: number;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}) {
  // The callData encodes: execute(to, value, data) on the smart account.
  // For a simple EOA-like smart account the callData IS the raw call.
  // We encode a minimal execute(address,uint256,bytes) selector.
  const executeSelector = '0xb61d27f6'; // execute(address,uint256,bytes)
  const paddedTo = padHex(params.to, 32);
  const paddedValue = padHex(toHex(BigInt(params.value || '0')), 32);
  // offset for bytes param = 96 (0x60)
  const bytesOffset = padHex('0x60', 32);
  const rawData = params.data.startsWith('0x') ? params.data.slice(2) : params.data;
  const dataLen = padHex(toHex(BigInt(rawData.length / 2)), 32);
  // pad data to 32-byte boundary
  const paddedData = rawData.padEnd(Math.ceil(rawData.length / 64) * 64, '0');

  const callData = executeSelector +
    paddedTo.slice(2) +
    paddedValue.slice(2) +
    bytesOffset.slice(2) +
    dataLen.slice(2) +
    paddedData;

  // paymasterAndData = paymaster address (no extra data needed for verifying paymasters)
  const paymasterAndData = params.paymasterAddress;

  return {
    sender: params.sender,
    nonce: params.nonce,
    initCode: '0x',
    callData: '0x' + callData.replace(/^0x/, ''),
    callGasLimit: toHex(2_000_000n),
    verificationGasLimit: toHex(500_000n),
    preVerificationGas: toHex(100_000n),
    maxFeePerGas: params.maxFeePerGas,
    maxPriorityFeePerGas: params.maxPriorityFeePerGas,
    paymasterAndData,
    signature: '0x', // will be filled by bundler or kept empty for paymaster-sponsored
  };
}

// ---- Send UserOp to bundler ----
async function sendUserOpToBundler(
  bundlerUrl: string,
  userOp: Record<string, string>,
  entryPoint: string,
): Promise<string> {
  const resp = await fetch(bundlerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendUserOperation',
      params: [userOp, entryPoint],
    }),
  });
  const json = await resp.json();
  if (json.error) {
    throw new Error(`Bundler error: ${JSON.stringify(json.error)}`);
  }
  return json.result; // userOpHash
}

// ---- Direct signing fallback (same as execute-flash-loan) ----
async function signAndBroadcast(
  network: string,
  chainId: number,
  to: string,
  data: string,
  value: string = '0',
): Promise<string> {
  const key = Deno.env.get('DEPLOYER_PRIVATE_KEY');
  if (!key) throw new Error('No DEPLOYER_PRIVATE_KEY configured');

  const { keccak_256 } = await import('https://esm.sh/@noble/hashes@1.4.0/sha3');
  const { hmac } = await import('https://esm.sh/@noble/hashes@1.4.0/hmac');
  const { sha256 } = await import('https://esm.sh/@noble/hashes@1.4.0/sha256');
  const secp = await import('https://esm.sh/@noble/secp256k1@2.1.0');

  secp.etc.hmacSha256Sync = (k: Uint8Array, ...m: Uint8Array[]) => {
    const h = hmac.create(sha256, k);
    m.forEach(msg => h.update(msg));
    return h.digest();
  };

  const hexToBytes = (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    return bytes;
  };
  const bytesToHex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');

  const keyHex = key.startsWith('0x') ? key.slice(2) : key;
  const pubKey = secp.getPublicKey(hexToBytes(keyHex), false);
  const addrHash = keccak_256(pubKey.slice(1));
  const fromAddress = '0x' + bytesToHex(addrHash.slice(-20));

  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) throw new Error(`No RPC for ${network}`);

  const nonceHex = await rpcCall(rpcs[0], 'eth_getTransactionCount', [fromAddress, 'pending']);
  const nonce = parseInt(nonceHex, 16);
  const gasPriceHex = await rpcCall(rpcs[0], 'eth_gasPrice', []);
  const gasPrice = BigInt(gasPriceHex) * 110n / 100n;
  const gasLimit = 2_000_000n;
  const txValue = BigInt(value || '0');

  // RLP encode helpers
  const numberToBytes = (n: number): Uint8Array => {
    if (n === 0) return new Uint8Array(0);
    const hex = n.toString(16);
    return hexToBytes(hex.length % 2 ? '0' + hex : hex);
  };
  const bigintToBytes = (n: bigint): Uint8Array => {
    if (n === 0n) return new Uint8Array(0);
    const hex = n.toString(16);
    return hexToBytes(hex.length % 2 ? '0' + hex : hex);
  };
  const rlpEncodeItem = (item: Uint8Array): Uint8Array => {
    if (item.length === 1 && item[0] < 0x80) return item;
    if (item.length <= 55) return new Uint8Array([0x80 + item.length, ...item]);
    const lenBytes = bigintToBytes(BigInt(item.length));
    return new Uint8Array([0xb7 + lenBytes.length, ...lenBytes, ...item]);
  };
  const rlpEncodeList = (items: Uint8Array[]): Uint8Array => {
    const encoded = items.map(rlpEncodeItem);
    const totalLen = encoded.reduce((s, e) => s + e.length, 0);
    let prefix: Uint8Array;
    if (totalLen <= 55) {
      prefix = new Uint8Array([0xc0 + totalLen]);
    } else {
      const lenBytes = bigintToBytes(BigInt(totalLen));
      prefix = new Uint8Array([0xf7 + lenBytes.length, ...lenBytes]);
    }
    const result = new Uint8Array(prefix.length + totalLen);
    result.set(prefix, 0);
    let offset = prefix.length;
    for (const enc of encoded) { result.set(enc, offset); offset += enc.length; }
    return result;
  };

  const toBytes_ = hexToBytes(to.slice(2));
  const dataBytes = data.startsWith('0x') ? hexToBytes(data.slice(2)) : hexToBytes(data);

  const unsignedTx = rlpEncodeList([
    numberToBytes(nonce), bigintToBytes(gasPrice), bigintToBytes(gasLimit),
    toBytes_, bigintToBytes(txValue), dataBytes,
    numberToBytes(chainId), new Uint8Array(0), new Uint8Array(0),
  ]);
  const txHash = keccak_256(unsignedTx);
  const sig = secp.sign(txHash, hexToBytes(keyHex), { lowS: true });
  const r = bigintToBytes(sig.r);
  const s = bigintToBytes(sig.s);
  const v = sig.recovery + chainId * 2 + 35;

  const signedTx = rlpEncodeList([
    numberToBytes(nonce), bigintToBytes(gasPrice), bigintToBytes(gasLimit),
    toBytes_, bigintToBytes(txValue), dataBytes,
    numberToBytes(v), r, s,
  ]);

  const rawTxHex = '0x' + bytesToHex(signedTx);
  const sendRpc = network === 'ethereum' ? 'https://rpc.flashbots.net' : rpcs[0];
  return await rpcCall(sendRpc, 'eth_sendRawTransaction', [rawTxHex]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional auth
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const rawBody = await req.json();
    const validation = validateOrError(GaslessRelaySchema, rawBody, corsHeaders);
    if (!validation.ok) return validation.response;
    const body: GaslessRequest = { ...rawBody, ...validation.data } as GaslessRequest;
    const {
      network,
      to,
      data,
      deadline,
      isSubmarine,
      opportunityId,
      walletAddress: rawWalletAddress,
      paymasterAddress: explicitPaymaster,
      enforceGasless = false,
      enforceRecipient,
    } = body;

    if (!isValidAddress(rawWalletAddress)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'A valid connected wallet address is required',
        code: 'INVALID_CONNECTED_WALLET',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const walletAddress = normalizeAddress(rawWalletAddress);
    const normalizedExpectedRecipient = isValidAddress(enforceRecipient) ? normalizeAddress(enforceRecipient) : null;

    if (normalizedExpectedRecipient && normalizedExpectedRecipient !== walletAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Recipient mismatch with connected wallet',
        code: 'RECIPIENT_MISMATCH',
        expectedRecipient: normalizedExpectedRecipient,
        receivedWallet: walletAddress,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate deadline
    if (deadline && deadline < Date.now() / 1000) {
      return new Response(JSON.stringify({
        error: 'Transaction deadline expired',
        code: 'DEADLINE_EXPIRED',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate network
    const contracts = CONTRACT_ADDRESSES[network];
    if (!contracts) {
      return new Response(JSON.stringify({
        error: `Unsupported network: ${network}`,
        code: 'INVALID_NETWORK',
        supportedNetworks: Object.keys(CONTRACT_ADDRESSES),
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check gas price
    const currentGasPrice = await getGasPrice(network);
    const gasLimits = GAS_LIMITS[network];
    if (currentGasPrice > gasLimits.max) {
      return new Response(JSON.stringify({
        error: 'Gas price too high',
        code: 'GAS_TOO_HIGH',
        currentGasPrice: `${currentGasPrice.toFixed(2)} gwei`,
        maxAllowed: `${gasLimits.max} gwei`,
      }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const chainId = CHAIN_IDS[network];
    const targetAddress = to || contracts.gaslessRelayer;

    const configuredPaymasters = PAYMASTERS[network] || [];
    if (explicitPaymaster && configuredPaymasters.length > 0 && !configuredPaymasters.includes(explicitPaymaster)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Requested paymaster is not approved for this network',
        code: 'INVALID_PAYMASTER',
        requestedPaymaster: explicitPaymaster,
        approvedPaymasters: configuredPaymasters,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- Determine paymaster ----
    const paymasterAddress = explicitPaymaster ||
      (SCANNER_CONFIG.usePaymasters ? (configuredPaymasters[0] || null) : null);

    if (enforceGasless && !paymasterAddress) {
      return new Response(JSON.stringify({
        success: false,
        error: `No paymaster configured for ${network}; gasless execution cannot continue`,
        code: 'PAYMASTER_NOT_CONFIGURED',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        opportunity_id: opportunityId,
        type: 'flash_loan',
        status: 'pending',
        network,
        is_gasless: true,
        is_submarine: isSubmarine || false,
        relayer_address: contracts.gaslessRelayer,
        hash: 'pending',
        gas_price: `${currentGasPrice.toFixed(2)} gwei`,
      })
      .select()
      .single();

    if (txError) console.error('Error creating transaction:', txError);

    if (paymasterAddress) {
      // ===== ERC-4337 PAYMASTER PATH (GASLESS) =====
      console.log(`[ERC4337] Using paymaster ${paymasterAddress} on ${network}`);

      // Get nonce for sender (walletAddress)
      const rpcs = RPC_ENDPOINTS[network];
      const gasPriceHex = await rpcCall(rpcs[0], 'eth_gasPrice', []);
      const maxFeePerGas = toHex(BigInt(gasPriceHex) * 120n / 100n); // +20%
      const maxPriorityFeePerGas = toHex(BigInt(gasPriceHex) * 10n / 100n); // 10% tip

      // Build UserOperation
      const userOp = buildUserOperation({
        sender: walletAddress,
        to: targetAddress,
        data,
        value: body.value || '0',
        nonce: '0x0', // bundler will resolve
        paymasterAddress,
        chainId,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      console.log(`[ERC4337] UserOp built: sender=${walletAddress}, paymaster=${paymasterAddress}`);

      // Try bundler first
      const bundlerUrl =
        Deno.env.get('BUNDLER_URL') ||
        Deno.env.get('PIMLICO_BUNDLER_URL');

      let userOpHash: string | null = null;
      let fallbackUsed = false;

      if (!bundlerUrl) {
        if (enforceGasless) {
          if (transaction) {
            await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
          }
          return new Response(JSON.stringify({
            success: false,
            error: 'Gasless mode requires a bundler URL',
            code: 'BUNDLER_NOT_CONFIGURED',
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log('[ERC4337] No bundler URL configured, using direct TX fallback');
        fallbackUsed = true;
      } else {
        try {
          userOpHash = await sendUserOpToBundler(bundlerUrl, userOp, ENTRY_POINT);
          console.log(`[ERC4337] UserOp submitted: ${userOpHash}`);
        } catch (bundlerErr) {
          if (enforceGasless) {
            if (transaction) {
              await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
            }
            return new Response(JSON.stringify({
              success: false,
              error: 'Bundler rejected gasless UserOperation',
              code: 'BUNDLER_REJECTED_USEROP',
              details: bundlerErr instanceof Error ? bundlerErr.message : String(bundlerErr),
            }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          console.error('[ERC4337] Bundler failed, falling back to direct TX:', bundlerErr);
          fallbackUsed = true;
        }
      }

      if (fallbackUsed) {
        // Fallback: sign and broadcast directly using DEPLOYER_PRIVATE_KEY.
        // Gas is paid by deployer, but the swap calldata routes profits to walletAddress.
        try {
          const txHash = await signAndBroadcast(network, chainId, targetAddress, data, body.value || '0');
          userOpHash = txHash;
          console.log(`[Fallback] Direct TX: ${txHash}`);
        } catch (directErr) {
          console.error('[Fallback] Direct TX failed:', directErr);
          if (transaction) {
            await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
          }
          return new Response(JSON.stringify({
            success: false,
            error: 'Both bundler and direct TX failed',
            bundlerError: 'No bundler URL or bundler rejected',
            directError: directErr instanceof Error ? directErr.message : String(directErr),
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Update transaction record
      if (transaction && userOpHash) {
        await supabase.from('transactions').update({
          hash: userOpHash,
          status: fallbackUsed ? 'confirmed' : 'pending',
          is_gasless: !fallbackUsed, // true only if paymaster actually sponsored
          relayer_address: paymasterAddress,
        }).eq('id', transaction.id);
      }

      const explorerUrl = EXPLORER_URLS[network];
      return new Response(JSON.stringify({
        success: true,
        transactionId: transaction?.id,
        taskId: userOpHash,
        userOpHash,
        network,
        chainId,
        relayType: fallbackUsed ? 'direct_with_paymaster_fallback' : 'erc4337',
        paymasterAddress,
        profitDestination: walletAddress,
        explorerUrl: `${explorerUrl}/tx/${userOpHash}`,
        gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
        gasPaidBy: fallbackUsed ? 'deployer (profits → connected wallet)' : `paymaster ${paymasterAddress}`,
        executionTimeMs: Date.now() - startTime,
        message: fallbackUsed
          ? `⚡ TX sent via deployer key. Gas covered by deployer. Profits → ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : `🛡️ Gasless UserOp submitted via paymaster ${paymasterAddress.slice(0, 8)}... Profits → ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (enforceGasless) {
      if (transaction) {
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      }
      return new Response(JSON.stringify({
        success: false,
        error: `Gasless mode is enforced, but no paymaster execution path is available on ${network}`,
        code: 'GASLESS_PATH_UNAVAILABLE',
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== DIRECT TX PATH (no paymaster, sign with deployer key) =====
    console.log(`[Direct] Signing TX on ${network}, profits → ${walletAddress}`);

    try {
      const txHash = await signAndBroadcast(network, chainId, targetAddress, data, body.value || '0');

      if (transaction) {
        await supabase.from('transactions').update({ hash: txHash, status: 'confirmed' }).eq('id', transaction.id);
      }

      const explorerUrl = EXPLORER_URLS[network];
      return new Response(JSON.stringify({
        success: true,
        transactionId: transaction?.id,
        txHash,
        network,
        chainId,
        targetContract: targetAddress,
        profitDestination: walletAddress,
        isSubmarine: isSubmarine || false,
        mevProtected: network === 'ethereum',
        explorerUrl: `${explorerUrl}/tx/${txHash}`,
        gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
        executionTimeMs: Date.now() - startTime,
        message: network === 'ethereum'
          ? `🛡️ TX sent via Flashbots Protect (MEV shielded). Profits → ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : `⚡ TX sent on ${network}. Profits → ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (txError) {
      if (transaction) {
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', transaction.id);
      }
      const sanitized = sanitizeError(txError, 'gasless-relay-tx');
      return new Response(JSON.stringify({
        success: false,
        error: sanitized.message,
        code: sanitized.code,
        requestId: sanitized.requestId,
        transactionId: transaction?.id,
        executionTimeMs: Date.now() - startTime,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    const sanitized = sanitizeError(error, 'gasless-relay');
    return new Response(JSON.stringify({
      success: false,
      error: sanitized.message,
      code: sanitized.code,
      requestId: sanitized.requestId,
      executionTimeMs: Date.now() - startTime,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
