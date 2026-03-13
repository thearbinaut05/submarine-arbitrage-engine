import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  CHAIN_IDS,
  TOKEN_ADDRESSES,
  GAS_LIMITS,
  RPC_ENDPOINTS,
  SCANNER_CONFIG,
  EXPLORER_URLS,
  PAYMASTERS,
} from "../_shared/mainnet-config.ts";
import {
  BALANCER_VAULT,
  getBestFlashLoanProvider,
} from "../_shared/deployed-protocols.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ===== FREE DEX AGGREGATOR APIs (NO API KEY REQUIRED!) =====

// Paraswap - FREE, no API key needed
const PARASWAP_API = 'https://apiv5.paraswap.io';

// 0x API - Has free tier for public endpoints  
const ZEROX_API: Record<string, string> = {
  ethereum: 'https://api.0x.org',
  arbitrum: 'https://arbitrum.api.0x.org',
  polygon: 'https://polygon.api.0x.org',
  optimism: 'https://optimism.api.0x.org',
  base: 'https://base.api.0x.org',
  bsc: 'https://bsc.api.0x.org',
  avalanche: 'https://avalanche.api.0x.org',
};

// Kyberswap - FREE aggregator API
const KYBERSWAP_API: Record<string, string> = {
  ethereum: 'https://aggregator-api.kyberswap.com/ethereum',
  arbitrum: 'https://aggregator-api.kyberswap.com/arbitrum',
  polygon: 'https://aggregator-api.kyberswap.com/polygon',
  optimism: 'https://aggregator-api.kyberswap.com/optimism',
  base: 'https://aggregator-api.kyberswap.com/base',
  bsc: 'https://aggregator-api.kyberswap.com/bsc',
  avalanche: 'https://aggregator-api.kyberswap.com/avalanche',
};

// OpenOcean - FREE aggregator API
const OPENOCEAN_API = 'https://open-api.openocean.finance/v3';

// Chain name mappings for APIs
const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'eth',
  arbitrum: 'arbitrum',
  polygon: 'polygon',
  optimism: 'optimism',
  base: 'base',
  bsc: 'bsc',
  avalanche: 'avax',
};

interface FlashLoanRequest {
  network: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  sourceDex: string;
  targetDex: string;
  slippageTolerance?: number;
  walletAddress?: string;
  enforceConnectedWallet?: boolean;
  enforceGasless?: boolean;
  useGelato?: boolean;
  opportunityId?: string;
}

function isValidAddress(value: string | undefined | null): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeAddress(address: string): string {
  return `0x${address.slice(2).toLowerCase()}`;
}

interface SwapQuote {
  aggregator: string;
  toAmount: string;
  priceRoute?: any;
  tx?: {
    to: string;
    data: string;
    value: string;
    gasPrice?: string;
  };
}

// DEX Router addresses - ALREADY DEPLOYED on all networks (no custom deployment needed!)
const DEX_ROUTERS: Record<string, Record<string, string>> = {
  arbitrum: {
    uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    camelot: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
  },
  ethereum: {
    uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  },
  polygon: {
    uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
  },
  optimism: {
    uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  },
  base: {
    uniswap_v3: '0x2626664c2603336E57B271c5C0b26F421741e481',
  },
  bsc: {
    pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  },
  avalanche: {
    traderjoe: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
};

// ===== FREE AGGREGATOR FUNCTIONS =====

/**
 * Get swap quote from Paraswap (FREE - NO API KEY)
 */
async function getParaswapQuote(
  network: string,
  srcToken: string,
  destToken: string,
  amount: string,
  userAddress: string
): Promise<SwapQuote | null> {
  try {
    const chainId = CHAIN_IDS[network];
    
    // Step 1: Get price route
    const priceUrl = `${PARASWAP_API}/prices?srcToken=${srcToken}&destToken=${destToken}&amount=${amount}&srcDecimals=18&destDecimals=18&side=SELL&network=${chainId}`;
    
    const priceResp = await fetch(priceUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!priceResp.ok) {
      console.log(`Paraswap price failed: ${priceResp.status}`);
      return null;
    }
    
    const priceData = await priceResp.json();
    if (!priceData.priceRoute) return null;
    
    // Step 2: Build transaction
    const txUrl = `${PARASWAP_API}/transactions/${chainId}`;
    const txResp = await fetch(txUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        srcToken,
        destToken,
        srcAmount: amount,
        destAmount: priceData.priceRoute.destAmount,
        priceRoute: priceData.priceRoute,
        userAddress,
        partner: 'lovable',
        slippage: 100, // 1%
      }),
    });
    
    if (!txResp.ok) {
      console.log(`Paraswap tx build failed: ${txResp.status}`);
      return null;
    }
    
    const txData = await txResp.json();
    
    return {
      aggregator: 'Paraswap',
      toAmount: priceData.priceRoute.destAmount,
      priceRoute: priceData.priceRoute,
      tx: {
        to: txData.to,
        data: txData.data,
        value: txData.value || '0',
        gasPrice: txData.gasPrice,
      },
    };
  } catch (error) {
    console.error('Paraswap error:', error);
    return null;
  }
}

