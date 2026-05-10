import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RPC_ENDPOINTS } from "../_shared/mainnet-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPPORTED_NETWORKS = ['ethereum', 'arbitrum', 'polygon', 'bsc', 'optimism', 'base', 'avalanche'];
const VALID_TABS = ['dashboard', 'scanner', 'wallet', 'gasless', 'rebalance'];

// ---------- Action descriptors (consumed by client) ----------
type ClientAction =
  | { type: 'open_tab'; tab: string; label: string }
  | { type: 'select_opportunity'; opportunityId: string; label: string }
  | { type: 'execute_opportunity'; opportunityId: string; label: string }
  | { type: 'switch_network'; network: string; label: string }
  | { type: 'start_scanner'; label: string }
  | { type: 'stop_scanner'; label: string }
  | { type: 'refresh_balances'; label: string }
  | { type: 'connect_wallet'; walletType?: string; label: string }
  | { type: 'disconnect_wallet'; label: string };

// ---------- Tool implementations ----------

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
    summary: {
      type: data.type,
      route: `${data.source_dex} \u2192 ${data.target_dex}`,
      profit_usd: data.profit_usd,
      profit_percent: data.profit_percent,
      source_network: data.source_network,
      target_network: data.target_network,
    },
  };
}

async function getRecentTransactions(supabase: ReturnType<typeof createClient>, userId: string | undefined, limit = 5) {
  let q = supabase
    .from('transactions')
    .select('id, hash, type, status, network, profit, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 10));
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { transactions: data ?? [] };
}

async function getUserSettings(supabase: ReturnType<typeof createClient>, userId: string | undefined) {
  if (!userId) return { error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? { error: 'No settings yet' };
}

// ---------- Tool dispatch ----------

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_balance',
      description: 'Get native token balance for an address on a network.',
      parameters: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          network: { type: 'string', enum: SUPPORTED_NETWORKS },
        },
        required: ['network'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_opportunities',
      description: 'List highest-profit pending arbitrage opportunities. Returns ids the user can deep-link into the scanner.',
      parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_points',
      description: 'Read tap-to-earn points for the connected wallet.',
      parameters: { type: 'object', properties: { address: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prepare_trade',
      description: 'Look up an opportunity and prepare it for execution. Emits a deep-link action to the scanner.',
      parameters: {
        type: 'object',
        properties: { opportunityId: { type: 'string' } },
        required: ['opportunityId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_transactions',
      description: 'List the user\'s recent on-chain transactions.',
      parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_settings',
      description: 'Read the user\'s scanner config (min profit, gas cap, networks, auto-execute).',
      parameters: { type: 'object', properties: {} },
    },
  },
  // ----- Action-emitting tools (return an action for the client to perform) -----
  {
    type: 'function',
    function: {
      name: 'open_panel',
      description: 'Navigate the UI to a panel: dashboard | scanner | wallet | gasless | rebalance.',
      parameters: {
        type: 'object',
        properties: { tab: { type: 'string', enum: VALID_TABS } },
        required: ['tab'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_opportunity',
      description: 'Open the scanner with the opportunity preselected and prompt the user to execute it.',
      parameters: {
        type: 'object',
        properties: { opportunityId: { type: 'string' } },
        required: ['opportunityId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'switch_network',
      description: 'Ask the connected wallet to switch chain.',
      parameters: {
        type: 'object',
        properties: { network: { type: 'string', enum: SUPPORTED_NETWORKS } },
        required: ['network'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_scanner',
      description: 'Start the arbitrage scanner.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_scanner',
      description: 'Stop the arbitrage scanner.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'refresh_balances',
      description: 'Refresh wallet token balances in the UI.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connect_wallet',
      description: 'Trigger wallet connect flow.',
      parameters: {
        type: 'object',
        properties: { walletType: { type: 'string', enum: ['metamask', 'bitget', 'injected'] } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'disconnect_wallet',
      description: 'Disconnect the current wallet.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

async function runTool(
  name: string,
  args: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  ctx: { walletAddress?: string; network?: string; userId?: string },
  actions: ClientAction[],
): Promise<unknown> {
  const addrArg = (args.address as string | undefined) ?? ctx.walletAddress;
  switch (name) {
    case 'get_balance':
      return getBalance(addrArg as string, (args.network as string) ?? ctx.network ?? 'ethereum');
    case 'get_opportunities': {
      const r = await getOpportunities(supabase, (args.limit as number) ?? 5);
      for (const o of r.opportunities.slice(0, 5)) {
        actions.push({ type: 'select_opportunity', opportunityId: o.id, label: `View ${o.source_dex}\u2192${o.target_dex} ($${Number(o.profit_usd).toFixed(2)})` });
      }
      return r;
    }
    case 'get_points':
      return getPoints(supabase, addrArg as string);
    case 'prepare_trade': {
      const r = await prepareTrade(supabase, args.opportunityId as string);
      actions.push({ type: 'select_opportunity', opportunityId: r.opportunityId, label: 'Open in Scanner' });
      actions.push({ type: 'execute_opportunity', opportunityId: r.opportunityId, label: 'Execute now' });
      return r;
    }
    case 'get_recent_transactions':
      return getRecentTransactions(supabase, ctx.userId, (args.limit as number) ?? 5);
    case 'get_user_settings':
      return getUserSettings(supabase, ctx.userId);
    case 'open_panel': {
      const tab = String(args.tab);
      if (!VALID_TABS.includes(tab)) throw new Error('Invalid tab');
      actions.push({ type: 'open_tab', tab, label: `Open ${tab}` });
      return { ok: true, tab };
    }
    case 'execute_opportunity': {
      const id = String(args.opportunityId);
      actions.push({ type: 'select_opportunity', opportunityId: id, label: 'Open in Scanner' });
      actions.push({ type: 'execute_opportunity', opportunityId: id, label: 'Execute now' });
      return { ok: true, opportunityId: id, note: 'User must confirm in their wallet.' };
    }
    case 'switch_network': {
      const net = String(args.network);
      if (!SUPPORTED_NETWORKS.includes(net)) throw new Error('Unsupported network');
      actions.push({ type: 'switch_network', network: net, label: `Switch to ${net}` });
      return { ok: true, network: net };
    }
    case 'start_scanner':
      actions.push({ type: 'start_scanner', label: 'Start scanner' });
      return { ok: true };
    case 'stop_scanner':
      actions.push({ type: 'stop_scanner', label: 'Stop scanner' });
      return { ok: true };
    case 'refresh_balances':
      actions.push({ type: 'refresh_balances', label: 'Refresh balances' });
      return { ok: true };
    case 'connect_wallet': {
      const wt = (args.walletType as string) ?? 'injected';
      actions.push({ type: 'connect_wallet', walletType: wt, label: `Connect ${wt}` });
      return { ok: true };
    }
    case 'disconnect_wallet':
      actions.push({ type: 'disconnect_wallet', label: 'Disconnect' });
      return { ok: true };
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

    // Try to resolve user from JWT (optional)
    let userId: string | undefined;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: u } = await supabase.auth.getUser(authHeader.slice(7));
      userId = u.user?.id;
    }

    const systemPrompt = `You are FLASHARB Assistant, embedded in a multi-chain DeFi arbitrage terminal.
Connected wallet: ${walletAddress ?? 'none'} | Active network: ${network ?? 'unknown'}.
You can drive the UI via action-tools: open_panel, execute_opportunity, select_opportunity (via prepare_trade), switch_network, start_scanner, stop_scanner, refresh_balances, connect_wallet, disconnect_wallet.
Whenever the user asks to do something — execute a trade, switch networks, view a panel, scan, refresh — call the matching action tool. Each action becomes a one-tap button under your reply.
For data questions use read tools (get_balance, get_opportunities, get_points, get_recent_transactions, get_user_settings).
Always cite real on-chain numbers from tool output; never invent figures. Be terse, format in markdown.
You CANNOT sign transactions yourself — actions open the relevant UI; the user confirms in their wallet.`;

    const convo: IncomingMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const actions: ClientAction[] = [];

    for (let iter = 0; iter < 5; iter++) {
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

      const toolCalls = choice.tool_calls as IncomingMessage['tool_calls'];
      if (toolCalls && toolCalls.length > 0) {
        convo.push({ role: 'assistant', content: choice.content ?? '', tool_calls: toolCalls });
        for (const call of toolCalls) {
          let result: unknown;
          try {
            const args = JSON.parse(call.function.arguments || '{}');
            result = await runTool(call.function.name, args, supabase, { walletAddress, network, userId }, actions);
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

      // De-dupe actions by stable key
      const seen = new Set<string>();
      const dedupedActions = actions.filter(a => {
        const key = JSON.stringify(a);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return new Response(JSON.stringify({
        message: choice.content ?? '',
        actions: dedupedActions,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ message: 'Assistant exceeded tool-call limit. Try rephrasing.', actions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('wallet-assistant error', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
