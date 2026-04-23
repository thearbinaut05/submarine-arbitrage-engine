import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

const { wallet_address, ad_type = 'banner_impression', duration_seconds = 5, revenue_cents = 0.1 }: any = await req.json()

    const adEvent = {
      wallet_address,
      ad_type,
      estimated_revenue: revenue_cents / 100, // USD
      duration_seconds: Number(duration_seconds),
      created_at: new Date().toISOString()
    }

    const { error } = await supabaseClient
      .from('ad_events')
      .insert(adEvent)

    if (error) {
      // Table missing or RLS denies — don't fail the client; log and return ok
      console.warn('ad_events insert failed:', error.message, error.code)
      return Response.json({ 
        success: true, 
        skipped: true,
        reason: error.message,
        message: 'Ad view acknowledged (storage unavailable)'
      }, { headers: corsHeaders })
    }

    console.log(`Ad revenue logged: $${revenue_cents/100} from ${wallet_address} (${ad_type})`)

    return Response.json({ 
      success: true, 
      message: 'Ad view tracked'
    }, { headers: corsHeaders })

  } catch (error) {
    const message = error instanceof Error ? error.message : (typeof error === 'string' ? error : JSON.stringify(error))
    console.error('track-ad-view error:', message)
    return Response.json({ success: false, error: message }, { 
      status: 400, 
      headers: corsHeaders 
    })
  }
})

