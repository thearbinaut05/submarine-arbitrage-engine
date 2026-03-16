import { useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, MousePointerClick, ShieldCheck, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AdBannerProps {
  onViewAd?: () => void
  revenueCents?: number
  className?: string
}

export function AdBanner({ onViewAd, revenueCents
