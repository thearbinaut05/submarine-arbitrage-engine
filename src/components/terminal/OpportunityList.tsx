import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { OpportunityCard } from './OpportunityCard';
import { ArbitrageOpportunity } from '@/types/defi';
import { Zap, Radio } from 'lucide-react';

interface OpportunityListProps {
  opportunities: ArbitrageOpportunity[];
  onExecute: (id: string) => void;
  isScanning: boolean;
}

export function OpportunityList({ opportunities, onExecute, isScanning }: OpportunityListProps) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className={`w-4 h-4 ${isScanning ? 'text-accent' : 'text-muted-foreground'}`} />
            {isScanning && (
              <motion.div
                className="absolute inset-0 bg-accent/30 rounded-full"
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <h3 className="font-sans font-semibold text-foreground">Live Opportunities</h3>
          <span className="text-xs text-muted-foreground">
            ({opportunities.length} found)
          </span>
        </div>
        {isScanning && (
          <motion.div
            className="flex items-center gap-2 text-xs text-accent"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Zap className="w-3 h-3" />
            Scanning...
          </motion.div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {opportunities.length > 0 ? (
            opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onExecute={onExecute}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full min-h-[300px] text-center"
            >
              <div className="relative mb-4">
                <Zap className="w-12 h-12 text-muted-foreground/50" />
                <motion.div
                  className="absolute inset-0 bg-primary/20 blur-xl rounded-full"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <h4 className="font-sans font-semibold text-foreground mb-2">
                {isScanning ? 'Scanning for Opportunities...' : 'No Opportunities Yet'}
              </h4>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                {isScanning 
                  ? 'The scanner is actively searching for profitable arbitrage opportunities across networks.'
                  : 'Start the scanner to begin detecting flash loan and arbitrage opportunities.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
