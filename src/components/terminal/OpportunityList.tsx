import { motion, AnimatePresence } from 'framer-motion';
import { OpportunityCard } from './OpportunityCard';
import { ArbitrageOpportunity } from '@/types/defi';
import { Zap, Radio, Loader2, Search, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

interface OpportunityListProps {
  opportunities: ArbitrageOpportunity[];
  onExecute: (id: string) => void;
  isScanning: boolean;
}

export function OpportunityList({ opportunities, onExecute, isScanning }: OpportunityListProps) {
  const [sortBy, setSortBy] = useState<'profit' | 'confidence' | 'time'>('profit');
  const [filterProfit, setFilterProfit] = useState<number | null>(null);

  const sortedAndFilteredOpportunities = useMemo(() => {
    let result = [...opportunities];

    // Apply filter
    if (filterProfit !== null) {
      result = result.filter(opp => opp.profitPercent >= filterProfit);
    }

    // Apply sorting
    switch (sortBy) {
      case 'profit':
        result.sort((a, b) => b.netProfit - a.netProfit);
        break;
      case 'confidence':
        result.sort((a, b) => b.confidence - a.confidence);
        break;
      case 'time':
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
    }

    return result;
  }, [opportunities, sortBy, filterProfit]);

  const profitableCount = opportunities.filter(o => o.netProfit > 0).length;
  const totalValue = opportunities.reduce((sum, o) => sum + o.profitUsd, 0);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
<Radio className={cn(
                "w-4 h-4",
                isScanning ? "text-accent" : "text-muted-foreground animate-pulse"
              )} />
              {isScanning && (
                <motion.div
                  className="absolute inset-0 bg-accent/30 rounded-full"
                  animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
            <h3 className="font-sans font-semibold text-foreground">Live Opportunities</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                ({sortedAndFilteredOpportunities.length})
              </span>
              {isScanning && (
                <motion.div
                  className="flex items-center gap-1 text-xs text-accent"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Zap className="w-3 h-3" />
                  Scanning...
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-accent" />
              <span className="text-muted-foreground">Profit:</span>
              <span className="font-medium text-accent">${totalValue.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Profitable:</span>
              <span className="font-medium text-accent">{profitableCount}</span>
              <span className="text-muted-foreground">/ {opportunities.length}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <div className="flex rounded-lg bg-muted/50 p-0.5">
              {(['profit', 'confidence', 'time'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    sortBy === option
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Min profit:</span>
            <select
              value={filterProfit ?? ''}
              onChange={(e) => setFilterProfit(e.target.value ? Number(e.target.value) : null)}
              className="bg-muted/50 border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All</option>
              <option value="0.5">0.5%</option>
              <option value="1">1%</option>
              <option value="2">2%</option>
              <option value="5">5%</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {sortedAndFilteredOpportunities.length > 0 ? (
            sortedAndFilteredOpportunities.map((opp, index) => (
              <motion.div
                key={opp.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <OpportunityCard
                  opportunity={opp}
                  onExecute={onExecute}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
            >
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center">
                  {isScanning ? (
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  ) : (
                    <Search className="w-10 h-10 text-muted-foreground/50" />
                  )}
                </div>
                <motion.div
                  className="absolute inset-0 bg-primary/20 blur-xl rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              
              <h4 className="font-sans font-semibold text-lg text-foreground mb-2">
                {isScanning ? 'Scanning for Opportunities...' : 'No Opportunities Found'}
              </h4>
              <p className="text-sm text-muted-foreground max-w-[350px] mb-4">
                {isScanning 
                  ? 'The scanner is actively searching for profitable arbitrage opportunities across all configured networks.'
                  : filterProfit 
                  ? `No opportunities found with minimum ${filterProfit}% profit. Try lowering the filter or start the scanner.`
                  : 'Start the scanner to begin detecting flash loan and arbitrage opportunities across supported networks.'}
              </p>

              {!isScanning && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Start Scanner
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Loading skeleton component
export function OpportunityListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
          <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-8 w-full bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

