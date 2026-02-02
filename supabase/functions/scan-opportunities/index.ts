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

interface PriceData {
  dex: string;
  price: number;
  liquidity: number;
  poolAddress: string;
  feeTier?: number;
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
}

// Fast RPC call with timeout and fallback
async function rpcCall(
  network: string,
  method: string,
  params: unknown[],
  timeout: number = SCANNER_CONFIG.rpcTimeoutMs
): Promise<unknown> {
  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) throw new Error(`No RPC for ${network}`);

  for (let i = 0; i < Math.min(rpcs.length, SCANNER_CONFIG.maxRetries + 1); i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(rpcs[i], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.result !== undefined) return data.result;
    } catch {
      clearTimeout(timeoutId);
    }
  }
  throw new Error(`RPC failed for ${network}`);
}

// Get current block number
async function getBlockNumber(network: string): Promise<number> {
  const result = await rpcCall(network, 'eth_blockNumber', []);
  return parseInt(result as string, 16);
}

// Get current gas price
async function getGasPrice(network: string): Promise<number> {
  const result = await rpcCall(network, 'eth_gasPrice', []);
  return parseInt(result as string, 16) / 1e9; // Convert to gwei
}

// Get Uniswap V2 pair address
async function getV2PairAddress(
  network: string,
  factoryAddress: string,
  token0: string,
  token1: string
): Promise<string | null> {
  try {
    const data = '0xe6a43905' + 
      token0.slice(2).padStart(64, '0') + 
      token1.slice(2).padStart(64, '0');
    
    const result = await rpcCall(network, 'eth_call', [{ to: factoryAddress, data }, 'latest']);
    if (!result || result === '0x') return null;
    
    const address = '0x' + (result as string).slice(26);
    if (address === '0x0000000000000000000000000000000000000000') return null;
    
    return address;
  } catch {
    return null;
  }
}

// Get Uniswap V3 pool address
async function getV3PoolAddress(
  network: string,
  factoryAddress: string,
  token0: string,
  token1: string,
  fee: number
): Promise<string | null> {
  try {
    const data = '0x1698ee82' + 
      token0.slice(2).padStart(64, '0') + 
      token1.slice(2).padStart(64, '0') + 
      fee.toString(16).padStart(64, '0');
    
    const result = await rpcCall(network, 'eth_call', [{ to: factoryAddress, data }, 'latest']);
    if (!result || result === '0x') return null;
    
    const address = '0x' + (result as string).slice(26);
    if (address === '0x0000000000000000000000000000000000000000') return null;
    
    return address;
  } catch {
    return null;
  }
}

// Fetch V2 price and reserves
async function fetchV2Price(
  network: string,
  pairAddress: string,
  token0Decimals: number,
  token1Decimals: number
): Promise<{ price: number; liquidity: number } | null> {
  try {
    const result = await rpcCall(network, 'eth_call', [
      { to: pairAddress, data: '0x0902f1ac' },
      'latest'
    ]);
    
    if (!result || result === '0x') return null;
    
    const hex = (result as string).slice(2);
    const reserve0 = BigInt('0x' + hex.slice(0, 64));
    const reserve1 = BigInt('0x' + hex.slice(64, 128));
    
    const amount0 = Number(reserve0) / (10 ** token0Decimals);
    const amount1 = Number(reserve1) / (10 ** token1Decimals);
    
    if (amount0 === 0 || amount1 === 0) return null;
    
    return {
      price: amount1 / amount0,
      liquidity: Math.min(amount0, amount1) * 2,
    };
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
    // Get slot0 for sqrtPriceX96
    const slot0Result = await rpcCall(network, 'eth_call', [
      { to: poolAddress, data: '0x3850c7bd' },
      'latest'
    ]);
    
    if (!slot0Result || slot0Result === '0x') return null;
    
    const sqrtPriceX96 = BigInt('0x' + (slot0Result as string).slice(2, 66));
    
    // Calculate price from sqrtPriceX96
    const price = (Number(sqrtPriceX96) ** 2 / (2 ** 192)) * 
      (10 ** (token0Decimals - token1Decimals));
    
    // Get liquidity
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

// Calculate arbitrage opportunity from prices
function calculateOpportunity(
  network: string,
  tokenIn: string,
  tokenOut: string,
  prices: PriceData[],
  gasPrice: number,
  blockNumber: number,
  minProfitPercent: number,
  minProfitUsd: number
): ArbitrageOpportunity | null {
  if (prices.length < 2) return null;
  
  const tokens = TOKEN_ADDRESSES[network];
  const contracts = CONTRACT_ADDRESSES[network];
  const gasLimits = GAS_LIMITS[network];
  
  if (!tokens || !contracts) return null;
  
  // Find best buy (lowest price) and sell (highest price)
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
  
  // Calculate trade size based on liquidity
  const minLiquidity = Math.min(bestBuy.liquidity, bestSell.liquidity);
  const tradeAmountUsd = Math.min(
    SCANNER_CONFIG.defaultTradeAmountUsd,
    minLiquidity * 0.1 // Max 10% of liquidity
  );
  
  // Estimate gas cost
  const gasUsed = 500000; // Approximate gas for flash loan arb
  const gasCostGwei = gasUsed * gasPrice;
  const ethPrice = 2500; // TODO: Fetch real ETH price
  const gasCostUsd = (gasCostGwei / 1e9) * ethPrice;
  
  // Calculate profits
  const grossProfitUsd = tradeAmountUsd * spread;
  const flashLoanFee = tradeAmountUsd * 0.0009; // Aave 0.09% fee
  const netProfitUsd = grossProfitUsd - gasCostUsd - flashLoanFee;
  
  if (netProfitUsd < minProfitUsd) return null;
  
  // Calculate confidence based on spread and liquidity
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
    // Get current block and gas price in parallel
    const [blockNumber, gasPrice] = await Promise.all([
      getBlockNumber(network),
      getGasPrice(network),
    ]);
    
    // Check if gas price is acceptable
    const gasLimits = GAS_LIMITS[network];
    if (gasPrice > gasLimits.max) {
      console.log(`${network}: Gas too high (${gasPrice.toFixed(2)} gwei > ${gasLimits.max})`);
      return opportunities;
    }
    
    // Scan pairs in parallel batches
    const batchSize = SCANNER_CONFIG.maxConcurrentPairs;
    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async ([tokenIn, tokenOut]) => {
          try {
            const prices = await scanPairPrices(network, tokenIn, tokenOut);
            return calculateOpportunity(
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

serve(async (req) => {
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

    // Validate networks
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

    // Scan all networks in parallel
    const scanResults = await Promise.all(
      validNetworks.map(network => scanNetwork(network, minProfitPercent, minProfitUsd))
    );

    // Flatten and sort by profit
    const allOpportunities = scanResults
      .flat()
      .sort((a, b) => b.netProfit - a.netProfit);

    // Performance metrics
    const scanDuration = Date.now() - startTime;
    const networkStats = validNetworks.map((network, i) => ({
      network,
      opportunitiesFound: scanResults[i].length,
      blockTime: BLOCK_TIMES[network],
    }));

    return new Response(JSON.stringify({
      success: true,
      opportunities: allOpportunities.slice(0, 50), // Top 50 opportunities
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
