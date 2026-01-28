import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Activity,
  Globe,
  DollarSign,
  Clock,
  Target
} from 'lucide-react';
import { ArbitrageOpportunity } from '@/types/defi';
import { cn } from '@/lib/utils';

interface DashboardStatsProps {
  opportunities: ArbitrageOpportunity[];
  totalProfit: number;
  successRate: number;
  isScanning: boolean;
}

export function DashboardStats({ opportunities, totalProfit, successRate, isScanning }: DashboardStatsProps) {
  const completedOpps = opportunities.filter(o => o.status === 'completed');
  const pendingOpps = opportunities.filter(o => o.status === 'pending');
  const avgProfit = completedOpps.length > 0 
    ? completedOpps.reduce((sum, o) => sum + o.netProfit, 0) / completedOpps.length 
    : 0;

  const networkStats = opportunities.reduce((acc, opp) => {
    acc[opp.sourceNetwork] = (acc[opp.sourceNetwork] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Total Profit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg border border-border bg-card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Profit</span>
          </div>
          <div className="text-2xl font-bold text-accent text-glow-green">
            ${totalProfit.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3 text-accent" />
            <span>+12.5% from last session</span>
          </div>
        </div>
      </motion.div>

      {/* Success Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-lg border border-border bg-card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-primary text-glow-cyan">
            {(successRate * 100).toFixed(1)}%
          </div>
          <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${successRate * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Active Opportunities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-lg border border-border bg-card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Activity className={cn("w-4 h-4", isScanning ? "text-neon-orange" : "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Active Opps</span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {pendingOpps.length}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Zap className="w-3 h-3" />
            <span>{completedOpps.length} executed today</span>
          </div>
        </div>
      </motion.div>

      {/* Avg Profit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-lg border border-border bg-card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-neon-purple" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg Profit</span>
          </div>
          <div className={cn(
            "text-2xl font-bold",
            avgProfit > 0 ? "text-accent" : "text-foreground"
          )}>
            ${avgProfit.toFixed(2)}
          </div>
          <div className="flex gap-1 mt-1">
            {Object.entries(networkStats).slice(0, 4).map(([network, count]) => (
              <span 
                key={network} 
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {network.slice(0, 3).toUpperCase()}: {count}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
