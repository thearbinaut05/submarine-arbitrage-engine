import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  ArrowRight, 
  Clock, 
  Fuel, 
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArbitrageOpportunity, Network } from '@/types/defi';
import { cn } from '@/lib/utils';

interface OpportunityCardProps {
  opportunity: ArbitrageOpportunity;
  onExecute: (id: string) => void;
}

const networkColors: Record<Network, string> = {
  ethereum: 'bg-network-eth',
  arbitrum: 'bg-network-arb',
  polygon: 'bg-network-polygon',
  bsc: 'bg-network-bsc',
};

const networkIcons: Record<Network, string> = {
  ethereum: '⟠',
  arbitrum: '🔵',
  polygon: '🟣',
  bsc: '🟡',
};

export function OpportunityCard({ opportunity, onExecute }: OpportunityCardProps) {
  const isProfit = opportunity.netProfit > 0;
  const isExecuting = opportunity.status === 'executing';
  const isCompleted = opportunity.status === 'completed';
  const isFailed = opportunity.status === 'failed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        "opportunity-card relative p-4 rounded-lg border bg-card",
        isProfit ? "border-accent/30" : "border-destructive/30",
        isCompleted && "border-accent glow-green",
        isFailed && "border-destructive glow-red"
      )}
    >
      {/* Scanning effect overlay */}
      {opportunity.status === 'pending' && (
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <motion.div
            className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ y: [0, 100, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              opportunity.type === 'flash_loan' && "border-primary/50 text-primary",
              opportunity.type === 'flash_swap' && "border-neon-orange/50 text-neon-orange",
              opportunity.type === 'cross_chain' && "border-neon-purple/50 text-neon-purple"
            )}
          >
            {opportunity.type === 'flash_loan' && <Zap className="w-3 h-3 mr-1" />}
            {opportunity.type.replace('_', ' ').toUpperCase()}
          </Badge>
          <div className="flex items-center gap-1">
            <span className="text-sm">{networkIcons[opportunity.sourceNetwork]}</span>
            {opportunity.targetNetwork && (
              <>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm">{networkIcons[opportunity.targetNetwork]}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {new Date(opportunity.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <span className="font-medium text-foreground">{opportunity.tokenIn}</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-xs">{opportunity.sourceDex}</span>
          <ArrowRight className="w-3 h-3" />
          <span className="text-xs">{opportunity.targetDex}</span>
        </div>
        <span className="font-medium text-foreground">{opportunity.tokenOut}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="p-2 rounded-md bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">Profit</div>
          <div className={cn(
            "text-sm font-bold",
            isProfit ? "text-accent text-glow-green" : "text-destructive"
          )}>
            {isProfit ? '+' : ''}{opportunity.profitPercent.toFixed(2)}%
          </div>
        </div>
        <div className="p-2 rounded-md bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">Net USD</div>
          <div className={cn(
            "text-sm font-bold",
            opportunity.netProfit > 0 ? "text-accent" : "text-destructive"
          )}>
            ${opportunity.netProfit.toFixed(2)}
          </div>
        </div>
        <div className="p-2 rounded-md bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Fuel className="w-3 h-3" /> Gas
          </div>
          <div className="text-sm font-medium text-foreground">{opportunity.gasEstimate}</div>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <span className="text-xs font-medium text-foreground">{opportunity.confidence.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              opportunity.confidence > 80 ? "bg-accent" : 
              opportunity.confidence > 50 ? "bg-neon-orange" : "bg-destructive"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${opportunity.confidence}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center gap-2">
        {opportunity.status === 'pending' && (
          <Button
            onClick={() => onExecute(opportunity.id)}
            disabled={!isProfit}
            className={cn(
              "flex-1",
              isProfit 
                ? "bg-accent hover:bg-accent/90 text-accent-foreground" 
                : "bg-muted text-muted-foreground"
            )}
          >
            <Zap className="w-4 h-4 mr-2" />
            Execute Flash Loan
          </Button>
        )}
        {isExecuting && (
          <Button disabled className="flex-1 bg-primary/20 text-primary">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Executing...
          </Button>
        )}
        {isCompleted && (
          <Button variant="outline" className="flex-1 border-accent/50 text-accent">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Completed
            <ExternalLink className="w-3 h-3 ml-2" />
          </Button>
        )}
        {isFailed && (
          <Button variant="outline" className="flex-1 border-destructive/50 text-destructive">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Failed
          </Button>
        )}
      </div>
    </motion.div>
  );
}
