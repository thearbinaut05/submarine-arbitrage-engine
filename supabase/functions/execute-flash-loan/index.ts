import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Aave V3 Flash Loan Pool addresses
const AAVE_POOL_ADDRESSES: Record<string, string> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
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
    const { network, tokenIn, tokenOut, amountIn, sourceDex, targetDex, slippageTolerance, walletAddress } = body;

    // Validate network
    if (!AAVE_POOL_ADDRESSES[network]) {
      return new Response(JSON.stringify({ error: `Unsupported network: ${network}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build flash loan transaction data
    const flashLoanData = buildFlashLoanCalldata({
      poolAddress: AAVE_POOL_ADDRESSES[network],
      asset: tokenIn,
      amount: amountIn,
      receiverContract: walletAddress, // In production, this would be a deployed flash loan receiver contract
      params: encodeArbitrageParams({
        sourceDex,
        targetDex,
        tokenIn,
        tokenOut,
        slippageTolerance,
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
        profit_percent: 0, // Will be updated after execution
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
        is_gasless: false,
        is_submarine: false,
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
    }

    return new Response(JSON.stringify({
      success: true,
      transactionData: flashLoanData,
      opportunityId: opportunity?.id,
      transactionId: transaction?.id,
      poolAddress: AAVE_POOL_ADDRESSES[network],
      estimatedGas: '500000', // Typical flash loan gas estimate
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
  poolAddress: string;
  asset: string;
  amount: string;
  receiverContract: string;
  params: string;
}

function buildFlashLoanCalldata(params: FlashLoanCalldata): string {
  // This is a simplified calldata builder
  // In production, you would use ethers.js ABI encoding
  const { poolAddress, asset, amount, receiverContract, params: arbitrageParams } = params;
  
  // Aave V3 flashLoanSimple function signature
  const functionSignature = '0x42b0b77c'; // flashLoanSimple(address,address,uint256,bytes,uint16)
  
  return JSON.stringify({
    to: poolAddress,
    data: functionSignature,
    params: {
      receiverAddress: receiverContract,
      asset,
      amount,
      params: arbitrageParams,
      referralCode: 0,
    },
  });
}

interface ArbitrageParams {
  sourceDex: string;
  targetDex: string;
  tokenIn: string;
  tokenOut: string;
  slippageTolerance: number;
}

function encodeArbitrageParams(params: ArbitrageParams): string {
  // Encode arbitrage parameters for the flash loan receiver contract
  return btoa(JSON.stringify(params));
}
