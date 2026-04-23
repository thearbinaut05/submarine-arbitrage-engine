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

    try {
      const { data, error } = await (supabase as any)
        .from('user_points')
        .select('points, daily_taps, total_taps, last_tap_timestamp')
        .eq('wallet_address', walletAddress)
        .eq('network', network)
        .maybeSingle()

      if (error) {
        console.warn('Unable to load tap points:', error.message ?? error)
        return
      }

      if (data) {
        setPoints({
          points: data.points ?? 0,
          dailyTaps: data.daily_taps ?? 0,
          totalTaps: data.total_taps ?? 0,
          lastTap: data.last_tap_timestamp || null
        })
      }
    } catch (error) {
      console.warn('Unable to load tap points:', error)
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

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('Tap-to-earn request failed:', errorText)
        return false
      }

      const result = await response.json()
      if (result.success) {
        setPoints(prev => ({
          ...prev,
          points: result.points,
          dailyTaps: result.daily_taps,
          totalTaps: typeof result.total_taps === 'number' ? result.total_taps : prev.totalTaps + 1,
          lastTap: new Date().toISOString()
        }))
        setIsTapped(true)
        setTimeout(() => setIsTapped(false), 3000)
        return true
      }
      console.warn('Tap-to-earn rejected:', result.error ?? 'Unknown error')
    } catch (error) {
      console.warn('Tap-to-earn request failed:', error)
    }
    finally {
      setLoading(false)
    }
    return false
  }, [walletAddress, network, points.dailyTaps, isTapped, loading])

  const viewAd = useCallback(async (revenueCents = 0.1) => {
    if (!walletAddress) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-ad-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress, revenue_cents: revenueCents })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('Ad tracking request failed:', errorText)
      }
    } catch (error) {
      console.warn('Ad tracking request failed:', error)
    }
  }, [walletAddress])

  const fetchAdStats = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-gas-pool`)
      if (!response.ok) {
        const errorText = await response.text()
        console.warn('Gas pool stats request failed:', errorText)
        return
      }

      const result = await response.json()
      if (result.success) {
        setAdStats({ 
          todayRevenue: Number(result.today_ad_revenue_cents || 0), 
          totalViews: Number(result.total_logs || 0) 
        })
      }
    } catch (error) {
      console.warn('Gas pool stats request failed:', error)
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

