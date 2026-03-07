import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  RPC_ENDPOINTS,
  CHAIN_IDS,
  BLOCK_TIMES,
  GAS_LIMITS,
  CONTRACT_ADDRESSES,
  AAVE_POOLS,
  DEX_CONFIGS,
  TOKEN_ADDRESSES,
  PRIORITY_PAIRS,
  SCANNER_CONFIG,
  EXPLORER_URLS,
} from "../_shared/mainnet-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  networks: string[];
  minProfitPercent?: number;
  minProfitUsd?: number;
  maxConcurrent?: number;
}

// Price data from DEX pools
interface PriceData {
  dex: string;
  price: number;
  liquidity: number;
  poolAddress: string;
  feeTier?: number;
  // Debug info
  reserve0?: number;
  reserve1?: number;
  token0Symbol?: string;
  token1Symbol?: string;
}

interface ArbitrageOpportunity {
  id: string;
  type: 'flash_loan' | 'flash_swap' | 'cross_chain';
  sourceNetwork: string;
  targetNetwork?: string;
  sourceDex: string;
  targetDex: string;
  tokenIn: string;
  tokenOut: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: string;
  amountInUsd: number;
  profitPercent: number;
  profitUsd: number;
  gasEstimate: string;
  gasEstimateUsd: number;
  netProfit: number;
  confidence: number;
  timestamp: number;
  route: string[];
  isSubmarine: boolean;
  executorAddress: string;
  poolAddresses: { buy: string; sell: string };
  liquidityUsd: number;
  blockNumber: number;
  // Debug/analysis fields
  rawSpread?: number;
  slippageLoss?: number;
  realProfitAfterSlippage?: number;
  gasEstimateGwei?: number;
  flashLoanFeePercent?: number;
  debugInfo?: Record<string, unknown>;
}

// ============================================================
// DEBUG MODE - Set to true for detailed logging
// ============================================================
const DEBUG_MODE = true;

function debugLog(...args: unknown[]) {
  if (DEBUG_MODE) {
    console.log(`[DEBUG]`, ...args);
  }
}

// ============================================================
// NETWORK-SPECIFIC GAS LIMITS (realistic estimates)
// ============================================================
const NETWORK_GAS_LIMITS: Record<string, {
  flashLoan: number;
  swap: number;
  flashSwap: number;
}> = {
  ethereum: { flashLoan: 350000, swap: 150000, flashSwap: 300000 },
  arbitrum: { flashLoan: 500000, swap: 200000, flashSwap: 400000 },
  polygon: { flashLoan: 400000, swap: 180000, flashSwap: 350000 },
  bsc: { flashLoan: 350000, swap: 150000, flashSwap: 300000 },
  optimism: { flashLoan: 450000, swap: 180000, flashSwap: 380000 },
  base: { flashLoan: 450000, swap: 180000, flashSwap: 380000 },
  avalanche: { flashLoan: 400000, swap: 180000, flashSwap: 350000 },
};

// ============================================================
// TOKEN-SPECIFIC FLASH LOAN FEES (basis points)
// ============================================================
const FLASH_LOAN_FEES: Record<string, number> = {
  // Stablecoins - lower fees
  'USDC': 2, 'USDT': 2, 'DAI': 2, 'FRAX': 3, 'LUSD': 3, 'BUSD': 2,
  // ETH and wrapped
  'WETH': 3, 'ETH': 3, 'WBTC': 5, 'renBTC': 5,
  // LSDs
  'stETH': 4, 'wstETH': 4, 'rETH': 4, 'cbETH': 4,
  // DeFi tokens
  'LINK': 5, 'UNI': 5, 'AAVE': 5, 'CRV': 5, 'LDO': 5,
  'MKR': 5, 'COMP': 5, 'SNX': 5, 'BAL': 5,
  // L2 tokens
  'MATIC': 5, 'ARB': 5, 'OP': 5,
  // Default
  'default': 5,
};

function getFlashLoanFee(token: string): number {
  return FLASH_LOAN_FEES[token] || FLASH_LOAN_FEES['default'];
}

