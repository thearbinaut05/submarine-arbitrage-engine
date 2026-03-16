import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

const { wallet_address, network }: { wallet_address: string, network: string } = await req.json() as any
    
    if (!wallet_address || !network) {
      throw new Error('Missing wallet_address or network')
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    // Get or create user_points row
    let { data: userPoint, error } = await supabaseClient
      .from('user_points')
      .select('points, daily_taps, last_tap_timestamp, total_taps')
      .eq('wallet_address', wallet_address)
      .eq('network', network)
      .single()

    if (error && error.code !== 'PGRST116') { // No row
      throw error
    }

    const currentPoints = userPoint?.points || 0
    const currentDailyTaps = userPoint?.daily_taps || 0
    const currentTotalTaps = userPoint?.total_taps || 0
    const lastTap = userPoint?.last_tap_timestamp

    // Daily limit: 100 taps
    if (currentDailyTaps >= 100) {
      return Response.json({ success: false, error: 'Daily tap limit reached' }, { headers: corsHeaders })
    }

    // Cooldown: 3 seconds between taps
    if (lastTap && (now.getTime() - new Date(lastTap).getTime()) < 3000) {
      return Response.json({ success: false, error: 'Tap too soon. Wait 3s' }, { headers: corsHeaders })
    }

    // Award 1 point per tap
    const newPoints = currentPoints + 1
    const newDailyTaps = currentDailyTaps + 1
    const newTotalTaps = currentTotalTaps + 1

    const updateData = {
      points: newPoints,
      daily_taps: newDailyTaps,
      total_taps: newTotalTaps,
      last_tap_timestamp: now.toISOString()
    }

    if (!userPoint) {
      // Insert new
      const { error: insertError } = await supabaseClient
        .from('user_points')
        .insert({ 
          wallet_address, 
          network,
          ...updateData 
        })
      if (insertError) throw insertError
    } else {
      // Update existing
      const { error: updateError } = await supabaseClient
        .from('user_points')
        .update(updateData)
        .eq('wallet_address', wallet_address)
        .eq('network', network)
      if (updateError) throw updateError
    }

    return Response.json({ 
      success: true, 
      points: newPoints, 
      daily_taps: newDailyTaps,
      message: 'Tap successful! +1 point' 
    }, { headers: corsHeaders })

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { 
      status: 400, 
      headers: corsHeaders 
    })
  }
})

