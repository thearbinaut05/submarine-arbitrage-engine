import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Zap, 
  Settings2,
  TrendingUp,
  Activity,
  Target,
  Gauge,
  CheckCircle2,
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScannerConfig, Network } from '@/types/defi';
import { cn } from '@/lib/utils';
import { useState } from 'react';

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

const networkConfig: { id: Network; label: string; icon: string; color: string }[] = [
  { id: 'ethereum', label: 'Ethereum', icon: '⟠', color: 'bg-eth-blue' },
  { id: 'arbitrum', label: 'Arbitrum', icon: '🔵', color: 'bg-arb-blue' },
  { id: 'polygon', label: 'Polygon', icon: '🟣', color: 'bg-polygon-purple' },
  { id: 'bsc', label: 'BSC', icon: '🟡', color: 'bg-bsc-yellow' },
];

export function ScannerControls({ 
  config, 
  stats, 
  onStart, 
  onStop, 
  onToggleAutoExecute,
  onUpdateConfig 
}: ScannerControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleNetwork = (network: Network) => {
    const newNetworks = config.networks.includes(network)
      ? config.networks.filter(n => n !== network)
      : [...config.networks, network];
    onUpdateConfig({ networks: newNetworks });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-card to-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "relative p-2 rounded-lg",
              config.isActive ? "bg-accent/10" : "bg-muted"
            )}>
              <Zap className={cn(
                "w-5 h-5",
                config.isActive ? "text-accent" : "text-muted-foreground"
              )} />
              {config.isActive && (
                <>
                  <motion.div
                    className="absolute inset-0 bg-accent/30 blur-md rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute inset-0 bg-accent/20 rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </>
              )}
            </div>
            <div>
              <h3 className="font-sans font-semibold text-foreground">Arbitrage Scanner</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AnimatePresence mode="wait">
                  {config.isActive ? (
                    <motion.div
                      key="active"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="flex items-center gap-1 text-accent"
                    >
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>Active - Scanning {config.networks.length} networks</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="flex items-center gap-1"
                    >
                      <span>Ready to scan</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          <Button
            onClick={config.isActive ? onStop : onStart}
            size="sm"
            className={cn(
              "min-w-[100px] shadow-lg",
              config.isActive 
                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                : "bg-accent hover:bg-accent/90 text-accent-foreground"
            )}
          >
            <AnimatePresence mode="wait">
              {config.isActive ? (
                <motion.div
                  key="stop"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </motion.div>
              ) : (
                <motion.div
                  key="start"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        <StatCard 
          icon={Activity} 
          label="Scanned" 
          value={stats.totalScanned.toLocaleString()} 
          color="text-foreground"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Total Profit" 
          value={`$${stats.totalProfit.toFixed(2)}`}
          isPositive={stats.totalProfit > 0}
          color={stats.totalProfit > 0 ? "text-accent" : "text-foreground"}
        />
        <StatCard 
          icon={Target} 
          label="Success Rate" 
          value={`${(stats.successRate * 100).toFixed(1)}%`}
          color="text-primary"
        />
        <StatCard 
          icon={Gauge} 
          label="Scan Speed" 
          value={`${(1000 / Math.max(config.scanInterval, 100)).toFixed(1)}/s`}
          color="text-neon-purple"
        />
      </div>

      {/* Auto Execute Toggle */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg transition-colors",
              config.autoExecute ? "bg-accent/10" : "bg-muted"
            )}>
              <Zap className={cn(
                "w-5 h-5",
                config.autoExecute ? "text-accent" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Auto-Execute</div>
              <div className="text-xs text-muted-foreground">
                Automatically execute opportunities with confidence {'>'} 80%
              </div>
            </div>
          </div>
          <Switch
            checked={config.autoExecute}
            onCheckedChange={onToggleAutoExecute}
            className="data-[state=checked]:bg-accent"
          />
        </div>
      </div>

      {/* Network Selection */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Networks</span>
            <Badge variant="secondary" className="text-xs">
              {config.networks.length} active
            </Badge>
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {networkConfig.map(network => {
            const isActive = config.networks.includes(network.id);
            return (
              <motion.button
                key={network.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleNetwork(network.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all relative overflow-hidden",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
                )}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-primary/5"
                    layoutId="network-active"
                  />
                )}
                <span className="text-lg">{network.icon}</span>
                <div className="text-left">
                  <div className="text-xs font-medium">{network.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                {isActive && (
                  <CheckCircle2 className="w-4 h-4 text-accent ml-auto" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Advanced Settings */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Min Profit %</span>
                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
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
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>0.1%</span>
                  <span>5%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Min Profit USD</span>
                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
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
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>$10</span>
                  <span>$500</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Scan Interval (ms)</span>
                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                    {config.scanInterval}ms
                  </Badge>
                </div>
                <Slider
                  value={[config.scanInterval]}
                  onValueChange={([value]) => onUpdateConfig({ scanInterval: value })}
                  min={500}
                  max={5000}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>500ms</span>
                  <span>5000ms</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface StatCardProps {
  icon: typeof Activity;
  label: string;
  value: string;
  isPositive?: boolean;
  color?: string;
}

function StatCard({ icon: Icon, label, value, isPositive, color }: StatCardProps) {
  return (
    <div className="p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color || "text-muted-foreground")} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn(
        "text-xl font-bold",
        isPositive ? "text-accent" : color || "text-foreground"
      )}>
        {value}
      </div>
    </div>
  );
}