// ============================================================
// TOKEN PRICES (fallback - should be fetched from oracle)
// ============================================================
const TOKEN_USD_PRICES: Record<string, number> = {
  'WETH': 3500, 'ETH': 3500,
  'WBTC': 65000, 'renBTC': 64000,
  'USDC': 1, 'USDT': 1, 'DAI': 1, 'FRAX': 1, 'LUSD': 1, 'BUSD': 1,
  'LINK': 15, 'UNI': 10, 'AAVE': 200, 'CRV': 0.3, 'LDO': 2,
  'MKR': 1500, 'COMP': 50, 'SNX': 2, 'BAL': 3,
  'MATIC': 0.8, 'ARB': 1.2, 'OP': 2,
  'stETH': 3400, 'wstETH': 3500, 'rETH': 3400, 'cbETH': 3400,
};

function getTokenPrice(token: string): number {
  return TOKEN_USD_PRICES[token] || 1;
}

// ============================================================
// RPC CALLS WITH ENHANCED ERROR HANDLING
// ============================================================

async function rpcCall(
  network: string,
  method: string,
  params: unknown[],
  timeout: number = SCANNER_CONFIG.rpcTimeoutMs
): Promise<unknown> {
  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) throw new Error(`No RPC for ${network}`);

  let lastError: Error | null = null;
  
  for (let i = 0; i < Math.min(rpcs.length, SCANNER_CONFIG.maxRetries + 1); i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      debugLog(`RPC call to ${rpcs[i]}: ${method}`);
      
      const response = await fetch(rpcs[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      
      return data.result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      debugLog(`RPC error (attempt ${i + 1}):`, lastError.message);
    }
  }
  
  throw lastError || new Error('RPC call failed');
}

// Get current block number
async function getBlockNumber(network: string): Promise<number> {
  try {
    const result = await rpcCall(network, 'eth_blockNumber', []);
    return parseInt(result as string, 16);
  } catch {
    return 0;
  }
}

// Get current gas price
async function getGasPrice(network: string): Promise<number> {
  try {
    const result = await rpcCall(network, 'eth_gasPrice', []);
    return parseInt(result as string, 16) / 1e9;
  } catch {
    return GAS_LIMITS[network]?.target || 30;
  }
}

// Get V2 pair address from factory
async function getV2PairAddress(
  network: string,
  factory: string,
  tokenA: string,
  tokenB: string
): Promise<string | null> {
  try {
    const result = await rpcCall(network, 'eth_call', [{
      to: factory,
      data: '0xe6a43905' +
        tokenA.slice(2).padStart(64, '0') +
        tokenB.slice(2).padStart(64, '0')
    }, 'latest']);
    
    if (!result || result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }
    
    return '0x' + (result as string).slice(26);
  } catch {
    return null;
  }
}

// Fetch V2 price from pair reserves
async function fetchV2Price(
  network: string,
  pairAddress: string,
  token0Decimals: number,
  token1Decimals: number
): Promise<{ price: number; liquidity: number } | null> {
  try {
    const result = await rpcCall(network, 'eth_call', [{
      to: pairAddress,
      data: '0x0902f1ac'
    }, 'latest']);
    
    if (!result || result === '0x') return null;
    
    const data = result as string;
    const reserve0 = BigInt('0x' + data.slice(2, 66));
    const reserve1 = BigInt('0x' + data.slice(66, 130));
    
    if (reserve0 === 0n || reserve1 === 0n) return null;
    
    const price = Number(reserve1) / Number(reserve0) * Math.pow(10, token0Decimals - token1Decimals);
    const liquidity = Number(reserve0) * Number(reserve1);
    
    return { price, liquidity: Math.sqrt(liquidity) };
  } catch {
    return null;
  }
}

