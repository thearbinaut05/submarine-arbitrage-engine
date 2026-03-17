import React, { useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, MousePointerClick, ShieldCheck, DollarSign, Zap, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useTapToEarn } from '@/hooks/useTapToEarn'

interface AdBannerProps {
  onViewAd?: () => void
  revenueCents?: number
  className?: string
  walletAddress?: string | null
  network?: string
}

const SELF_PROMO_ADS = [
  {
    title: '🚀 Gasless Arbitrage Live',
    description: 'Execute profitable trades without gas fees. Sponsored by ad revenue pool.',
    cta: 'Start Scanner',
    icon: Zap,
    action: 'scanner_promo',
    revenue: 0.05
  },
  {
    title: '💎 Tap to Earn Points',
    description: 'Tap daily for points. Redeem for gas rebates and priority execution.',
    cta: 'Tap Now +1pt',
    icon: MousePointerClick,
    action: 'tap_earn',
    revenue: 0.02
  },
  {
    title: '🛡️ Embedded Wallets Ready',
    description: 'Smart accounts with gas sponsorship. No seed phrase needed.',
    cta: 'Create Wallet',
    icon: ShieldCheck,
    action: 'embedded_wallet',
    revenue: 0.03
  },
  {
    title: '📈 Sponsor Pool Live',
    description: 'Your taps + ad views fund the gas pool. Current balance updates realtime.',
    cta: 'Check Pool',
    icon: DollarSign,
    action: 'gas_pool',
    revenue: 0.04
  },
  {
    title: '⚡ Real Profits Found',
    description: 'Scanner detects live opportunities. Auto-execute with MEV protection.',
    cta: 'View Opportunities',
    icon: BarChart3,
    action: 'opportunities',
    revenue: 0.06
  }
]

export function AdBanner({ onViewAd, revenueCents = 0.05, className = '', walletAddress, network }: AdBannerProps) {
  const [currentAdIndex, setCurrentAdIndex] = useState(0)
  const [hasViewed, setHasViewed] = useState(false)
  const { viewAd } = useTapToEarn(walletAddress || '', network || 'ethereum')

  const currentAd = SELF_PROMO_ADS[currentAdIndex]

  // Auto-track impression on mount
  useEffect(() => {
    if (!hasViewed && walletAddress) {
      const timer = setTimeout(() => {
        viewAd(currentAd.revenue)
        setHasViewed(true)
        onViewAd?.()
      }, 1000) // Track after 1s view time
      return () => clearTimeout(timer)
    }
  }, [hasViewed, walletAddress, currentAd.revenue, viewAd, onViewAd])

  // Rotate ads every 8s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % SELF_PROMO_ADS.length)
      setHasViewed(false) // Reset for new ad
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const handleClick = useCallback(() => {
    // Bonus revenue for click
    viewAd(currentAd.revenue * 3)
    console.log(`Ad clicked: ${currentAd.action}`)
    // Could trigger analytics or navigation
  }, [currentAd, viewAd])

  const IconComponent = currentAd.icon

  return (
    <motion.div
      className={cn('w-full max-w-md', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5 hover:border-accent/50 transition-all overflow-hidden cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-2">
            <motion.div 
              className="p-2 rounded-xl bg-accent/20 group-hover:bg-accent/30 transition-all"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <IconComponent className="w-6 h-6 text-accent" />
            </motion.div>
            <CardTitle className="text-lg font-bold leading-tight text-foreground group-hover:text-accent">
              {currentAd.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {currentAd.description}
          </p>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs bg-accent/20 text-accent border-accent/30">
              +{currentAd.revenue.toFixed(3)}¢ revenue
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              className="border-accent/50 bg-accent/10 hover:bg-accent/20 text-accent font-medium"
              onClick={handleClick}
            >
              {currentAd.cta}
              <RefreshCw className="w-3 h-3 ml-1 animate-spin" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

