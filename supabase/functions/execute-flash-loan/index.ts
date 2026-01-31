import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deployed FlashArbExecutor contract addresses
const FLASH_ARB_EXECUTOR: Record<string, string> = {
  ethereum: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  arbitrum: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
  polygon: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  bsc: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  optimism: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  base: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  avalanche: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
};

// Aave V3 Flash Loan Pool addresses
const AAVE_POOL_ADDRESSES: Record<string, string> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  bsc: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

// Chain IDs
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  bsc: 56,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
};

// DEX Router addresses
const DEX_ROUTERS: Record<string, Record<string, string>> = {
  ethereum: {
    uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  },
  arbitrum: {
    uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
  polygon: {
    quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
  bsc: {
    pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
  optimism: {
    uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    velodrome: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
  },
  base: {
    uniswap_v3: '0x2626664c2603336E57B271c5C0b26F421741e481',
    aerodrome: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
  },
  avalanche: {
    trader_joe: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    pangolin: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
  },
};

// Token addresses
const TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeACB5BE1023a',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  },
  polygon: {
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
  bsc: {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  },
  optimism: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD96a8f233a91',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  base: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF',
  },
  avalanche: {
    WAVAX: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
  },
};

interface FlashLoanRequest {
  network: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  sourceDex: string;
  targetDex: string;
  slippageTolerance: number;
  walletAddress: string;
  useGelato?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: FlashLoanRequest = await req.json();
    const { network, tokenIn, tokenOut, amountIn, sourceDex, targetDex, slippageTolerance, walletAddress, useGelato } = body;

    // Validate network
    if (!FLASH_ARB_EXECUTOR[network]) {
      return new Response(JSON.stringify({ error: `Unsupported network: ${network}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get token addresses
    const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenIn];
    const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOut];

    if (!tokenInAddress || !tokenOutAddress) {
      return new Response(JSON.stringify({ error: `Token not supported on ${network}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build flash loan transaction data targeting our deployed FlashArbExecutor
    const flashLoanData = buildFlashLoanCalldata({
      executorAddress: FLASH_ARB_EXECUTOR[network],
      poolAddress: AAVE_POOL_ADDRESSES[network],
      asset: tokenInAddress,
      amount: amountIn,
      params: encodeArbitrageParams({
        sourceDex,
        targetDex,
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        slippageTolerance,
        dexRouters: DEX_ROUTERS[network],
      }),
    });

    // Create opportunity record
    const { data: opportunity, error: oppError } = await supabase
      .from('arbitrage_opportunities')
      .insert({
        user_id: user.id,
        type: 'flash_loan',
        source_network: network,
        source_dex: sourceDex,
        target_dex: targetDex,
        token_in: tokenIn,
        token_out: tokenOut,
        amount_in: parseFloat(amountIn),
        profit_percent: 0,
        profit_usd: 0,
        gas_estimate: '0',
        net_profit: 0,
        confidence: 85,
        route: [tokenIn, tokenOut],
        status: 'executing',
      })
      .select()
      .single();

    if (oppError) {
      console.error('Error creating opportunity:', oppError);
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        opportunity_id: opportunity?.id,
        type: 'flash_loan',
        status: 'pending',
        network: network,
        is_gasless: useGelato || false,
        is_submarine: false,
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
    }

    // If using Gelato for gasless execution
    if (useGelato) {
      const gelatoApiKey = Deno.env.get('GELATO_API_KEY');
      if (gelatoApiKey) {
        try {
          const gelatoResult = await sponsoredCallWithGelato(
            gelatoApiKey,
            CHAIN_IDS[network],
            FLASH_ARB_EXECUTOR[network],
            flashLoanData.calldata
          );
          
          // Update transaction with Gelato task ID
          await supabase
            .from('transactions')
            .update({ hash: gelatoResult.taskId })
            .eq('id', transaction?.id);

          return new Response(JSON.stringify({
            success: true,
            taskId: gelatoResult.taskId,
            opportunityId: opportunity?.id,
            transactionId: transaction?.id,
            executorAddress: FLASH_ARB_EXECUTOR[network],
            isGasless: true,
            message: 'Flash loan arbitrage submitted via Gelato Relay',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (gelatoError) {
          console.error('Gelato relay failed:', gelatoError);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      transactionData: flashLoanData,
      opportunityId: opportunity?.id,
      transactionId: transaction?.id,
      executorAddress: FLASH_ARB_EXECUTOR[network],
      poolAddress: AAVE_POOL_ADDRESSES[network],
      estimatedGas: '500000',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Flash loan execution error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface FlashLoanCalldata {
  executorAddress: string;
  poolAddress: string;
  asset: string;
  amount: string;
  params: string;
}

function buildFlashLoanCalldata(params: FlashLoanCalldata): { to: string; calldata: string } {
  const { executorAddress, poolAddress, asset, amount, params: arbitrageParams } = params;
  
  // FlashArbExecutor.executeArbitrage function signature
  const functionSignature = '0x8f39d7e3';
  
  return {
    to: executorAddress,
    calldata: JSON.stringify({
      function: 'executeArbitrage',
      signature: functionSignature,
      params: {
        aavePool: poolAddress,
        asset,
        amount,
        arbitrageParams,
      },
    }),
  };
}

interface ArbitrageParams {
  sourceDex: string;
  targetDex: string;
  tokenIn: string;
  tokenOut: string;
  slippageTolerance: number;
  dexRouters: Record<string, string>;
}

function encodeArbitrageParams(params: ArbitrageParams): string {
  return btoa(JSON.stringify(params));
}

async function sponsoredCallWithGelato(
  gelatoApiKey: string,
  chainId: number,
  target: string,
  data: string
): Promise<{ taskId: string }> {
  const response = await fetch("https://api.gelato.digital/relays/v2/sponsored-call", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sponsorApiKey: gelatoApiKey,
      chainId,
      target,
      data,
      retries: 3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gelato API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  return { taskId: result.taskId };
}