/**
 * Get swap quote from KyberSwap (FREE - NO API KEY)
 */
async function getKyberswapQuote(
  network: string,
  srcToken: string,
  destToken: string,
  amount: string,
  userAddress: string
): Promise<SwapQuote | null> {
  try {
    const baseUrl = KYBERSWAP_API[network];
    if (!baseUrl) return null;
    
    // Get route
    const routeUrl = `${baseUrl}/api/v1/routes?tokenIn=${srcToken}&tokenOut=${destToken}&amountIn=${amount}&saveGas=false&gasInclude=true`;
    
    const routeResp = await fetch(routeUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!routeResp.ok) {
      console.log(`Kyberswap route failed: ${routeResp.status}`);
      return null;
    }
    
    const routeData = await routeResp.json();
    if (!routeData.data?.routeSummary) return null;
    
    // Build transaction
    const buildUrl = `${baseUrl}/api/v1/route/build`;
    const buildResp = await fetch(buildUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        routeSummary: routeData.data.routeSummary,
        sender: userAddress,
        recipient: userAddress,
        slippageTolerance: 100, // 1% = 100 bps
      }),
    });
    
    if (!buildResp.ok) {
      console.log(`Kyberswap build failed: ${buildResp.status}`);
      return null;
    }
    
    const buildData = await buildResp.json();
    
    return {
      aggregator: 'KyberSwap',
      toAmount: routeData.data.routeSummary.amountOut,
      tx: {
        to: buildData.data.routerAddress,
        data: buildData.data.data,
        value: '0',
      },
    };
  } catch (error) {
    console.error('Kyberswap error:', error);
    return null;
  }
}

/**
 * Get swap quote from OpenOcean (FREE - NO API KEY)
 */
async function getOpenOceanQuote(
  network: string,
  srcToken: string,
  destToken: string,
  amount: string,
  userAddress: string
): Promise<SwapQuote | null> {
  try {
    const chainName = CHAIN_NAMES[network];
    if (!chainName) return null;
    
    const url = `${OPENOCEAN_API}/${chainName}/swap_quote?inTokenAddress=${srcToken}&outTokenAddress=${destToken}&amount=${amount}&gasPrice=5&slippage=1&account=${userAddress}`;
    
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!resp.ok) {
      console.log(`OpenOcean failed: ${resp.status}`);
      return null;
    }
    
    const data = await resp.json();
    if (!data.data?.outAmount) return null;
    
    return {
      aggregator: 'OpenOcean',
      toAmount: data.data.outAmount,
      tx: {
        to: data.data.to,
        data: data.data.data,
        value: data.data.value || '0',
      },
    };
  } catch (error) {
    console.error('OpenOcean error:', error);
    return null;
  }
}

/**
 * Get the BEST swap quote from all FREE aggregators
 * Returns the quote with highest output amount
 */
async function getBestAggregatorQuote(
  network: string,
  srcToken: string,
  destToken: string,
  amount: string,
  userAddress: string
): Promise<SwapQuote | null> {
  console.log(`Fetching quotes from FREE aggregators for ${network}...`);
  
  // Query all aggregators in parallel
  const [paraswap, kyberswap, openocean] = await Promise.all([
    getParaswapQuote(network, srcToken, destToken, amount, userAddress),
    getKyberswapQuote(network, srcToken, destToken, amount, userAddress),
    getOpenOceanQuote(network, srcToken, destToken, amount, userAddress),
  ]);
  
  const quotes = [paraswap, kyberswap, openocean].filter(q => q !== null) as SwapQuote[];
  
  console.log(`Got ${quotes.length} quotes:`, quotes.map(q => `${q.aggregator}: ${q.toAmount}`));
  
  if (quotes.length === 0) {
    return null;
  }
  
  // Find best quote (highest output)
  return quotes.reduce((best, current) => {
    const bestAmount = BigInt(best.toAmount);
    const currentAmount = BigInt(current.toAmount);
    return currentAmount > bestAmount ? current : best;
  });
}

// Get current gas price
async function getGasPrice(network: string): Promise<number> {
  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) return GAS_LIMITS[network]?.target || 30;

  try {
    const response = await fetch(rpcs[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_gasPrice',
        params: [],
      }),
    });

    const data = await response.json();
    return parseInt(data.result, 16) / 1e9;
  } catch {
    return GAS_LIMITS[network]?.target || 30;
  }
}

