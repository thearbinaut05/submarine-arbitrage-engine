import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Zap, 
  Settings2,
  TrendingUp,
  Activity,
  Target,
  Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScannerConfig, Network } from '@/types/defi';
import { cn } from '@/lib/utils';

interface ScannerControlsProps {
  config: ScannerConfig;
  stats: {
    totalScanned: number;
    totalProfit: number;
    successRate: number;
    avgProfit: number;
  };
  onStart: () => void;
  onStop: () => void;
  onToggleAutoExecute: () => void;
  onUpdateConfig: (updates: Partial<ScannerConfig>) => void;
}

const networkConfig: { id: Network; label: string; icon: string }[] = [
  { id: 'ethereum', label: 'ETH', icon: '⟠' },
  { id: 'arbitrum', label: 'ARB', icon: '🔵' },
  { id: 'polygon', label: 'MATIC', icon: '🟣' },
  { id: 'bsc', label: 'BSC', icon: '🟡' },
];

export function ScannerControls({ 
  config, 
  stats, 
  onStart, 
  onStop, 
  onToggleAutoExecute,
  onUpdateConfig 
}: ScannerControlsProps) {
  const toggleNetwork = (network: Network) => {
    const newNetworks = config.networks.includes(network)
      ? config.networks.filter(n => n !== network)
      : [...config.networks, network];
    onUpdateConfig({ networks: newNetworks });
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Zap className={cn(
              "w-5 h-5",
              config.isActive ? "text-accent" : "text-muted-foreground"
            )} />
            {config.isActive && (
              <motion.div
                className="absolute inset-0 bg-accent/30 blur-md rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <h3 className="font-sans font-semibold text-foreground">Arbitrage Scanner</h3>
        </div>
        <Button
          onClick={config.isActive ? onStop : onStart}
          size="sm"
          className={cn(
            "min-w-[100px]",
            config.isActive 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-accent hover:bg-accent/90 text-accent-foreground"
          )}
        >
          {config.isActive ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Start
            </>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Activity} label="Scanned" value={stats.totalScanned.toString()} />
        <StatCard 
          icon={TrendingUp} 
          label="Total Profit" 
          value={`$${stats.totalProfit.toFixed(2)}`} 
          isPositive={stats.totalProfit > 0}
        />
        <StatCard 
          icon={Target} 
          label="Success Rate" 
          value={`${(stats.successRate * 100).toFixed(1)}%`} 
        />
        <StatCard 
          icon={Gauge} 
          label="Scan Speed" 
          value={`${(1000 / config.scanInterval).toFixed(1)}/s`} 
        />
      </div>

      {/* Auto Execute Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Zap className={cn(
            "w-4 h-4",
            config.autoExecute ? "text-accent" : "text-muted-foreground"
          )} />
          <div>
            <div className="text-sm font-medium text-foreground">Auto-Execute</div>
            <div className="text-xs text-muted-foreground">
              Automatically execute high-confidence opportunities
            </div>
          </div>
        </div>
        <Switch
          checked={config.autoExecute}
          onCheckedChange={onToggleAutoExecute}
        />
      </div>

      {/* Network Selection */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Networks</span>
        </div>
        <div className="flex gap-2">
          {networkConfig.map(network => (
            <button
              key={network.id}
              onClick={() => toggleNetwork(network.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md border transition-all",
                config.networks.includes(network.id)
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
              )}
            >
              <span>{network.icon}</span>
              <span className="text-xs font-medium">{network.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Thresholds */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Min Profit %</span>
            <Badge variant="outline" className="text-xs">
              {config.minProfitPercent.toFixed(1)}%
            </Badge>
          </div>
          <Slider
            value={[config.minProfitPercent]}
            onValueChange={([value]) => onUpdateConfig({ minProfitPercent: value })}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Min Profit USD</span>
            <Badge variant="outline" className="text-xs">
              ${config.minProfitUsd}
            </Badge>
          </div>
          <Slider
            value={[config.minProfitUsd]}
            onValueChange={([value]) => onUpdateConfig({ minProfitUsd: value })}
            min={10}
            max={500}
            step={10}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: typeof Activity;
  label: string;
  value: string;
  isPositive?: boolean;
}

function StatCard({ icon: Icon, label, value, isPositive }: StatCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn(
        "text-lg font-bold",
        isPositive ? "text-accent text-glow-green" : "text-foreground"
      )}>
        {value}
      </div>
    </div>
  );
}
