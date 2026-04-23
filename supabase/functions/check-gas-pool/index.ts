import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TODO: Update with deployed GasPoolSponsor address
const GAS_POOL_CONTRACT = '0xYourGasPoolSponsorAddressHere' // Deploy Phase 2

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: recentDeposits, error: depositsError } = await supabaseClient
      .from('gas_pool_logs')
      .select('amount_eth, sponsor_type, funded_by_wallet')
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: todayRevenueRows, error: revenueError } = await supabaseClient
      .from('ad_events')
      .select('estimated_revenue')
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
 
    if (depositsError) {
      console.warn('gas_pool_logs query failed:', depositsError.message, depositsError.code)
    }

    if (revenueError) {
      console.warn('ad_events revenue query failed:', revenueError.message, revenueError.code)
    }

    const totalTodayRevenue = Array.isArray(todayRevenueRows)
      ? todayRevenueRows.reduce((sum, row) => sum + Number(row.estimated_revenue || 0), 0) * 100
      : 0

    return Response.json({ 
      success: true,
      pool_contract: GAS_POOL_CONTRACT,
      recent_deposits: recentDeposits || [],
      today_ad_revenue_cents: totalTodayRevenue,
      total_logs: Array.isArray(recentDeposits) ? recentDeposits.length : 0
    }, { headers: corsHeaders })

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ success: false, error: message }, { 
      status: 400, 
      headers: corsHeaders 
    })
  }
})