/**
 * Build swap calldata for Uniswap V3 exactInputSingle
 * Uses ALREADY DEPLOYED Uniswap V3 SwapRouter
 */
function buildUniswapV3Calldata(
  routerAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  recipient: string,
  slippageBps: number,
  fee: number = 3000 // 0.3% fee tier
): { to: string; data: string; value: string } {
  // Validate inputs to prevent undefined BigInt conversion
  if (!amountIn || amountIn === '' || amountIn === 'undefined') {
    throw new Error(`Invalid amountIn for V3 swap: ${amountIn}`);
  }
  if (!tokenIn || !tokenOut || !routerAddress || !recipient) {
    throw new Error(`Missing required parameters: tokenIn=${tokenIn}, tokenOut=${tokenOut}, router=${routerAddress}, recipient=${recipient}`);
  }

  // exactInputSingle function selector
  const functionSelector = '0x414bf389';
  
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
  const minAmountOut = BigInt(0); // No minimum for now
  const sqrtPriceLimitX96 = BigInt(0);
  
  // Safe BigInt conversion with detailed error
  let amountInBigInt: bigint;
  try {
    amountInBigInt = BigInt(amountIn);
  } catch (e: unknown) {
    throw new Error(`Cannot convert amountIn "${amountIn}" to BigInt: ${(e as Error).message}`);
  }
  
  // ABI encode the struct: (tokenIn, tokenOut, fee, recipient, deadline, amountIn, amountOutMinimum, sqrtPriceLimitX96)
  const encodedParams = [
    tokenIn.slice(2).toLowerCase().padStart(64, '0'),
    tokenOut.slice(2).toLowerCase().padStart(64, '0'),
    fee.toString(16).padStart(64, '0'),
    recipient.slice(2).toLowerCase().padStart(64, '0'),
    deadline.toString(16).padStart(64, '0'),
    amountInBigInt.toString(16).padStart(64, '0'),
    minAmountOut.toString(16).padStart(64, '0'),
    sqrtPriceLimitX96.toString(16).padStart(64, '0'),
  ].join('');
  
  return {
    to: routerAddress,
    data: functionSelector + encodedParams,
    value: '0',
  };
}

/**
 * Build swap calldata for SushiSwap/Uniswap V2 style routers
 */
function buildV2SwapCalldata(
  routerAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  recipient: string,
  slippageBps: number
): { to: string; data: string; value: string } {
  // Validate inputs to prevent undefined BigInt conversion
  if (!amountIn || amountIn === '' || amountIn === 'undefined') {
    throw new Error(`Invalid amountIn for V2 swap: ${amountIn}`);
  }
  if (!tokenIn || !tokenOut || !routerAddress || !recipient) {
    throw new Error(`Missing required parameters: tokenIn=${tokenIn}, tokenOut=${tokenOut}, router=${routerAddress}, recipient=${recipient}`);
  }

  // swapExactTokensForTokens function selector
  const functionSelector = '0x38ed1739';
  
  const deadline = Math.floor(Date.now() / 1000) + 1800;
  const minAmountOut = BigInt(0);
  
  // Safe BigInt conversion
  let amountInBigInt: bigint;
  try {
    amountInBigInt = BigInt(amountIn);
  } catch (e: unknown) {
    throw new Error(`Cannot convert amountIn "${amountIn}" to BigInt: ${(e as Error).message}`);
  }
  
  // Path array: [tokenIn, tokenOut]
  const pathOffset = '00000000000000000000000000000000000000000000000000000000000000a0';
  const pathLength = '0000000000000000000000000000000000000000000000000000000000000002';
  
  const encodedParams = [
    amountInBigInt.toString(16).padStart(64, '0'),
    minAmountOut.toString(16).padStart(64, '0'),
    pathOffset,
    recipient.slice(2).toLowerCase().padStart(64, '0'),
    deadline.toString(16).padStart(64, '0'),
    pathLength,
    tokenIn.slice(2).toLowerCase().padStart(64, '0'),
    tokenOut.slice(2).toLowerCase().padStart(64, '0'),
  ].join('');
  
  return {
    to: routerAddress,
    data: functionSelector + encodedParams,
    value: '0',
  };
}

/**
 * Get the best DEX router for a network
 */
