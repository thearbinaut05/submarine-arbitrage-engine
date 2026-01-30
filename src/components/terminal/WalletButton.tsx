import { motion } from 'framer-motion';
import { Wallet, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WalletState } from '@/types/defi';
import { TokenBalance, EnhancedWalletState } from '@/hooks/useWallet';

interface WalletButtonProps {
  wallet: EnhancedWalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh?: () => void;
}

export function WalletButton({ wallet, onConnect, onDisconnect, onRefresh }: WalletButtonProps) {
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
      <DropdownMenuContent align="end" className="w-64">
        {/* Wallet Balance Section */}
        <div className="px-2 py-2">
          <div className="text-xs text-muted-foreground mb-1">Native Balance</div>
          <div className="text-lg font-semibold text-foreground">
            {parseFloat(wallet.balance).toFixed(4)} ETH
          </div>
          {wallet.lastUpdated && (
            <div className="text-xs text-muted-foreground mt-1">
              Updated: {new Date(wallet.lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Token Balances */}
        {wallet.tokens.length > 0 && (
          <>
            <div className="px-2 py-1">
              <div className="text-xs text-muted-foreground">Token Balances</div>
            </div>
            {wallet.tokens.slice(0, 5).map((token) => (
              <DropdownMenuItem key={token.address} className="flex justify-between cursor-default">
                <span className="text-foreground">{token.symbol}</span>
                <span className="text-muted-foreground font-mono">
                  {parseFloat(token.balance).toFixed(token.decimals > 6 ? 4 : 2)}
                </span>
              </DropdownMenuItem>
            ))}
            {wallet.tokens.length > 5 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs text-muted-foreground">
                  +{wallet.tokens.length - 5} more tokens
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {wallet.tokens.slice(5).map((token) => (
                    <DropdownMenuItem key={token.address} className="flex justify-between cursor-default">
                      <span className="text-foreground">{token.symbol}</span>
                      <span className="text-muted-foreground font-mono">
                        {parseFloat(token.balance).toFixed(token.decimals > 6 ? 4 : 2)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuSeparator />
          </>
        )}

        {/* Refresh Option */}
        {onRefresh && (
          <DropdownMenuItem onClick={onRefresh} disabled={wallet.isLoadingTokens}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {wallet.isLoadingTokens ? 'Refreshing...' : 'Refresh Balance'}
          </DropdownMenuItem>
        )}

        {/* Disconnect */}
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