// Get V3 pool address from factory
async function getV3PoolAddress(
  network: string,
  factory: string,
  tokenA: string,
  tokenB: string,
  fee: number
): Promise<string | null> {
  try {
    const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
      ? [tokenA, tokenB] 
      : [tokenB, tokenA];
    
    const result = await rpcCall(network, 'eth_call', [{
      to: factory,
      data: '0x5e1ef9ea' +
        token0.slice(2).padStart(64, '0') +
        token1.slice(2).padStart(64, '0') +
        fee.toString(16).padStart(64, '0')
    }, 'latest']);
    
    if (!result || result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null;
    }
    
    return '0x' + (result as string).slice(26);
  } catch {
    return null;
  }
}

// Fetch V3 price from slot0
async function fetchV3Price(
  network: string,
  poolAddress: string,
  token0Decimals: number,
  token1Decimals: number
): Promise<{ price: number; liquidity: number } | null> {
  try {
    const slot0Result = await rpcCall(network, 'eth_call', [
      { to: poolAddress, data: '0x3850c7bd' },
      'latest'
    ]);
    
    if (!slot0Result || slot0Result === '0x') return null;
    
    const sqrtPriceX96 = BigInt('0x' + (slot0Result as string).slice(2, 66));
    
    const price = (Number(sqrtPriceX96) ** 2 / (2 ** 192)) * 
      (10 ** (token0Decimals - token1Decimals));
    
    const liqResult = await rpcCall(network, 'eth_call', [
      { to: poolAddress, data: '0x1a686502' },
      'latest'
    ]);
    
    const liquidity = liqResult ? Number(BigInt(liqResult as string)) : 1000000;
    
    return { price, liquidity };
  } catch {
    return null;
  }
}

// Scan all DEXs for a token pair
async function scanPairPrices(
  network: string,
  tokenIn: string,
  tokenOut: string
): Promise<PriceData[]> {
  const prices: PriceData[] = [];
  const dexes = DEX_CONFIGS[network];
  const tokens = TOKEN_ADDRESSES[network];
  
  if (!dexes || !tokens) return prices;
  
  const tokenInData = tokens[tokenIn];
  const tokenOutData = tokens[tokenOut];
  if (!tokenInData || !tokenOutData) return prices;
  
  const promises: Promise<void>[] = [];
  
  for (const [dexName, dexConfig] of Object.entries(dexes)) {
    if (dexConfig.type === 'v2') {
      promises.push((async () => {
        const pairAddress = await getV2PairAddress(
          network, dexConfig.factory, tokenInData.address, tokenOutData.address
        );
        if (pairAddress) {
          const priceData = await fetchV2Price(
            network, pairAddress, tokenInData.decimals, tokenOutData.decimals
          );
          if (priceData) {
            prices.push({
              dex: dexName,
              ...priceData,
              poolAddress: pairAddress,
            });
          }
        }
      })());
    } else if (dexConfig.type === 'v3' && dexConfig.fees) {
      for (const fee of dexConfig.fees) {
        promises.push((async () => {
          const poolAddress = await getV3PoolAddress(
            network, dexConfig.factory, tokenInData.address, tokenOutData.address, fee
          );
          if (poolAddress) {
            const priceData = await fetchV3Price(
              network, poolAddress, tokenInData.decimals, tokenOutData.decimals
            );
            if (priceData) {
              prices.push({
                dex: `${dexName}_${fee / 100}bps`,
                ...priceData,
                poolAddress,
                feeTier: fee,
              });
            }
          }
        })());
      }
    }
  }
  
  await Promise.all(promises);
  return prices;
}

// Fetch ETH price from CoinGecko
async function fetchEthPrice(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    );
    const data = await response.json();
    return data.ethereum?.usd || 3500;
  } catch {
    return 3500;
  }
}