function getRouterForNetwork(network: string, dexName: string): { router: string; isV3: boolean } | null {
  const networkRouters = DEX_ROUTERS[network];
  if (!networkRouters) return null;

  // Prefer the requested DEX
  const normalizedDex = dexName.toLowerCase().replace(/[\s-]/g, '_');
  
  if (normalizedDex.includes('uniswap') || normalizedDex.includes('v3')) {
    if (networkRouters.uniswap_v3) {
      return { router: networkRouters.uniswap_v3, isV3: true };
    }
  }
  
  if (normalizedDex.includes('sushi')) {
    if (networkRouters.sushiswap) {
      return { router: networkRouters.sushiswap, isV3: false };
    }
  }
  
  // Default to Uniswap V3 if available
  if (networkRouters.uniswap_v3) {
    return { router: networkRouters.uniswap_v3, isV3: true };
  }
  
  // Fallback to first available
  const firstRouter = Object.values(networkRouters)[0];
  return firstRouter ? { router: firstRouter, isV3: false } : null;
}

// ===== FLASHBOTS PROTECT RPC (MEV protection for Ethereum mainnet) =====
const FLASHBOTS_RPC = 'https://rpc.flashbots.net';

/**
 * Simple RPC call helper
 */
async function rpcCall(rpcUrl: string, method: string, params: any[]): Promise<string> {
  const resp = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await resp.json();
  if (json.error) {
    throw new Error(`RPC error (${method}): ${json.error.message || JSON.stringify(json.error)}`);
  }
  return json.result;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bigintToBytes(val: bigint): Uint8Array {
  if (val === 0n) return new Uint8Array(0);
  const hex = val.toString(16);
  const padded = hex.length % 2 ? '0' + hex : hex;
  return hexToBytes(padded);
}

function numberToBytes(val: number): Uint8Array {
  if (val === 0) return new Uint8Array(0);
  return bigintToBytes(BigInt(val));
}

function rlpEncodeBytes(data: Uint8Array): Uint8Array {
  if (data.length === 0) {
    return new Uint8Array([0x80]);
  }
  if (data.length === 1 && data[0] < 0x80) return data;
  if (data.length < 56) {
    const result = new Uint8Array(1 + data.length);
    result[0] = 0x80 + data.length;
    result.set(data, 1);
    return result;
  }
  const hexLen = data.length.toString(16);
  const byteLen = Math.ceil(hexLen.length / 2);
  const result = new Uint8Array(1 + byteLen + data.length);
  result[0] = 0xb7 + byteLen;
  for (let i = 0; i < byteLen; i++) {
    result[byteLen - i] = (data.length >> (8 * i)) & 0xff;
  }
  result.set(data, 1 + byteLen);
  return result;
}

function rlpEncodeList(items: Uint8Array[]): Uint8Array {
  const encoded = items.map(rlpEncodeBytes);
  const totalLen = encoded.reduce((sum, e) => sum + e.length, 0);
  
  let prefix: Uint8Array;
  if (totalLen < 56) {
    prefix = new Uint8Array([0xc0 + totalLen]);
  } else {
    const hexLen = totalLen.toString(16);
    const byteLen = Math.ceil(hexLen.length / 2);
    prefix = new Uint8Array(1 + byteLen);
    prefix[0] = 0xf7 + byteLen;
    for (let i = 0; i < byteLen; i++) {
      prefix[byteLen - i] = (totalLen >> (8 * i)) & 0xff;
    }
  }
  
  const result = new Uint8Array(prefix.length + totalLen);
  result.set(prefix, 0);
  let offset = prefix.length;
  for (const e of encoded) {
    result.set(e, offset);
    offset += e.length;
  }
  return result;
}

/**
 * Complete sign-and-send transaction using noble-secp256k1 + noble-hashes
 * Uses Flashbots Protect RPC on Ethereum mainnet for MEV protection
 */
async function signAndSendTransaction(
  network: string,
  chainId: number,
  to: string,
  data: string,
  value: string = '0',
  privateKeyOverride?: string, // optional key to sign with instead of deployer
): Promise<{ txHash: string }> {
  const key = privateKeyOverride || Deno.env.get('DEPLOYER_PRIVATE_KEY');
  if (!key) throw new Error('No private key configured for signing');
  const deployerKey = key;
  
  const { keccak_256 } = await import('https://esm.sh/@noble/hashes@1.4.0/sha3');
  const { hmac } = await import('https://esm.sh/@noble/hashes@1.4.0/hmac');
  const { sha256 } = await import('https://esm.sh/@noble/hashes@1.4.0/sha256');
  const secp = await import('https://esm.sh/@noble/secp256k1@2.1.0');

  // Configure hmacSha256Sync required by noble-secp256k1 v2
  secp.etc.hmacSha256Sync = (k: Uint8Array, ...m: Uint8Array[]) => {
    const h = hmac.create(sha256, k);
    m.forEach(msg => h.update(msg));
    return h.digest();
  };
  
  const keyHex = deployerKey.startsWith('0x') ? deployerKey.slice(2) : deployerKey;
  
  // Derive address
  const pubKey = secp.getPublicKey(hexToBytes(keyHex), false);
  const addrHash = keccak_256(pubKey.slice(1));
  const fromAddress = '0x' + bytesToHex(addrHash.slice(-20));
  
  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) throw new Error(`No RPC for ${network}`);

  // log current balance of signing key for easier debugging
  try {
    const balHexCheck = await rpcCall(rpcs[0], 'eth_getBalance', [fromAddress, 'latest']);
    console.log(`Signing account ${fromAddress} balance: ${BigInt(balHexCheck).toString()}`);
  } catch (e) {
    console.log('Failed to fetch signing account balance for debug:', e);
  }
  // Use Flashbots for Ethereum mainnet
  const useFlashbots = network === 'ethereum';
  const sendRpc = useFlashbots ? FLASHBOTS_RPC : rpcs[0];
  
  // Get nonce
  const nonceHex = await rpcCall(rpcs[0], 'eth_getTransactionCount', [fromAddress, 'pending']);
  const nonce = parseInt(nonceHex, 16);
  
  // Get gas price
  const gasPriceHex = await rpcCall(rpcs[0], 'eth_gasPrice', []);
  const gasPrice = BigInt(gasPriceHex) * 110n / 100n; // +10%
  
  // Estimate gas - calculate minimum based on calldata size
  const dataBytesLen = data.startsWith('0x') ? (data.length - 2) / 2 : data.length / 2;
  // EIP-2028: 16 gas per non-zero byte, 4 gas per zero byte + 21000 base
  const minIntrinsicGas = BigInt(21000 + dataBytesLen * 16); // worst case: all non-zero
  let gasLimit = minIntrinsicGas * 3n; // 3x intrinsic as safe default
  if (gasLimit < 2000000n) gasLimit = 2000000n; // minimum 2M for complex flash loan txs
  
  try {
    const estHex = await rpcCall(rpcs[0], 'eth_estimateGas', [{
      from: fromAddress, to, data,
      value: value === '0' ? '0x0' : '0x' + BigInt(value).toString(16),
    }]);
    gasLimit = BigInt(estHex) * 130n / 100n; // 30% buffer
    // Ensure we never go below intrinsic gas
    if (gasLimit < minIntrinsicGas) gasLimit = minIntrinsicGas * 2n;
  } catch (e) {
    console.log('Gas estimate failed, using 500k:', e);
  }
  
  // --- ensure deployer has enough balance to cover gas + value ---
  try {
    const balHex = await rpcCall(rpcs[0], 'eth_getBalance', [fromAddress, 'latest']);
    const balance = BigInt(balHex);
    const txValueCheck = BigInt(value || '0');
    const txCost = gasPrice * gasLimit + txValueCheck;
    if (balance < txCost) {
      throw new Error(
        `insufficient funds for gas * price + value: address ${fromAddress} have ${balance} want ${txCost}`
      );
    }
  } catch (balErr) {
    // if we detected insufficient funds, rethrow so caller handles it
    if (balErr instanceof Error && balErr.message.startsWith('insufficient funds')) {
      throw balErr;
    }
    // any other error, just log but continue
    console.log('Balance check failed:', balErr);
  }
  
  const txValue = BigInt(value || '0');
  const toBytes = hexToBytes(to.slice(2));
  const dataBytes = data.startsWith('0x') ? hexToBytes(data.slice(2)) : hexToBytes(data);
  
  // RLP encode unsigned tx (EIP-155)
  const unsignedTx = rlpEncodeList([
    numberToBytes(nonce),
    bigintToBytes(gasPrice),
    bigintToBytes(gasLimit),
    toBytes,
    bigintToBytes(txValue),
    dataBytes,
    numberToBytes(chainId),
    new Uint8Array(0),
    new Uint8Array(0),
  ]);
  
  // Hash and sign
  const txHash = keccak_256(unsignedTx);
  const sig = secp.sign(txHash, hexToBytes(keyHex), { lowS: true });
  
  const r = bigintToBytes(sig.r);
  const s = bigintToBytes(sig.s);
  const v = sig.recovery + chainId * 2 + 35;
  
  // RLP encode signed tx
  const signedTx = rlpEncodeList([
    numberToBytes(nonce),
    bigintToBytes(gasPrice),
    bigintToBytes(gasLimit),
    toBytes,
    bigintToBytes(txValue),
    dataBytes,
    numberToBytes(v),
    r,
    s,
  ]);
  
  const rawTxHex = '0x' + bytesToHex(signedTx);
  
  console.log(`📡 Sending tx via ${useFlashbots ? '🛡️ Flashbots Protect (MEV protected)' : 'standard RPC'} on ${network}`);
  console.log(`   From: ${fromAddress}, Nonce: ${nonce}, Gas: ${gasLimit}, GasPrice: ${(Number(gasPrice) / 1e9).toFixed(2)} gwei`);
  
  const resultHash = await rpcCall(sendRpc, 'eth_sendRawTransaction', [rawTxHex]);
  
  console.log(`✅ Transaction hash: ${resultHash}`);
  return { txHash: resultHash };
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

    const body: FlashLoanRequest = await req.json();
    const {
      network,
      tokenIn,
      tokenOut,
      amountIn: rawAmountIn,
      sourceDex,
      targetDex,
      slippageTolerance = SCANNER_CONFIG.defaultSlippage,
      walletAddress: rawWalletAddress,
      enforceConnectedWallet = true,
      enforceGasless = true,
      opportunityId,
    } = body;

    if (!isValidAddress(rawWalletAddress)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'A valid connected wallet address is required for execution',
        code: 'INVALID_CONNECTED_WALLET',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const walletAddress = normalizeAddress(rawWalletAddress);
    const profitSource = 'connected';
    console.log(`Using connected wallet for profits: ${walletAddress}`);

    // Strict gasless mode: require paymaster + bundler when execution is requested
    let paymasterAddress: string | undefined;
    const paymasterList = PAYMASTERS[network] || [];

    if (SCANNER_CONFIG.usePaymasters) {
      if (paymasterList.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: `No paymaster configured for ${network}. Gasless execution is blocked on this network.`,
          code: 'PAYMASTER_NOT_CONFIGURED',
          configuredPaymasterNetworks: Object.keys(PAYMASTERS),
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      paymasterAddress = paymasterList[0];
      console.log(`[paymaster] using ${paymasterAddress}`);
    } else if (enforceGasless) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Gasless execution is required but paymaster mode is disabled in scanner config',
        code: 'GASLESS_DISABLED',
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bundlerUrl = Deno.env.get('BUNDLER_URL') || Deno.env.get('PIMLICO_BUNDLER_URL');
    if (enforceGasless && !bundlerUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing bundler configuration for gasless execution',
        code: 'BUNDLER_NOT_CONFIGURED',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (enforceConnectedWallet) {
      console.log(`[recipient] enforcing connected wallet recipient ${walletAddress}`);
    }

    // Validate amountIn - critical for BigInt conversion
    if (!rawAmountIn || rawAmountIn === '' || rawAmountIn === '0') {
      return new Response(JSON.stringify({
        success: false,
        error: 'amountIn is required and must be a valid positive number string',
        received: rawAmountIn,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Safely convert to string and validate it's a valid number
    const amountIn = String(rawAmountIn);
    try {
      const testBigInt = BigInt(amountIn);
      if (testBigInt <= 0n) {
        throw new Error('Amount must be positive');
      }
    } catch (e: unknown) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid amountIn format: ${(e as Error).message}`,
        received: rawAmountIn,
        hint: 'amountIn must be a valid integer string (e.g., "1000000000000000000" for 1 ETH)',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate network
    const tokens = TOKEN_ADDRESSES[network];
    const chainId = CHAIN_IDS[network];

    if (!tokens || !chainId) {
      return new Response(JSON.stringify({
        success: false,
        error: `Unsupported network: ${network}`,
        supportedNetworks: Object.keys(DEX_ROUTERS),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get token addresses
    const tokenInData = tokens[tokenIn];
    const tokenOutData = tokens[tokenOut];

    if (!tokenInData || !tokenOutData) {
      return new Response(JSON.stringify({
        success: false,
        error: `Token not supported on ${network}`,
        availableTokens: Object.keys(tokens),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check gas price
    const currentGasPrice = await getGasPrice(network);
    const gasLimits = GAS_LIMITS[network];

    if (currentGasPrice > gasLimits?.max) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Gas price too high for profitable execution',
        currentGasPrice: `${currentGasPrice.toFixed(2)} gwei`,
        maxAllowed: `${gasLimits.max} gwei`,
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get flash loan provider info (for reference)
    let flashLoanProvider;
    try {
      flashLoanProvider = getBestFlashLoanProvider(network);
    } catch {
      flashLoanProvider = { name: 'Balancer V2', address: BALANCER_VAULT, fee: 0 };
    }

    // Get DEX router - ALREADY DEPLOYED!
    const routerInfo = getRouterForNetwork(network, sourceDex);
    if (!routerInfo) {
      return new Response(JSON.stringify({
        success: false,
        error: `No DEX router available for ${network}`,
        availableNetworks: Object.keys(DEX_ROUTERS),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Using ${routerInfo.isV3 ? 'Uniswap V3' : 'V2-style'} router: ${routerInfo.router}`);

    // ===== TRY FREE AGGREGATOR APIs FIRST =====
    console.log(`Attempting FREE aggregator swap for ${tokenIn} -> ${tokenOut} on ${network}`);
    
    const aggregatorQuote = await getBestAggregatorQuote(
      network,
      tokenInData.address,
      tokenOutData.address,
      amountIn,
      walletAddress
    );
    
    let txData: { to: string; data: string; value: string };
    let executionMethod: string;
    
    if (aggregatorQuote && aggregatorQuote.tx) {
      // Use aggregator quote (BEST RATES, NO API KEY!)
      txData = aggregatorQuote.tx;
      executionMethod = `${aggregatorQuote.aggregator} Aggregator (FREE)`;
      console.log(`✅ Using ${aggregatorQuote.aggregator} - Expected output: ${aggregatorQuote.toAmount}`);
    } else {
      // Fallback to direct DEX router
      console.log('⚠️ Aggregators unavailable, falling back to direct DEX router');
      txData = routerInfo.isV3
        ? buildUniswapV3Calldata(
            routerInfo.router,
            tokenInData.address,
            tokenOutData.address,
            amountIn,
            walletAddress,
            Math.floor(slippageTolerance * 100)
          )
        : buildV2SwapCalldata(
            routerInfo.router,
            tokenInData.address,
            tokenOutData.address,
            amountIn,
            walletAddress,
            Math.floor(slippageTolerance * 100)
          );
      executionMethod = routerInfo.isV3 ? 'Uniswap V3 Direct' : 'DEX V2 Direct';
    }

    // Create opportunity record
    let oppId = opportunityId;
    if (!oppId) {
      const { data: opportunity } = await supabase
        .from('arbitrage_opportunities')
        .insert({
          user_id: userId,
          type: 'flash_loan',
          source_network: network,
          source_dex: sourceDex,
          target_dex: targetDex,
          token_in: tokenIn,
          token_out: tokenOut,
          amount_in: parseFloat(amountIn) / (10 ** tokenInData.decimals),
          profit_percent: 0,
          profit_usd: 0,
          gas_estimate: `${currentGasPrice.toFixed(2)} gwei`,
          net_profit: 0,
          confidence: 85,
          route: [tokenIn, tokenOut],
          status: 'executing',
        })
        .select()
        .single();

      oppId = opportunity?.id;
    }

    // Create transaction record
    const { data: transaction } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        opportunity_id: oppId,
        type: 'flash_loan',
        status: 'pending',
        network,
        is_gasless: false,
        is_submarine: SCANNER_CONFIG.useSubmarineTransactions,
        gas_price: `${currentGasPrice.toFixed(2)} gwei`,
        relayer_address: routerInfo.router,
      })
      .select()
      .single();

    // ===== EXECUTE TRANSACTION (direct or via gasless relay) =====
    try {
      let result: any;
      let responsePayload: any;
      const explorerUrl = EXPLORER_URLS[network] || 'https://etherscan.io';

      if (paymasterAddress) {
        console.log(`🚀 Executing via ERC-4337 bundler with paymaster ${paymasterAddress}`);

        if (!bundlerUrl) {
          throw new Error('Gasless execution requires BUNDLER_URL or PIMLICO_BUNDLER_URL');
        }

        // Forward to the generic gasless relay endpoint (paymaster-only mode).
        const relayReq = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/gasless-relay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            network,
            to: txData.to,
            data: txData.data,
            value: txData.value || '0',
            walletAddress,
            opportunityId: oppId,
            paymasterAddress,
            isSubmarine: SCANNER_CONFIG.useSubmarineTransactions,
            enforceGasless: true,
            enforceRecipient: walletAddress,
          }),
        });

        if (!relayReq.ok) {
          const text = await relayReq.text();
          throw new Error(`Bundler relay failed: ${relayReq.status} ${text}`);
        }
        result = await relayReq.json();

        // result should contain at least a taskId or userOpHash
        if (transaction) {
          await supabase
            .from('transactions')
            .update({
              hash: result.taskId || result.userOpHash || 'pending',
              status: 'pending',
              is_gasless: true,
            })
            .eq('id', transaction.id);
        }

        if (oppId) {
          await supabase
            .from('arbitrage_opportunities')
            .update({ status: 'completed', executed_at: new Date().toISOString() })
            .eq('id', oppId);
        }

        responsePayload = {
          success: true,
          method: executionMethod + ' + ERC4337',
          txHash: result.taskId || result.userOpHash,
          opportunityId: oppId,
          transactionId: transaction?.id,
          network,
          chainId,
          contracts: {
            flashLoanProvider: flashLoanProvider.name,
            flashLoanAddress: flashLoanProvider.address,
            flashLoanFee: `${flashLoanProvider.fee / 100}%`,
            executionMethod,
            swapTarget: txData.to,
            note: aggregatorQuote 
              ? `✅ Using ${aggregatorQuote.aggregator} - FREE aggregator!`
              : '✅ Using direct DEX router!',
          },
          execution: {
            type: 'erc4337_paymaster',
            description: `📡 Bundled via ${bundlerUrl}`,
            mevProtected: network === 'ethereum',
          },
          aggregatorDetails: aggregatorQuote ? {
            aggregator: aggregatorQuote.aggregator,
            expectedOutput: aggregatorQuote.toAmount,
            priceImpact: aggregatorQuote.priceRoute?.priceImpact || 'N/A',
          } : null,
          explorerUrl,
          txUrl: result.taskId ? `${explorerUrl}/tx/${result.taskId}` : undefined,
          gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
          executionTimeMs: Date.now() - startTime,
          profitDestination: {
            address: walletAddress,
            source: profitSource,
          },
          message: `🚀 UserOp sent: ${result.taskId?.toString().slice(0,10)}... profits → ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`,
          trade: {
            tokenIn,
            tokenOut,
            amountIn,
            sourceDex,
            targetDex,
            slippage: `${slippageTolerance}%`,
          },
        };
      } else {
        // normal direct transaction path (flashbots or standard RPC)
        console.log(`🚀 Executing direct transaction on ${network} (${network === 'ethereum' ? 'Flashbots MEV-protected' : 'standard RPC'})`);
        result = await signAndSendTransaction(
          network,
          chainId,
          txData.to,
          txData.data,
          txData.value || '0',
        );

        // Update transaction record with hash
        if (transaction) {
          await supabase
            .from('transactions')
            .update({ hash: result.txHash, status: 'confirmed' })
            .eq('id', transaction.id);
        }

        // Update opportunity status
        if (oppId) {
          await supabase
            .from('arbitrage_opportunities')
            .update({ status: 'completed', executed_at: new Date().toISOString() })
            .eq('id', oppId);
        }

        responsePayload = {
          success: true,
          method: executionMethod + (network === 'ethereum' ? ' + Flashbots Protect' : ' + Direct TX'),
          txHash: result.txHash,
          opportunityId: oppId,
          transactionId: transaction?.id,
          network,
          chainId,
          contracts: {
            flashLoanProvider: flashLoanProvider.name,
            flashLoanAddress: flashLoanProvider.address,
            flashLoanFee: `${flashLoanProvider.fee / 100}%`,
            executionMethod,
            swapTarget: txData.to,
            note: aggregatorQuote 
              ? `✅ Using ${aggregatorQuote.aggregator} - FREE aggregator!`
              : '✅ Using direct DEX router!',
          },
          execution: {
            type: network === 'ethereum' ? 'flashbots_protect' : 'direct_rpc',
            description: network === 'ethereum' 
              ? '🛡️ Sent via Flashbots Protect RPC - MEV protected, no frontrunning!'
              : '📡 Sent via direct RPC with signed transaction',
            mevProtected: network === 'ethereum',
          },
          aggregatorDetails: aggregatorQuote ? {
            aggregator: aggregatorQuote.aggregator,
            expectedOutput: aggregatorQuote.toAmount,
            priceImpact: aggregatorQuote.priceRoute?.priceImpact || 'N/A',
          } : null,
          explorerUrl,
          txUrl: `${explorerUrl}/tx/${result.txHash}`,
          gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
          executionTimeMs: Date.now() - startTime,
          profitDestination: {
            address: walletAddress,
            source: profitSource,
          },
          message: `🚀 TX sent${network === 'ethereum' ? ' via Flashbots' : ''}: ${result.txHash.slice(0,10)}... Profits → ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`,
          trade: {
            tokenIn,
            tokenOut,
            amountIn,
            sourceDex,
            targetDex,
            slippage: `${slippageTolerance}%`,
          },
        };
      }

      return new Response(JSON.stringify(responsePayload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (execError) {
      console.error('Transaction execution failed:', execError);

      if (transaction) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
      }

      if (oppId) {
        await supabase
          .from('arbitrage_opportunities')
          .update({ status: 'failed' })
          .eq('id', oppId);
      }

      let statusCode = 500;
      let errorDetails = execError instanceof Error ? execError.message : 'Unknown error';
      let hint: string | null = null;

      if (typeof errorDetails === 'string' && errorDetails.includes('insufficient funds')) {
        statusCode = 402; // payment required / not enough balance
        hint = 'Check the DEPLOYER_PRIVATE_KEY account balance and fund it with native gas currency before retrying.';
      }

      const responsePayload: any = {
        success: false,
        error: 'Transaction execution failed',
        details: errorDetails,
        transactionData: txData,
        network,
        executionTimeMs: Date.now() - startTime,
      };
      if (hint) responsePayload.hint = hint;

      return new Response(JSON.stringify(responsePayload), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Flash loan execution error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
