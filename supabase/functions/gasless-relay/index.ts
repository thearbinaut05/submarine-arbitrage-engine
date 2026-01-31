import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deployed GaslessRelayer contract addresses
const GASLESS_RELAYER: Record<string, string> = {
  ethereum: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  arbitrum: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
  polygon: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  bsc: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  optimism: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  base: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  avalanche: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
};

// Chain IDs for Gelato
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  bsc: 56,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
};

// Explorer URLs for blockchain links
const EXPLORER_URLS: Record<string, string> = {
  ethereum: 'https://etherscan.io',
  arbitrum: 'https://arbiscan.io',
  polygon: 'https://polygonscan.com',
  bsc: 'https://bscscan.com',
  optimism: 'https://optimistic.etherscan.io',
  base: 'https://basescan.org',
  avalanche: 'https://snowtrace.io',
};

// Sponsored call with Gelato
async function sponsoredCallWithGelato(
  gelatoApiKey: string,
  chainId: number,
  target: string,
  data: string,
  isSubmarine: boolean = false
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
      isPrivate: isSubmarine,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gelato API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  return { taskId: result.taskId };
}

interface GaslessRequest {
  network: string;
  to: string;
  data: string;
  value: string;
  deadline: number;
  signature: string;
  walletAddress: string;
  isSubmarine?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gelato API key from environment
    const gelatoApiKey = Deno.env.get('GELATO_API_KEY');
    if (!gelatoApiKey) {
      return new Response(JSON.stringify({ error: 'Gelato API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const body: GaslessRequest = await req.json();
    const { network, to, data, deadline, isSubmarine } = body;

    // Validate deadline
    if (deadline < Date.now() / 1000) {
      return new Response(JSON.stringify({ error: 'Transaction deadline expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate network
    if (!GASLESS_RELAYER[network]) {
      return new Response(JSON.stringify({ error: `Unsupported network: ${network}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'flash_loan',
        status: 'pending',
        network: network,
        is_gasless: true,
        is_submarine: isSubmarine || false,
        relayer_address: GASLESS_RELAYER[network],
        hash: 'pending',
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Gelato sponsored call via our deployed GaslessRelayer contract
    try {
      const chainId = CHAIN_IDS[network];
      const relayerAddress = GASLESS_RELAYER[network];
      
      const result = await sponsoredCallWithGelato(
        gelatoApiKey, 
        chainId, 
        to || relayerAddress, 
        data, 
        isSubmarine || false
      );

      // Update transaction with Gelato task ID
      await supabase
        .from('transactions')
        .update({
          hash: result.taskId,
          status: 'pending',
        })
        .eq('id', transaction.id);

      const explorerBase = EXPLORER_URLS[network] || 'https://etherscan.io';
      
      return new Response(JSON.stringify({
        success: true,
        transactionId: transaction.id,
        taskId: result.taskId,
        relayer: relayerAddress,
        isSubmarine: isSubmarine || false,
        explorerUrl: `${explorerBase}/tx/`,
        message: isSubmarine
          ? 'Submarine transaction submitted via Gelato Relay. Protected from MEV.'
          : 'Transaction sponsored via Gelato Relay.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (gelatoError) {
      console.error('Gelato relay error:', gelatoError);

      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transaction.id);

      return new Response(JSON.stringify({
        error: 'Failed to relay transaction via Gelato',
        details: gelatoError instanceof Error ? gelatoError.message : 'Unknown error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Gasless relay error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
