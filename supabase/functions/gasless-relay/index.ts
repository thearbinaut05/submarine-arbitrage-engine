import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EIP-712 Domain for meta-transactions
const EIP712_DOMAIN = {
  name: 'FlashArb Relayer',
  version: '1',
  chainId: 1, // Will be dynamic based on network
};

// Chain IDs for Gelato
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  bsc: 56,
};

// Explorer URLs for blockchain links
const EXPLORER_URLS: Record<string, string> = {
  ethereum: 'https://etherscan.io',
  arbitrum: 'https://arbiscan.io',
  polygon: 'https://polygonscan.com',
  bsc: 'https://bscscan.com',
};

// Relayer addresses (Gelato Relay contracts)
const RELAYER_ADDRESSES: Record<string, string> = {
  ethereum: '0xaBcC9b596420A9E9172FD5938620E265a0f9Df92',
  arbitrum: '0xaBcC9b596420A9E9172FD5938620E265a0f9Df92',
  polygon: '0xaBcC9b596420A9E9172FD5938620E265a0f9Df92',
  bsc: '0xaBcC9b596420A9E9172FD5938620E265a0f9Df92',
};

// Sponsored call with Gelato
async function sponsoredCallWithGelato(
  gelatoApiKey: string,
  chainId: number,
  target: string,
  data: string,
  isSubmarine: boolean = false
): Promise<{ taskId: string }> {
  const url = isSubmarine
    ? "https://api.gelato.digital/relays/v2/sponsored-call" // Private mempool for MEV protection
    : "https://api.gelato.digital/relays/v2/sponsored-call";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sponsorApiKey: gelatoApiKey,
      chainId,
      target,
      data,
      retries: 3,
      isPrivate: isSubmarine, // Enable private routing for submarine transactions
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
    const { network, to, data, value, deadline, signature, walletAddress, isSubmarine } = body;

    // Validate deadline
    if (deadline < Date.now() / 1000) {
      return new Response(JSON.stringify({ error: 'Transaction deadline expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate network
    if (!RELAYER_ADDRESSES[network]) {
      return new Response(JSON.stringify({ error: `Unsupported network: ${network}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create transaction record with taskId (Gelato task ID)
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'flash_loan',
        status: 'pending',
        network: network,
        is_gasless: true,
        is_submarine: isSubmarine || false,
        relayer_address: RELAYER_ADDRESSES[network],
        hash: 'pending', // Will be updated with taskId
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

    // Use Gelato sponsored call for gasless execution
    try {
      const chainId = CHAIN_IDS[network];
      
      // Execute submarine transaction for MEV protection
      const result = await sponsoredCallWithGelato(
        gelatoApiKey, 
        chainId, 
        to, 
        data, 
        isSubmarine || false
      );

      // Update transaction with Gelato task ID
      await supabase
        .from('transactions')
        .update({
          hash: result.taskId,
          status: 'pending', // Waiting for blockchain confirmation
        })
        .eq('id', transaction.id);

      // Return response with explorer URL
      const explorerBase = EXPLORER_URLS[network] || 'https://etherscan.io';
      
      return new Response(JSON.stringify({
        success: true,
        transactionId: transaction.id,
        taskId: result.taskId,
        relayer: RELAYER_ADDRESSES[network],
        isSubmarine: isSubmarine || false,
        explorerUrl: `${explorerBase}/tx/`, // Will be updated with real hash when confirmed
        message: isSubmarine
          ? 'Submarine transaction submitted via Gelato Relay. Protected from MEV.'
          : 'Transaction sponsored via Gelato Relay.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (gelatoError) {
      console.error('Gelato relay error:', gelatoError);

      // Update transaction status to failed
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

// Webhook endpoint for Gelato to call when transaction is confirmed
// This is called by Gelato to update the real blockchain transaction hash
export async function handleGelatoWebhook(
  taskId: string,
  realTxHash: string,
  status: 'confirmed' | 'failed'
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('transactions')
    .update({
      real_tx_hash: realTxHash,
      status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('hash', taskId);

  if (error) {
    console.error('Failed to update transaction:', error);
    throw error;
  }

  return { success: true };
}

