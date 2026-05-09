import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RebalanceSchema, validateOrError, sanitizeError } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deployed PositionRebalancer contract addresses
const POSITION_REBALANCER: Record<string, string> = {
  ethereum: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  arbitrum: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
  polygon: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  bsc: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  optimism: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  base: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  avalanche: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
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
  bsc: {
    venus: '0xfD36E2c2a6789Db23113685031d7F16329158384',
  },
  optimism: {
    aave_v3: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  },
  base: {
    aave_v3: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  },
  avalanche: {
    aave_v3: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    benqi: '0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4',
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

    const rawBody = await req.json();
    const validation = validateOrError(RebalanceSchema, rawBody, corsHeaders);
    if (!validation.ok) return validation.response;
    const body: RebalanceRequest = { ...rawBody, ...validation.data } as RebalanceRequest;
    const { network, positions, targetHealthFactor, walletAddress, useFlashLoan, useGelato } = body;

    // Validate network
    if (!POSITION_REBALANCER[network]) {
      return new Response(JSON.stringify({ error: `Unsupported network: ${network}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rebalancerAddress = POSITION_REBALANCER[network];
    const networkProtocols = LENDING_PROTOCOLS[network] || {};

    // Build rebalancing transaction bundle
    const transactionBundle = [];
    
    for (const position of positions) {
      const protocolAddress = networkProtocols[position.protocol];
      if (!protocolAddress) {
        continue;
      }

      const tx = buildPositionTransaction(position, protocolAddress, walletAddress, rebalancerAddress);
      transactionBundle.push(tx);
    }

    // If using flash loan, wrap the bundle
    let finalTransaction;
    if (useFlashLoan) {
      finalTransaction = wrapWithFlashLoan(transactionBundle, network, rebalancerAddress);
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
          const calldata = encodeRebalanceCalldata(finalTransaction);
          const gelatoResult = await sponsoredCallWithGelato(
            gelatoApiKey,
            CHAIN_IDS[network],
            rebalancerAddress,
            calldata
          );
          
          await supabase
            .from('transactions')
            .update({ hash: gelatoResult.taskId })
            .eq('id', transaction?.id);

          return new Response(JSON.stringify({
            success: true,
            taskId: gelatoResult.taskId,
            transactionId: transaction?.id,
            rebalancerAddress,
            isGasless: true,
            message: 'Position rebalance submitted via Gelato Relay',
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
      transactionId: transaction?.id,
      transactions: finalTransaction,
      rebalancerAddress,
      estimatedGas: calculateBundleGas(transactionBundle),
      targetHealthFactor,
      usesFlashLoan: useFlashLoan,
      supportedProtocols: Object.keys(networkProtocols),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const sanitized = sanitizeError(error, 'rebalance-positions');
    return new Response(JSON.stringify({
      error: sanitized.message,
      code: sanitized.code,
      requestId: sanitized.requestId,
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

function buildPositionTransaction(
  position: PositionAction, 
  protocolAddress: string, 
  walletAddress: string,
  rebalancerAddress: string
) {
  const functionSignatures: Record<string, string> = {
    deposit: '0xe8eda9df',
    withdraw: '0x69328dec',
    borrow: '0xa415bcad',
    repay: '0x573ade81',
  };

  return {
    to: rebalancerAddress,
    protocol: protocolAddress,
    data: functionSignatures[position.action],
    params: {
      asset: position.asset,
      amount: position.amount,
      onBehalfOf: walletAddress,
    },
  };
}

interface TransactionBundle {
  to: string;
  protocol: string;
  data: string;
  params: {
    asset: string;
    amount: string;
    onBehalfOf: string;
  };
}

function wrapWithFlashLoan(transactions: TransactionBundle[], network: string, rebalancerAddress: string) {
  const totalAmount = transactions.reduce((sum, tx) => {
    return sum + parseFloat(tx.params?.amount || '0');
  }, 0);

  return {
    type: 'flash_loan_bundle',
    flashLoanAmount: totalAmount.toString(),
    innerTransactions: transactions,
    network,
    rebalancerAddress,
  };
}

function calculateBundleGas(transactions: TransactionBundle[]): string {
  const baseGas = 100000;
  const perTxGas = 150000;
  const totalGas = baseGas + (transactions.length * perTxGas);
  
  return totalGas.toString();
}

function encodeRebalanceCalldata(transaction: unknown): string {
  return btoa(JSON.stringify(transaction));
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
