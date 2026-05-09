import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RPC_ENDPOINTS } from "../_shared/mainnet-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_NETWORKS = ['ethereum', 'arbitrum', 'polygon', 'bsc', 'optimism', 'base', 'avalanche'];

// ---------- Tool implementations (server-side only) ----------

async function rpcCall(network: string, method: string, params: unknown[]): Promise<unknown> {
  const rpcs = RPC_ENDPOINTS[network];
  if (!rpcs?.length) throw new Error(`Unsupported network: ${network}`);
  for (const url of rpcs) {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error.message);
      return json.result;
    } catch (_e) { /* try next */ }
  }
  throw new Error(`All RPCs failed for ${network}`);
}

async function getBalance(address: string, network: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid address');
  if (!SUPPORTED_NETWORKS.includes(network)) throw new Error('Unsupported network');
  const hexBal = await rpcCall(network, 'eth_getBalance', [address, 'latest']) as string;
  const wei = BigInt(hexBal);
  const eth = Number(wei) / 1e18;
  return { network, address, balance_native: eth.toFixed(6), wei: wei.toString() };
}

async function getOpportunities(supabase: ReturnType<typeof createClient>, limit = 5) {
  const { data, error } = await supabase
    .from('arbitrage_opportunities')
    .select('id, type, source_network, target_network, source_dex, target_dex, profit_usd, profit_percent, status')
    .eq('status', 'pending')
    .order('profit_usd', { ascending: false })
    .limit(Math.min(limit, 10));
  if (error) throw new Error(error.message);
  return { opportunities: data ?? [] };
}

async function getPoints(supabase: ReturnType<typeof createClient>, address: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid address');
  const { data, error } = await supabase
    .from('user_points')
    .select('points, daily_taps, total_taps, network')
    .eq('wallet_address', address.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { points: 0, daily_taps: 0, total_taps: 0 };
}

async function prepareTrade(supabase: ReturnType<typeof createClient>, opportunityId: string) {
  const { data, error } = await supabase
    .from('arbitrage_opportunities')
    .select('*')
    .eq('id', opportunityId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Opportunity not found');
  return {
    opportunityId,
    instructions: 'Use the Scanner panel \u2192 Execute on this opportunity. Trade is signed in your wallet; assistant cannot auto-execute.',
    summary: {
      type: data.type,
      route: `${data.source_dex} \u2192 ${data.target_dex}`,
      profit_usd: data.profit_usd,
      profit_percent: data.profit_percent,
    },
  };
}

// ---------- Tool dispatch ----------

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_balance',
      description: 'Get native token balance for an address on a given network.',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'EVM address (0x...)' },
          network: { type: 'string', enum: SUPPORTED_NETWORKS },
        },
        required: ['address', 'network'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_opportunities',
      description: 'List the highest-profit pending arbitrage opportunities.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: '1-10', default: 5 } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_points',
      description: 'Read tap-to-earn points for a wallet address.',
      parameters: {
        type: 'object',
        properties: { address: { type: 'string' } },
        required: ['address'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_trade',
      description: 'Look up an opportunity by id and return summary + execution instructions. Does not execute.',
      parameters: {
        type: 'object',
        properties: { opportunityId: { type: 'string' } },
        required: ['opportunityId'],
      },
    },
  },
];

async function runTool(
  name: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  ctx: { walletAddress?: string },
): Promise<unknown> {
  const addrArg = (args.address as string | undefined) ?? ctx.walletAddress;
  switch (name) {
    case 'get_balance':
      return getBalance(addrArg as string, args.network as string);
    case 'get_opportunities':
      return getOpportunities(supabase, (args.limit as number) ?? 5);
    case 'get_points':
      return getPoints(supabase, addrArg as string);
    case 'prepare_trade':
      return prepareTrade(supabase, args.opportunityId as string);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------- Handler ----------

interface IncomingMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, walletAddress, network } = await req.json() as {
      messages: IncomingMessage[]; walletAddress?: string; network?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const systemPrompt = `You are FLASHARB Assistant, an AI co-pilot embedded in a multi-chain DeFi arbitrage terminal.
Help the user inspect balances, scan opportunities, and prepare trades.
Connected wallet: ${walletAddress ?? 'none'} | Active network: ${network ?? 'unknown'}.
Use tools to fetch real on-chain data; never invent numbers. Be terse. Format responses in markdown.
You CANNOT execute trades \u2014 only prepare them. Always tell the user to confirm in their wallet.`;

    const convo: IncomingMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Tool-calling loop, max 4 iterations
    for (let iter = 0; iter < 4; iter++) {
      const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: convo,
          tools: TOOLS,
        }),
      });

      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add funds in Workspace > Usage.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error('AI gateway error', aiResp.status, t);
        return new Response(JSON.stringify({ error: 'AI gateway error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const json = await aiResp.json();
      const choice = json.choices?.[0]?.message;
      if (!choice) break;

      // Tool calls?
      const toolCalls = choice.tool_calls as IncomingMessage['tool_calls'];
      if (toolCalls && toolCalls.length > 0) {
        convo.push({ role: 'assistant', content: choice.content ?? '', tool_calls: toolCalls });
        for (const call of toolCalls) {
          let result: unknown;
          try {
            const args = JSON.parse(call.function.arguments || '{}');
            result = await runTool(call.function.name, args, supabase, { walletAddress });
          } catch (e) {
            result = { error: e instanceof Error ? e.message : String(e) };
          }
          convo.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      // Final answer
      return new Response(JSON.stringify({
        message: choice.content ?? '',
        toolHistory: convo.filter(m => m.role === 'tool').map(m => ({ result: m.content })),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: 'Assistant exceeded tool-call limit. Try rephrasing.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('wallet-assistant error', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