// Calculate arbitrage opportunity from prices
async function calculateOpportunity(
  network: string,
  tokenIn: string,
  tokenOut: string,
  prices: PriceData[],
  gasPrice: number,
  blockNumber: number,
  minProfitPercent: number,
  minProfitUsd: number
): Promise<ArbitrageOpportunity | null> {
  if (prices.length < 2) return null;
  
  const tokens = TOKEN_ADDRESSES[network];
  const contracts = CONTRACT_ADDRESSES[network];
  const gasLimits = GAS_LIMITS[network];
  
  if (!tokens || !contracts) return null;
  
  let bestBuy = prices[0];
  let bestSell = prices[0];
  
  for (const p of prices) {
    if (p.price < bestBuy.price) bestBuy = p;
    if (p.price > bestSell.price) bestSell = p;
  }
  
  if (bestBuy.dex === bestSell.dex) return null;
  
  const spread = (bestSell.price - bestBuy.price) / bestBuy.price;
  const spreadPercent = spread * 100;
  
  if (spreadPercent < minProfitPercent) return null;
  
  const minLiquidity = Math.min(bestBuy.liquidity, bestSell.liquidity);
  const tradeAmountUsd = Math.min(
    SCANNER_CONFIG.defaultTradeAmountUsd,
    minLiquidity * 0.1
  );
  
  const tokenInDecimals = tokens[tokenIn].decimals;
  const tokenInAmount = tradeAmountUsd / bestBuy.price;
  const amountInWei = BigInt(Math.floor(tokenInAmount * (10 ** tokenInDecimals)));
  
  // Filter out zero amounts (rounding issue with high-price tokens)
  if (amountInWei <= 0n) return null;
  const gasUsed = 500000;
  const gasCostGwei = gasUsed * gasPrice;
  const ethPrice = await fetchEthPrice();
  const gasCostUsd = (gasCostGwei / 1e9) * ethPrice;
  
  const grossProfitUsd = tradeAmountUsd * spread;
  const flashLoanFee = tradeAmountUsd * 0.0009;
  const netProfitUsd = grossProfitUsd - gasCostUsd - flashLoanFee;
  
  if (netProfitUsd < minProfitUsd) return null;
  
  const liquidityScore = Math.min(minLiquidity / 100000, 1) * 30;
  const spreadScore = Math.min(spreadPercent / 2, 1) * 40;
  const gasSafetyScore = gasPrice < gasLimits.target ? 30 : (gasPrice < gasLimits.max ? 20 : 10);
  const confidence = Math.min(liquidityScore + spreadScore + gasSafetyScore, 98);
  
  if (confidence < SCANNER_CONFIG.minConfidence) return null;
  
  return {
    id: `${network}-${tokenIn}-${tokenOut}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'flash_loan',
    sourceNetwork: network,
    sourceDex: bestBuy.dex,
    targetDex: bestSell.dex,
    tokenIn,
    tokenOut,
    tokenInAddress: tokens[tokenIn].address,
    tokenOutAddress: tokens[tokenOut].address,
    amountIn: amountInWei.toString(),
    amountInUsd: tradeAmountUsd,
    profitPercent: spreadPercent,
    profitUsd: grossProfitUsd,
    gasEstimate: `$${gasCostUsd.toFixed(2)}`,
    gasEstimateUsd: gasCostUsd,
    netProfit: netProfitUsd,
    confidence,
    timestamp: Date.now(),
    route: [tokenIn, tokenOut],
    isSubmarine: SCANNER_CONFIG.useSubmarineTransactions,
    executorAddress: contracts.flashArbExecutor,
    poolAddresses: { buy: bestBuy.poolAddress, sell: bestSell.poolAddress },
    liquidityUsd: minLiquidity,
    blockNumber,
  };
}

// Scan a single network for opportunities
async function scanNetwork(
  network: string,
  minProfitPercent: number,
  minProfitUsd: number
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];
  const pairs = PRIORITY_PAIRS[network];
  
  if (!pairs?.length) return opportunities;
  
  try {
    const [blockNumber, gasPrice] = await Promise.all([
      getBlockNumber(network),
      getGasPrice(network),
    ]);
    
    const gasLimits = GAS_LIMITS[network];
    if (gasPrice > gasLimits.max) {
      console.log(`${network}: Gas too high (${gasPrice.toFixed(2)} gwei > ${gasLimits.max})`);
      return opportunities;
    }
    
    const batchSize = SCANNER_CONFIG.maxConcurrentPairs;
    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async ([tokenIn, tokenOut]) => {
          try {
            const prices = await scanPairPrices(network, tokenIn, tokenOut);
            return await calculateOpportunity(
              network, tokenIn, tokenOut, prices, 
              gasPrice, blockNumber, minProfitPercent, minProfitUsd
            );
          } catch (error) {
            console.error(`Error scanning ${tokenIn}/${tokenOut} on ${network}:`, error);
            return null;
          }
        })
      );
      
      for (const opp of batchResults) {
        if (opp) opportunities.push(opp);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${network}:`, error);
  }
  
  return opportunities;
}

