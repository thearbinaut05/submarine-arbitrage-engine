import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  CONTRACT_ADDRESSES,
  CHAIN_IDS,
  EXPLORER_URLS,
  GAS_LIMITS,
  RPC_ENDPOINTS,
  SCANNER_CONFIG,
} from "../_shared/mainnet-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gelato Relay API endpoints
const GELATO_API = {
  sponsoredCall: 'https://api.gelato.digital/relays/v2/sponsored-call',
  taskStatus: 'https://api.gelato.digital/tasks/status',
};

interface GaslessRequest {
  network: string;
  to: string;
  data: string;
  value?: string;
  deadline: number;
  signature?: string;
  walletAddress: string;
  isSubmarine?: boolean;
  opportunityId?: string;
  priorityFee?: string;
  // when supplied the server will attempt an ERC‑4337 bundler call using this
  // paymaster address; the connected wallet still receives profits.
  paymasterAddress?: string;
}

interface GelatoResponse {
  taskId: string;
}

// Get current gas price for the network
async function getGasPrice(network: string): Promise<number> {
  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) return 0;

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
    return parseInt(data.result, 16) / 1e9; // Convert to gwei
  } catch {
    return GAS_LIMITS[network]?.target || 30;
  }
}

// Sponsored call with Gelato - optimized for speed
async function sponsoredCallWithGelato(
  gelatoApiKey: string,
  chainId: number,
  target: string,
  data: string,
  options: {
    isSubmarine?: boolean;
    gasLimit?: string;
    retries?: number;
  } = {}
): Promise<GelatoResponse> {
  const { isSubmarine = false, gasLimit = '600000', retries = 2 } = options;

  const payload = {
    sponsorApiKey: gelatoApiKey,
    chainId,
    target,
    data,
    gasLimit,
    retries,
    // MEV protection via private mempool
    isPrivate: isSubmarine || SCANNER_CONFIG.usePrivateMempool,
    // Fast execution
    feeToken: '0x0000000000000000000000000000000000000000', // Native token
  };

  const response = await fetch(GELATO_API.sponsoredCall, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gelato API error [${response.status}]: ${errorText}`);
  }

  return await response.json();
}

// Check Gelato task status
async function checkTaskStatus(taskId: string): Promise<{
  taskState: string;
  transactionHash?: string;
}> {
  const response = await fetch(`${GELATO_API.taskStatus}/${taskId}`);
  if (!response.ok) {
    throw new Error('Failed to check task status');
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

    // Get Gelato API key
    const gelatoApiKey = Deno.env.get('GELATO_API_KEY');
    if (!gelatoApiKey) {
      return new Response(JSON.stringify({ 
        error: 'Gelato API key not configured',
        code: 'MISSING_API_KEY',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional auth - allow both authenticated and test calls
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body: GaslessRequest = await req.json();
    const { network, to, data, deadline, isSubmarine, opportunityId, walletAddress, paymasterAddress } = body;

    // Validate deadline
    if (deadline && deadline < Date.now() / 1000) {
      return new Response(JSON.stringify({ 
        error: 'Transaction deadline expired',
        code: 'DEADLINE_EXPIRED',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate network
    const contracts = CONTRACT_ADDRESSES[network];
    if (!contracts) {
      return new Response(JSON.stringify({ 
        error: `Unsupported network: ${network}`,
        code: 'INVALID_NETWORK',
        supportedNetworks: Object.keys(CONTRACT_ADDRESSES),
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check gas price (bundler might ignore this but we keep the same guard)
    const currentGasPrice = await getGasPrice(network);
    const gasLimits = GAS_LIMITS[network];
    
    if (currentGasPrice > gasLimits.max) {
      return new Response(JSON.stringify({
        error: 'Gas price too high',
        code: 'GAS_TOO_HIGH',
        currentGasPrice: `${currentGasPrice.toFixed(2)} gwei`,
        maxAllowed: `${gasLimits.max} gwei`,
        suggestion: 'Wait for gas prices to decrease',
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        opportunity_id: opportunityId,
        type: 'flash_loan',
        status: 'pending',
        network,
        is_gasless: true,
        is_submarine: isSubmarine || false,
        relayer_address: contracts.gaslessRelayer,
        hash: 'pending',
        gas_price: `${currentGasPrice.toFixed(2)} gwei`,
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
    }

    // If a paymaster address was provided, attempt to use an ERC‑4337 bundler
    if (paymasterAddress) {
      // default to Pimlico if no URL provided
      const bundlerUrlCandidate =
        Deno.env.get('BUNDLER_URL') ||
        Deno.env.get('PIMLICO_BUNDLER_URL') ||
        'https://bundler.pimlico.io/relay';
      const bundlerUrl = bundlerUrlCandidate;
      if (!bundlerUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Paymaster bundler not configured',
          code: 'MISSING_BUNDLER',
          suggestion: 'Set BUNDLER_URL or PIMLICO_BUNDLER_URL pointing to a service that can wrap the call in a UserOperation.',
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build a very simple payload for the bundler; the bundler implementation
      // is expected to know how to convert this to a proper UserOperation.  We're
      // intentionally generic because the on-chain parameter requirements may
      // vary depending on your paymaster contract.
      const bundlerPayload = {
        network,
        to: to || contracts.gaslessRelayer,
        data,
        value: body.value || '0',
        walletAddress,
        paymasterAddress,
        opportunityId,
      };

      const bundlerResp = await fetch(bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundlerPayload),
      });
      if (!bundlerResp.ok) {
        const text = await bundlerResp.text();
        console.error('Bundler error:', text);
        if (transaction) {
          await supabase
            .from('transactions')
            .update({ status: 'failed' })
            .eq('id', transaction.id);
        }
        return new Response(JSON.stringify({
          success: false,
          error: 'Bundler request failed',
          details: text,
          status: bundlerResp.status,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await bundlerResp.json();
      if (transaction) {
        await supabase
          .from('transactions')
          .update({
            hash: result.taskId || result.userOpHash || 'pending',
            status: 'pending',
            is_gasless: true,
            relayer_address: paymasterAddress,
          })
          .eq('id', transaction.id);
      }

      const explorerUrl = EXPLORER_URLS[network];
      const executionTime = Date.now() - startTime;
      return new Response(JSON.stringify({
        success: true,
        transactionId: transaction?.id,
        taskId: result.taskId || result.userOpHash,
        network,
        chainId: CHAIN_IDS[network],
        relayType: 'erc4337',
        paymasterAddress,
        explorerUrl: `${explorerUrl}/tx/`,
        gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
        executionTimeMs: executionTime,
        message: 'UserOperation submitted to bundler',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute via Gelato
    const chainId = CHAIN_IDS[network];
    const targetAddress = to || contracts.gaslessRelayer;

    try {
      const result = await sponsoredCallWithGelato(
        gelatoApiKey,
        chainId,
        targetAddress,
        data,
        {
          isSubmarine,
          gasLimit: '600000',
          retries: 2,
        }
      );

      // Update transaction with task ID
      if (transaction) {
        await supabase
          .from('transactions')
          .update({ hash: result.taskId, status: 'pending' })
          .eq('id', transaction.id);
      }

      const explorerUrl = EXPLORER_URLS[network];
      const executionTime = Date.now() - startTime;

      return new Response(JSON.stringify({
        success: true,
        transactionId: transaction?.id,
        taskId: result.taskId,
        network,
        chainId,
        targetContract: targetAddress,
        relayerContract: contracts.gaslessRelayer,
        isSubmarine: isSubmarine || false,
        mevProtected: SCANNER_CONFIG.usePrivateMempool || isSubmarine,
        explorerUrl: `${explorerUrl}/tx/`,
        gelatoStatusUrl: `https://relay.gelato.digital/task/${result.taskId}`,
        gasPrice: `${currentGasPrice.toFixed(2)} gwei`,
        executionTimeMs: executionTime,
        message: isSubmarine
          ? '🔒 Submarine transaction submitted via private mempool. Protected from MEV.'
          : '⚡ Transaction sponsored via Gelato Relay.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (gelatoError) {
      console.error('Gelato relay error:', gelatoError);

      if (transaction) {
        await supabase
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to relay transaction via Gelato',
        code: 'GELATO_ERROR',
        details: gelatoError instanceof Error ? gelatoError.message : 'Unknown error',
        transactionId: transaction?.id,
        executionTimeMs: Date.now() - startTime,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Gasless relay error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR',
      executionTimeMs: Date.now() - startTime,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
