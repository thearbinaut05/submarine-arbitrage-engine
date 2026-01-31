import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Zap,
  Loader2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Position, Network } from '@/types/defi';
import { cn } from '@/lib/utils';

const mockPositions: Position[] = [
  {
    id: '1',
    protocol: 'Aave V3',
    network: 'ethereum',
    type: 'lending',
    asset: 'WETH',
    amount: 10.5,
    valueUsd: 34125,
    apy: 2.4,
    healthFactor: 1.82,
    collateral: 34125,
    debt: 18750,
  },
  {
    id: '2',
    protocol: 'Compound',
    network: 'arbitrum',
    type: 'borrowing',
    asset: 'USDC',
    amount: 18750,
    valueUsd: 18750,
    apy: -3.2,
    healthFactor: 1.82,
  },
  {
    id: '3',
    protocol: 'Uniswap V3',
    network: 'polygon',
    type: 'lp',
    asset: 'ETH/USDC',
    amount: 1,
    valueUsd: 12500,
    apy: 24.5,
  },
];

const networkIcons: Record<Network, string> = {
  ethereum: '⟠',
  arbitrum: '🔵',
  polygon: '🟣',
  bsc: '🟡',
  optimism: '🔴',
  base: '🔵',
  avalanche: '🔺',
};

interface PositionRebalancerProps {
  isWalletConnected: boolean;
}

export function PositionRebalancer({ isWalletConnected }: PositionRebalancerProps) {
  const [positions] = useState<Position[]>(mockPositions);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  const totalValue = positions.reduce((sum, p) => sum + p.valueUsd, 0);
  const totalDebt = positions.filter(p => p.type === 'borrowing').reduce((sum, p) => sum + p.valueUsd, 0);
  const netValue = totalValue - totalDebt;

  const handleRebalance = async () => {
    setIsRebalancing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsRebalancing(false);
  };

  const togglePosition = (id: string) => {
    setSelectedPositions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className={cn(
            "w-5 h-5",
            isRebalancing ? "text-primary animate-spin" : "text-primary"
          )} />
          <h3 className="font-sans font-semibold text-foreground">Position Rebalancer</h3>
        </div>
        <Button
          onClick={handleRebalance}
          disabled={!isWalletConnected || isRebalancing || selectedPositions.length === 0}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isRebalancing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Rebalancing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Rebalance Selected
            </>
          )}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Total Value</div>
          <div className="text-lg font-bold text-foreground">${totalValue.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Total Debt</div>
          <div className="text-lg font-bold text-destructive">${totalDebt.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Net Value</div>
          <div className="text-lg font-bold text-accent text-glow-green">${netValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Positions */}
      <div className="space-y-2">
        {positions.map((position) => (
          <motion.div
            key={position.id}
            whileHover={{ scale: 1.01 }}
            onClick={() => togglePosition(position.id)}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-all",
              selectedPositions.includes(position.id)
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-muted/30 hover:border-primary/30"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{networkIcons[position.network]}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">{position.asset}</div>
                  <div className="text-xs text-muted-foreground">{position.protocol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">
                  ${position.valueUsd.toLocaleString()}
                </div>
                <div className={cn(
                  "text-xs flex items-center gap-1",
                  position.apy >= 0 ? "text-accent" : "text-destructive"
                )}>
                  {position.apy >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {position.apy >= 0 ? '+' : ''}{position.apy}% APY
                </div>
              </div>
            </div>

            {position.healthFactor && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Health Factor</span>
                  <span className={cn(
                    "text-xs font-medium",
                    position.healthFactor > 1.5 ? "text-accent" :
                    position.healthFactor > 1.2 ? "text-neon-orange" : "text-destructive"
                  )}>
                    {position.healthFactor.toFixed(2)}
                  </span>
                </div>
                <Progress 
                  value={Math.min(position.healthFactor / 2 * 100, 100)} 
                  className="h-1.5"
                />
                {position.healthFactor < 1.3 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-neon-orange">
                    <AlertTriangle className="w-3 h-3" />
                    Low health factor - consider rebalancing
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  position.type === 'lending' && "border-accent/50 text-accent",
                  position.type === 'borrowing' && "border-destructive/50 text-destructive",
                  position.type === 'lp' && "border-neon-purple/50 text-neon-purple",
                  position.type === 'staking' && "border-neon-orange/50 text-neon-orange"
                )}
              >
                {position.type.toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {position.amount} {position.asset.split('/')[0]}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {!isWalletConnected && (
        <p className="text-xs text-center text-muted-foreground mt-4">
          Connect your wallet to manage positions
        </p>
      )}
    </div>
  );
}
