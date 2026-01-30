import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Zap, 
  Activity,
  DollarSign,
  Target,
  Clock,
  Zap as ZapIcon
} from 'lucide-react';
import { ArbitrageOpportunity } from '@/types/defi';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface DashboardStatsProps {
  opportunities: ArbitrageOpportunity[];
  totalProfit: number;
  successRate: number;
  isScanning: boolean;
}

// Animated counter hook
function useAnimatedCounter(value: number, duration: number = 1000) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const startValue = displayValue;
    const diff = value - startValue;
    
    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + diff * easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
    return () => cancelAnimationFrame(startTime as number);
  }, [value, duration]);
  
  return displayValue;
}

export function DashboardStats({ opportunities, totalProfit, successRate, isScanning }: DashboardStatsProps) {
  const completedOpps = opportunities.filter(o => o.status === 'completed');
  const pendingOpps = opportunities.filter(o => o.status === 'pending');
  const avgProfit = completedOpps.length > 0 
    ? completedOpps.reduce((sum, o) => sum + o.netProfit, 0) / completedOpps.length 
    : 0;

  const animatedProfit = useAnimatedCounter(totalProfit);
  const animatedSuccess = useAnimatedCounter(successRate * 100);
  const animatedAvg = useAnimatedCounter(avgProfit);

  const networkStats = opportunities.reduce((acc, opp) => {
    acc[opp.sourceNetwork] = (acc[opp.sourceNetwork] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Profit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-5 rounded-xl border border-border bg-card relative overflow-hidden",
          totalProfit > 0 && "border-accent/30"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
        <motion.div 
          className="absolute inset-0 bg-accent/10"
          animate={{ 
            opacity: [0, 0.3, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="w-5 h-5 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Profit</span>
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              totalProfit > 0 ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
            )}>
              {totalProfit > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {totalProfit > 0 ? '+' : ''}{((totalProfit / (totalProfit > 0 ? totalProfit : 1)) * 12.5).toFixed(1)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-accent text-glow-green mb-2">
            ${animatedProfit.toFixed(2)}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>From {completedOpps.length} completed trades</span>
          </div>
        </div>
      </motion.div>

      {/* Success Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl border border-border bg-card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Success Rate</span>
            </div>
            <AnimatePresence mode="wait">
              {isScanning ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium"
                >
                  <ZapIcon className="w-3 h-3 animate-pulse" />
                  Scanning
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    animatedSuccess >= 80 ? "bg-accent/20 text-accent" :
                    animatedSuccess >= 50 ? "bg-neon-orange/20 text-neon-orange" : "bg-destructive/20 text-destructive"
                  )}
                >
                  {animatedSuccess >= 80 ? 'Excellent' : animatedSuccess >= 50 ? 'Good' : 'Needs Work'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="text-3xl font-bold text-primary text-glow-cyan mb-2">
            {animatedSuccess.toFixed(1)}%
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                animatedSuccess >= 80 ? "bg-accent" :
                animatedSuccess >= 50 ? "bg-neon-orange" : "bg-destructive"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(animatedSuccess, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Activity className="w-3 h-3" />
            <span>Based on {completedOpps.length + pendingOpps.length} total opportunities</span>
          </div>
        </div>
      </motion.div>

      {/* Active Opportunities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl border border-border bg-card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                isScanning ? "bg-neon-orange/10" : "bg-muted"
              )}>
                <Activity className={cn(
                  "w-5 h-5",
                  isScanning ? "text-neon-orange animate-pulse" : "text-muted-foreground"
                )} />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Opps</span>
            </div>
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-neon-orange/20 text-neon-orange text-xs font-medium"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-neon-orange"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  Live
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="text-3xl font-bold text-foreground mb-2">
            {pendingOpps.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(networkStats).slice(0, 4).map(([network, count]) => (
              <motion.span 
                key={network} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium"
              >
                {network.slice(0, 3).toUpperCase()}: {count}
              </motion.span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <ZapIcon className="w-3 h-3" />
            <span>{completedOpps.length} executed today</span>
          </div>
        </div>
      </motion.div>

      {/* Average Profit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-5 rounded-xl border border-border bg-card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-neon-purple/10">
                <BarChart3 className="w-5 h-5 text-neon-purple" />
              </div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Profit</span>
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              animatedAvg > 0 ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
            )}>
              {animatedAvg > 0 ? 'Profitable' : 'No Data'}
            </div>
          </div>
          <div className={cn(
            "text-3xl font-bold mb-2",
            animatedAvg > 0 ? "text-accent text-glow-green" : "text-foreground"
          )}>
            ${animatedAvg.toFixed(2)}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min</span>
              <span>Max</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-neon-purple rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '60%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <DollarSign className="w-3 h-3" />
            <span>Per successful trade</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

