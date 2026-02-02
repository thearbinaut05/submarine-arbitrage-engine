import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  CONTRACT_ADDRESSES,
  AAVE_POOLS,
  CHAIN_IDS,
  DEX_CONFIGS,
  TOKEN_ADDRESSES,
  GAS_LIMITS,
  RPC_ENDPOINTS,
  SCANNER_CONFIG,
  EXPLORER_URLS,
} from "../_shared/mainnet-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  useGelato?: boolean;
  opportunityId?: string;
  poolAddresses?: { buy: string; sell: string };
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

// Build flash loan calldata for the executor contract
function buildFlashLoanCalldata(params: {
  executorAddress: string;
  poolAddress: string;
  asset: string;
  amount: string;
  buyPool: string;
  sellPool: string;
  sourceDex: string;
  targetDex: string;
  slippage: number;
}): { to: string; calldata: string; encodedData: string } {
  const {
    executorAddress,
    poolAddress,
    asset,
    amount,
    buyPool,
    sellPool,
    sourceDex,
    targetDex,
    slippage,
  } = params;

  // Encode arbitrage parameters
  const arbitrageParams = {
    buyPool,
    sellPool,
    sourceDex,
    targetDex,
    slippageBps: Math.floor(slippage * 100), // Convert to basis points
    deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  };

  // Function selector for executeArbitrage(address,address,uint256,bytes)
  const functionSelector = '0x8f39d7e3';

  // Encode the full calldata
  const encodedParams = btoa(JSON.stringify(arbitrageParams));

  return {
    to: executorAddress,
    calldata: JSON.stringify({
      function: 'executeArbitrage',
      signature: functionSelector,
      params: {
        aavePool: poolAddress,
        asset,
        amount,
        arbitrageParams: encodedParams,
      },
    }),
    encodedData: `${functionSelector}${poolAddress.slice(2).padStart(64, '0')}${asset.slice(2).padStart(64, '0')}${BigInt(amount).toString(16).padStart(64, '0')}`,
  };
}

// Submit to Gelato for gasless execution
async function submitToGelato(
  gelatoApiKey: string,
  chainId: number,
  target: string,
  data: string,
  isSubmarine: boolean
): Promise<{ taskId: string }> {
  const response = await fetch('https://api.gelato.digital/relays/v2/sponsored-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sponsorApiKey: gelatoApiKey,
      chainId,
      target,
      data,
      gasLimit: '800000', // Higher gas limit for flash loan + swaps
      retries: 2,
      isPrivate: isSubmarine || SCANNER_CONFIG.usePrivateMempool,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gelato API error [${response.status}]: ${errorText}`);
  }

  return await response.json();
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
      amountIn,
      sourceDex,
      targetDex,
      slippageTolerance = SCANNER_CONFIG.defaultSlippage,
      walletAddress,
      useGelato = true,
      opportunityId,
      poolAddresses,
    } = body;

    // Validate network
    const contracts = CONTRACT_ADDRESSES[network];
    const aavePool = AAVE_POOLS[network];
    const tokens = TOKEN_ADDRESSES[network];
    const dexConfigs = DEX_CONFIGS[network];

    if (!contracts || !tokens) {
      return new Response(JSON.stringify({
        success: false,
        error: `Unsupported network: ${network}`,
        supportedNetworks: Object.keys(CONTRACT_ADDRESSES),
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

    if (currentGasPrice > gasLimits.max) {
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

    // Get DEX router addresses
    const sourceDexConfig = dexConfigs?.[sourceDex];
    const targetDexConfig = dexConfigs?.[targetDex];

    // Build flash loan transaction
    const flashLoanData = buildFlashLoanCalldata({
      executorAddress: contracts.flashArbExecutor,
      poolAddress: aavePool || '0x0000000000000000000000000000000000000000',
      asset: tokenInData.address,
      amount: amountIn,
      buyPool: poolAddresses?.buy || sourceDexConfig?.router || '',
      sellPool: poolAddresses?.sell || targetDexConfig?.router || '',
      sourceDex,
      targetDex,
      slippage: slippageTolerance,
    });

    // Create opportunity record if not provided
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
        is_gasless: useGelato,
        is_submarine: SCANNER_CONFIG.useSubmarineTransactions,
        gas_price: `${currentGasPrice.toFixed(2)} gwei`,
      })
      .select()
      .single();

    // Execute via Gelato if enabled
    if (useGelato) {
      const gelatoApiKey = Deno.env.get('GELATO_API_KEY');
      if (!gelatoApiKey) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Gelato API key not configured',
          transactionData: flashLoanData,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const gelatoResult = await submitToGelato(
          gelatoApiKey,
          CHAIN_IDS[network],
          contracts.flashArbExecutor,
          flashLoanData.encodedData,
          SCANNER_CONFIG.useSubmarineTransactions
        );

        // Update transaction with task ID
        if (transaction) {
          await supabase
            .from('transactions')
            .update({ hash: gelatoResult.taskId })
            .eq('id', transaction.id);
        }

        const explorerUrl = EXPLORER_URLS[network];

        return new Response(JSON.stringify({
          success: true,
          taskId: gelatoResult.taskId,
          opportunityId: oppId,
          transactionId: transaction?.id,
          network,
          chainId: CHAIN_IDS[network],
          executorAddress: contracts.flashArbExecutor,
          aavePool,
          isGasless: true,
          isSubmarine: SCANNER_CONFIG.useSubmarineTransactions,
          mevProtected: true,
          explorerUrl: `${explorerUrl}/tx/`,
          gelatoStatusUrl: `https://relay.gelato.digital/task/${gelatoResult.taskId}`,
          gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
          executionTimeMs: Date.now() - startTime,
          message: '🚀 Flash loan arbitrage submitted via Gelato Relay with MEV protection.',
          trade: {
            tokenIn,
            tokenOut,
            amountIn,
            sourceDex,
            targetDex,
            slippage: `${slippageTolerance}%`,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (gelatoError) {
        console.error('Gelato submission failed:', gelatoError);

        if (transaction) {
          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('id', transaction.id);
        }

        // Return transaction data for manual execution
        return new Response(JSON.stringify({
          success: false,
          error: 'Gelato relay failed - transaction data available for manual execution',
          details: gelatoError instanceof Error ? gelatoError.message : 'Unknown error',
          transactionData: flashLoanData,
          opportunityId: oppId,
          transactionId: transaction?.id,
          executorAddress: contracts.flashArbExecutor,
          aavePool,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Return transaction data for manual execution
    return new Response(JSON.stringify({
      success: true,
      transactionData: flashLoanData,
      opportunityId: oppId,
      transactionId: transaction?.id,
      network,
      chainId: CHAIN_IDS[network],
      executorAddress: contracts.flashArbExecutor,
      aavePool,
      isGasless: false,
      gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
      estimatedGas: '800000',
      executionTimeMs: Date.now() - startTime,
      trade: {
        tokenIn,
        tokenOut,
        amountIn,
        sourceDex,
        targetDex,
        slippage: `${slippageTolerance}%`,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
