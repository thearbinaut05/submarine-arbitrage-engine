import { motion } from 'framer-motion';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WalletState } from '@/types/defi';

interface WalletButtonProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function WalletButton({ wallet, onConnect, onDisconnect }: WalletButtonProps) {
  const formatAddress = (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (!wallet.isConnected) {
    return (
      <Button
        onClick={onConnect}
        disabled={wallet.isConnecting}
        className="relative overflow-hidden bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/50 hover:border-primary text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-300"
      >
        {wallet.isConnecting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4 mr-2" />
        )}
        {wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-primary/50 hover:border-primary bg-card"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-foreground">{formatAddress(wallet.address!)}</span>
            <span className="text-xs text-muted-foreground">
              {parseFloat(wallet.balance).toFixed(4)} ETH
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={onDisconnect}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
