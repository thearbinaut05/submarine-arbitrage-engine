import { motion } from 'framer-motion';
import { Activity, Zap, Shield, TrendingUp } from 'lucide-react';
import { WalletButton } from './WalletButton';
import { NetworkSelector } from './NetworkSelector';
import { useWallet } from '@/hooks/useWallet';

interface HeaderProps {
  totalProfit: number;
  successRate: number;
  isScanning: boolean;
}

export function Header({ totalProfit, successRate, isScanning }: HeaderProps) {
  const { wallet, connect, disconnect, switchNetwork, networks, refreshBalances } = useWallet();

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="relative">
            <Zap className="w-8 h-8 text-primary" />
            <motion.div
              className="absolute inset-0 bg-primary/30 blur-lg rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div>
            <h1 className="text-xl font-sans font-bold text-foreground">
              FLASH<span className="text-primary">ARB</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Arbitrage Terminal
            </p>
          </div>
        </motion.div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-4">
          <StatusIndicator 
            icon={Activity}
            label="Scanner"
            value={isScanning ? 'Active' : 'Idle'}
            isActive={isScanning}
          />
          <StatusIndicator
            icon={TrendingUp}
            label="Profit"
            value={`$${totalProfit.toFixed(2)}`}
            isPositive={totalProfit > 0}
          />
          <StatusIndicator
            icon={Shield}
            label="Success"
            value={`${(successRate * 100).toFixed(1)}%`}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NetworkSelector
          currentNetwork={wallet.network}
          networks={networks}
          onSelect={switchNetwork}
          disabled={!wallet.isConnected}
        />
        <WalletButton
          wallet={wallet}
          onConnect={connect}
          onDisconnect={disconnect}
          onRefresh={wallet.isConnected ? refreshBalances : undefined}
        />
      </div>
    </header>
  );
}

interface StatusIndicatorProps {
  icon: typeof Activity;
  label: string;
  value: string;
  isActive?: boolean;
  isPositive?: boolean;
}

function StatusIndicator({ icon: Icon, label, value, isActive, isPositive }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border border-border">
      <div className="relative">
        <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : isPositive ? 'text-neon-green' : 'text-muted-foreground'}`} />
        {isActive && (
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-medium ${isPositive ? 'text-neon-green text-glow-green' : 'text-foreground'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
