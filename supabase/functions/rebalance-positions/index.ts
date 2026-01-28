import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lending protocol addresses
const LENDING_PROTOCOLS: Record<string, Record<string, string>> = {
  ethereum: {
    aave_v3: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    compound_v3: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  },
  arbitrum: {
    aave_v3: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    radiant: '0x2032b9A8e9F7e76768CA9271003d3e43E1616B1F',
  },
  polygon: {
    aave_v3: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  },
};

interface RebalanceRequest {
  network: string;
  positions: {
    protocol: string;
    action: 'deposit' | 'withdraw' | 'borrow' | 'repay';
    asset: string;
    amount: string;
  }[];
  targetHealthFactor: number;
  walletAddress: string;
  useFlashLoan: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const body: RebalanceRequest = await req.json();
    const { network, positions, targetHealthFactor, walletAddress, useFlashLoan } = body;

    // Validate network
    if (!LENDING_PROTOCOLS[network]) {
      return new Response(JSON.stringify({ error: `Unsupported network: ${network}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build rebalancing transaction bundle
    const transactionBundle = [];
    
    for (const position of positions) {
      const protocolAddress = LENDING_PROTOCOLS[network][position.protocol];
      if (!protocolAddress) {
        continue;
      }

      const tx = buildPositionTransaction(position, protocolAddress, walletAddress);
      transactionBundle.push(tx);
    }

    // If using flash loan, wrap the bundle
    let finalTransaction;
    if (useFlashLoan) {
      finalTransaction = wrapWithFlashLoan(transactionBundle, network);
    } else {
      finalTransaction = transactionBundle;
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'rebalance',
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
      transactionId: transaction?.id,
      transactions: finalTransaction,
      estimatedGas: calculateBundleGas(transactionBundle),
      targetHealthFactor,
      usesFlashLoan: useFlashLoan,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Rebalance error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface PositionAction {
  protocol: string;
  action: 'deposit' | 'withdraw' | 'borrow' | 'repay';
  asset: string;
  amount: string;
}

function buildPositionTransaction(position: PositionAction, protocolAddress: string, walletAddress: string) {
  // Function signatures for common lending operations
  const functionSignatures: Record<string, string> = {
    deposit: '0xe8eda9df', // supply(address,uint256,address,uint16)
    withdraw: '0x69328dec', // withdraw(address,uint256,address)
    borrow: '0xa415bcad', // borrow(address,uint256,uint256,uint16,address)
    repay: '0x573ade81', // repay(address,uint256,uint256,address)
  };

  return {
    to: protocolAddress,
    data: functionSignatures[position.action],
    params: {
      asset: position.asset,
      amount: position.amount,
      onBehalfOf: walletAddress,
    },
  };
}

function wrapWithFlashLoan(transactions: any[], network: string) {
  // Calculate total flash loan amount needed
  const totalAmount = transactions.reduce((sum, tx) => {
    return sum + parseFloat(tx.params?.amount || '0');
  }, 0);

  return {
    type: 'flash_loan_bundle',
    flashLoanAmount: totalAmount.toString(),
    innerTransactions: transactions,
    network,
  };
}

function calculateBundleGas(transactions: any[]): string {
  // Base gas per transaction + overhead
  const baseGas = 100000;
  const perTxGas = 150000;
  const totalGas = baseGas + (transactions.length * perTxGas);
  
  return totalGas.toString();
}