// Auto-execute high-confidence opportunities
async function autoExecuteOpportunity(opportunity: ArbitrageOpportunity): Promise<{
  success: boolean;
  taskId?: string;
  error?: string;
  preparedTx?: { to: string; data: string; chainId: number; gasLimit: number };
}> {
  const GELATO_API_KEY = Deno.env.get('GELATO_API_KEY');
  if (!GELATO_API_KEY) {
    return { success: false, error: 'GELATO_API_KEY not configured' };
  }

  const contracts = CONTRACT_ADDRESSES[opportunity.sourceNetwork];
  const aavePool = AAVE_POOLS[opportunity.sourceNetwork];
  
  if (!contracts || !aavePool) {
    return { success: false, error: 'Network not supported for execution' };
  }

  try {
    console.log(`🚀 Auto-executing opportunity: ${opportunity.id}`);
    console.log(`   Profit: ${opportunity.profitPercent.toFixed(2)}% ($${opportunity.netProfit.toFixed(2)} net)`);
    console.log(`   Route: ${opportunity.tokenIn} → ${opportunity.tokenOut} on ${opportunity.sourceNetwork}`);
    console.log(`   DEXs: Buy on ${opportunity.sourceDex}, Sell on ${opportunity.targetDex}`);

    const tradeAmountWei = BigInt(Math.floor(10000 * (10 ** 18))).toString(16).padStart(64, '0');
    const minProfitWei = BigInt(Math.floor(opportunity.netProfit * 0.8 * (10 ** 18))).toString(16).padStart(64, '0');
    
    const functionSelector = '0x8f39d7e3';
    const calldata = functionSelector +
      opportunity.tokenInAddress.slice(2).padStart(64, '0') +
      opportunity.tokenOutAddress.slice(2).padStart(64, '0') +
      tradeAmountWei +
      minProfitWei +
      opportunity.poolAddresses.buy.slice(2).padStart(64, '0') +
      opportunity.poolAddresses.sell.slice(2).padStart(64, '0');

    let result;
    let gelatoResponse;
    
    gelatoResponse = await fetch('https://relay.gelato.digital/relays/v2/sponsored-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId: CHAIN_IDS[opportunity.sourceNetwork],
        target: contracts.flashArbExecutor,
        data: calldata,
        sponsorApiKey: GELATO_API_KEY,
        retries: 3,
        isPrivate: true,
      }),
    });

    result = await gelatoResponse.json();
    
    if (!gelatoResponse.ok || !result.taskId) {
      console.log('Sponsored call failed, trying sync-fee relay...');
      
      gelatoResponse = await fetch('https://relay.gelato.digital/relays/v2/call-with-sync-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: CHAIN_IDS[opportunity.sourceNetwork],
          target: contracts.flashArbExecutor,
          data: calldata,
          feeToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          isRelayContext: true,
          retries: 3,
        }),
      });

      result = await gelatoResponse.json();
    }
    
    if (gelatoResponse.ok && result.taskId) {
      console.log(`✅ Auto-execution submitted: ${result.taskId}`);
      return { success: true, taskId: result.taskId };
    } else {
      console.log('Gelato relay failed, returning prepared tx data');
      return { 
        success: false, 
        error: result.message || 'Relay not available',
        preparedTx: {
          to: contracts.flashArbExecutor,
          data: calldata,
          chainId: CHAIN_IDS[opportunity.sourceNetwork],
          gasLimit: 500000,
        }
      };
    }
  } catch (error) {
    console.error('❌ Auto-execution error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check if opportunity qualifies for auto-execution
function shouldAutoExecute(opportunity: ArbitrageOpportunity): boolean {
  if (!SCANNER_CONFIG.autoExecuteEnabled) return false;
  
  return (
    opportunity.profitPercent >= SCANNER_CONFIG.autoExecuteMinProfitPercent &&
    opportunity.confidence >= SCANNER_CONFIG.autoExecuteMinConfidence &&
    opportunity.netProfit >= SCANNER_CONFIG.autoExecuteMinNetProfitUsd
  );
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: ScanRequest = await req.json();
    const {
      networks,
      minProfitPercent = SCANNER_CONFIG.minProfitPercent,
      minProfitUsd = SCANNER_CONFIG.minProfitUsd,
    } = body;

    const validNetworks = networks.filter(n => RPC_ENDPOINTS[n]);
    if (validNetworks.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No valid networks provided',
        validNetworks: Object.keys(RPC_ENDPOINTS),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const scanResults = await Promise.all(
      validNetworks.map(network => scanNetwork(network, minProfitPercent, minProfitUsd))
    );

    const allOpportunities = scanResults
      .flat()
      .sort((a, b) => b.netProfit - a.netProfit);

    const autoExecuteResults: Array<{
      opportunityId: string;
      network: string;
      tokenPair: string;
      profitPercent: number;
      netProfit: number;
      success: boolean;
      taskId?: string;
      error?: string;
    }> = [];

    const qualifiedOpportunities = allOpportunities.filter(shouldAutoExecute);
    
    if (qualifiedOpportunities.length > 0) {
      console.log(`🎯 Found ${qualifiedOpportunities.length} opportunities qualifying for auto-execution`);
      
      const topOpportunities = qualifiedOpportunities.slice(0, 3);
      const execPromises = topOpportunities.map(async (opp) => {
        const result = await autoExecuteOpportunity(opp);
        return {
          opportunityId: opp.id,
          network: opp.sourceNetwork,
          tokenPair: `${opp.tokenIn}/${opp.tokenOut}`,
          profitPercent: opp.profitPercent,
          netProfit: opp.netProfit,
          ...result,
        };
      });

      const execResults = await Promise.all(execPromises);
      autoExecuteResults.push(...execResults);
    }

    const scanDuration = Date.now() - startTime;
    const networkStats = validNetworks.map((network, i) => ({
      network,
      opportunitiesFound: scanResults[i].length,
      blockTime: BLOCK_TIMES[network],
    }));

    return new Response(JSON.stringify({
      success: true,
      opportunities: allOpportunities.slice(0, 50),
      autoExecution: {
        enabled: SCANNER_CONFIG.autoExecuteEnabled,
        minProfitPercent: SCANNER_CONFIG.autoExecuteMinProfitPercent,
        minConfidence: SCANNER_CONFIG.autoExecuteMinConfidence,
        qualifiedCount: qualifiedOpportunities.length,
        executedCount: autoExecuteResults.length,
        results: autoExecuteResults,
      },
      stats: {
        scannedNetworks: validNetworks.length,
        totalPairsScanned: validNetworks.reduce((acc, n) => acc + (PRIORITY_PAIRS[n]?.length || 0), 0),
        totalOpportunities: allOpportunities.length,
        scanDurationMs: scanDuration,
        timestamp: Date.now(),
      },
      networkStats,
      config: {
        minProfitPercent,
        minProfitUsd,
        autoExecuteMinProfitPercent: SCANNER_CONFIG.autoExecuteMinProfitPercent,
        submarineEnabled: SCANNER_CONFIG.useSubmarineTransactions,
        privateMempool: SCANNER_CONFIG.usePrivateMempool,
      },
      contracts: CONTRACT_ADDRESSES,
      aavePools: AAVE_POOLS,
      explorers: EXPLORER_URLS,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scanner error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
      scanDurationMs: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

