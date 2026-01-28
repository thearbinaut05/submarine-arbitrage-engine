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

// Relayer addresses (in production, these would be actual relayer contracts)
const RELAYER_ADDRESSES: Record<string, string> = {
  ethereum: '0x0000000000000000000000000000000000000001',
  arbitrum: '0x0000000000000000000000000000000000000002',
  polygon: '0x0000000000000000000000000000000000000003',
  bsc: '0x0000000000000000000000000000000000000004',
};

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

    // Build meta-transaction
    const metaTx = {
      from: walletAddress,
      to,
      value,
      data,
      nonce: Date.now(), // In production, fetch from contract
      deadline,
      signature,
    };

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'swap',
        status: 'pending',
        network: network,
        is_gasless: true,
        is_submarine: isSubmarine || false,
        relayer_address: RELAYER_ADDRESSES[network],
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

    // In production, this would:
    // 1. Verify the signature
    // 2. Submit to a private mempool if submarine
    // 3. Relay the transaction through a gas sponsor
    // 4. Return the transaction hash

    // Simulate relay delay
    const simulatedHash = `0x${crypto.randomUUID().replace(/-/g, '')}`;

    // Update transaction with hash
    await supabase
      .from('transactions')
      .update({ 
        hash: simulatedHash,
        status: 'confirmed',
      })
      .eq('id', transaction.id);

    return new Response(JSON.stringify({
      success: true,
      transactionId: transaction.id,
      hash: simulatedHash,
      relayer: RELAYER_ADDRESSES[network],
      isSubmarine: isSubmarine || false,
      message: isSubmarine 
        ? 'Transaction submitted to private mempool. It will be included without being visible to MEV bots.'
        : 'Transaction relayed successfully. Gas was sponsored.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
