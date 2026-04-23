import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export interface TapPoints {
  points: number
  dailyTaps: number
  totalTaps: number
  lastTap: string | null
}

export interface AdStats {
  todayRevenue: number
  totalViews: number
}

export function useTapToEarn(walletAddress: string | null, network: string = 'ethereum') {
  const [points, setPoints] = useState<TapPoints>({ points: 0, dailyTaps: 0, totalTaps: 0, lastTap: null })
  const [isTapped, setIsTapped] = useState(false)
  const [adStats, setAdStats] = useState<AdStats>({ todayRevenue: 0, totalViews: 0 })
  const [loading, setLoading] = useState(false)

  const fetchPoints = useCallback(async () => {
    if (!walletAddress) return

    // user_tap_stats table is not in generated types yet; query via untyped client
    const { data } = await (supabase as any)
      .from('user_tap_stats')
      .select('*')
      .eq('wallet_address', walletAddress)
      .eq('network', network)
      .maybeSingle()

    if (data) {
      setPoints({
        points: data.points ?? 0,
        dailyTaps: data.daily_taps ?? 0,
        totalTaps: data.total_taps ?? 0,
        lastTap: data.last_tap_timestamp || null
      })
    }
  }, [walletAddress, network])

  const tap = useCallback(async () => {
    if (!walletAddress || points.dailyTaps >= 100 || isTapped || loading) return false

    setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-tap-earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, network })
      })

      const result = await response.json()
      if (result.success) {
        setPoints(prev => ({
          ...prev,
          points: result.points,
          dailyTaps: result.daily_taps,
          totalTaps: result.daily_taps + 1 // Approximate
        }))
        setIsTapped(true)
        setTimeout(() => setIsTapped(false), 3000)
        return true
      }
    } catch {}
    finally {
      setLoading(false)
    }
    return false
  }, [walletAddress, network, points.dailyTaps, isTapped, loading])

  const viewAd = useCallback(async (revenueCents = 0.1) => {
    if (!walletAddress) return

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-ad-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress, revenue_cents: revenueCents })
    })
  }, [walletAddress])

  const fetchAdStats = useCallback(async () => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-gas-pool`)
    const result = await response.json()
    if (result.success) {
      setAdStats({ 
        todayRevenue: result.today_ad_revenue_cents || 0, 
        totalViews: result.total_logs || 0 
      })
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (walletAddress) {
      fetchPoints()
      fetchAdStats()
    }
  }, [walletAddress, fetchPoints, fetchAdStats])

  // Refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPoints()
      fetchAdStats()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchPoints, fetchAdStats])

  return {
    points,
    adStats,
    tap,
    viewAd,
    isTapped,
    loading,
    refetch: fetchPoints
  }
}

