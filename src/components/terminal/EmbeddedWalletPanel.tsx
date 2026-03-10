import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, Copy, Key, RefreshCw, CheckCircle2, Shield, ExternalLink, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useEmbeddedWallet, EmbeddedWallet } from '@/hooks/useEmbeddedWallet';
import { cn } from '@/lib/utils';

const NETWORKS = ['ethereum', 'arbitrum', 'polygon', 'optimism', 'base', 'bsc', 'avalanche'];

const networkLabels: Record<string, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  optimism: 'Optimism',
  base: 'Base',
  bsc: 'BNB Chain',
  avalanche: 'Avalanche',
};

const explorerUrls: Record<string, string> = {
  ethereum: 'https://etherscan.io/address/',
  arbitrum: 'https://arbiscan.io/address/',
  polygon: 'https://polygonscan.com/address/',
  optimism: 'https://optimistic.etherscan.io/address/',
  base: 'https://basescan.org/address/',
  bsc: 'https://bscscan.com/address/',
  avalanche: 'https://snowtrace.io/address/',
};

const txExplorerUrls: Record<string, string> = {
  ethereum: 'https://etherscan.io/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  optimism: 'https://optimistic.etherscan.io/tx/',
  base: 'https://basescan.org/tx/',
  bsc: 'https://bscscan.com/tx/',
  avalanche: 'https://snowtrace.io/tx/',
};

interface EmbeddedWalletPanelProps {
  connectedWalletAddress: string | null;
}

export function EmbeddedWalletPanel({ connectedWalletAddress }: EmbeddedWalletPanelProps) {
  const { wallets, isLoading, createWallet, exportPrivateKey, withdrawFunds, fetchWallets } = useEmbeddedWallet();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<string | null>(null);
  const [creatingNetwork, setCreatingNetwork] = useState<string | null>(null);
  const [withdrawingNetwork, setWithdrawingNetwork] = useState<string | null>(null);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawResult, setWithdrawResult] = useState<{ success: boolean; message: string; hash?: string; network?: string } | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleCopy = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleCreate = async (network: string) => {
    setCreatingNetwork(network);
    await createWallet(network);
    setCreatingNetwork(null);
  };

  const handleExportKey = async (network: string) => {
    const confirmed = window.confirm(
      'Warning: Your private key gives full control of this wallet. Never share it. Continue?'
    );
    if (!confirmed) return;

    const key = await exportPrivateKey(network);
    if (key) {
      setShowPrivateKey(key);
      setTimeout(() => setShowPrivateKey(null), 30000);
    }
  };

  const handleWithdraw = async (network: string) => {
    if (!withdrawAddress || !withdrawAmount) return;
    
    const confirmed = window.confirm(
      `Send ${withdrawAmount} ETH to ${withdrawAddress} on ${networkLabels[network]}?`
    );
    if (!confirmed) return;

    setIsWithdrawing(true);
    setWithdrawResult(null);

    const result = await withdrawFunds(withdrawAddress, withdrawAmount, network);
    
    if (result.success) {
      setWithdrawResult({
        success: true,
        message: result.message || `Sent ${withdrawAmount} ETH`,
        hash: result.hash,
        network,
      });
      setWithdrawAddress('');
      setWithdrawAmount('');
      setWithdrawingNetwork(null);
    } else {
      setWithdrawResult({
        success: false,
        message: result.error || 'Withdraw failed',
      });
    }

    setIsWithdrawing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Profit Wallets</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => fetchWallets()} disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Profit Routing Info */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-2">
          <Wallet className="w-4 h-4 text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Profit Destination: </span>
            {connectedWalletAddress ? (
              <>Connected wallet <span className="font-mono text-primary">{connectedWalletAddress.slice(0,6)}...{connectedWalletAddress.slice(-4)}</span></>
            ) : (
              <>Embedded wallet (connect MetaMask to override)</>
            )}
          </div>
        </div>
      </div>

      {/* Withdraw Result */}
      {withdrawResult && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={cn(
            "p-3 rounded-lg border",
            withdrawResult.success 
              ? "bg-accent/10 border-accent/30" 
              : "bg-destructive/10 border-destructive/30"
          )}
        >
          <div className="flex items-center gap-2">
            {withdrawResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
            ) : (
              <Shield className="w-4 h-4 text-destructive shrink-0" />
            )}
            <span className="text-xs text-foreground flex-1">{withdrawResult.message}</span>
            {withdrawResult.hash && withdrawResult.network && (
              <a
                href={`${txExplorerUrls[withdrawResult.network] || txExplorerUrls.ethereum}${withdrawResult.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
              >
                View TX <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setWithdrawResult(null)}>
              ✕
            </Button>
          </div>
        </motion.div>
      )}

      {/* Private Key Display */}
      {showPrivateKey && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4 text-destructive" />
            <span className="text-xs font-medium text-destructive">Private Key (auto-hides in 30s)</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-foreground break-all flex-1 bg-muted/50 p-2 rounded">
              {showPrivateKey}
            </code>
            <Button variant="ghost" size="sm" onClick={() => handleCopy(showPrivateKey)}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Embedded Wallets List */}
      {wallets.length > 0 ? (
        <div className="space-y-2">
          {wallets.map((wallet) => (
            <WalletRow
              key={`${wallet.network}-${wallet.address}`}
              wallet={wallet}
              copiedAddress={copiedAddress}
              onCopy={handleCopy}
              onExportKey={handleExportKey}
              isWithdrawOpen={withdrawingNetwork === wallet.network}
              onToggleWithdraw={() => {
                setWithdrawingNetwork(
                  withdrawingNetwork === wallet.network ? null : wallet.network
                );
                setWithdrawResult(null);
              }}
              withdrawAddress={withdrawAddress}
              withdrawAmount={withdrawAmount}
              onWithdrawAddressChange={setWithdrawAddress}
              onWithdrawAmountChange={setWithdrawAmount}
              onWithdraw={() => handleWithdraw(wallet.network)}
              isWithdrawing={isWithdrawing}
              connectedWalletAddress={connectedWalletAddress}
              onSetMaxAmount={() => setWithdrawAmount(wallet.balance || '0')}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            No embedded wallets yet. Create one to receive profits without MetaMask.
          </p>
        </div>
      )}

      {/* Create Wallet Buttons */}
      <div className="flex flex-wrap gap-2">
        {NETWORKS.filter(n => !wallets.find(w => w.network === n)).slice(0, 4).map(network => (
          <Button
            key={network}
            variant="outline"
            size="sm"
            onClick={() => handleCreate(network)}
            disabled={creatingNetwork === network || isLoading}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            {creatingNetwork === network ? 'Creating...' : networkLabels[network]}
          </Button>
        ))}
      </div>
    </div>
  );
}

function WalletRow({
  wallet,
  copiedAddress,
  onCopy,
  onExportKey,
  isWithdrawOpen,
  onToggleWithdraw,
  withdrawAddress,
  withdrawAmount,
  onWithdrawAddressChange,
  onWithdrawAmountChange,
  onWithdraw,
  isWithdrawing,
  connectedWalletAddress,
  onSetMaxAmount,
}: {
  wallet: EmbeddedWallet;
  copiedAddress: string | null;
  onCopy: (address: string) => void;
  onExportKey: (network: string) => void;
  isWithdrawOpen: boolean;
  onToggleWithdraw: () => void;
  withdrawAddress: string;
  withdrawAmount: string;
  onWithdrawAddressChange: (v: string) => void;
  onWithdrawAmountChange: (v: string) => void;
  onWithdraw: () => void;
  isWithdrawing: boolean;
  connectedWalletAddress: string | null;
  onSetMaxAmount: () => void;
}) {
  const balance = parseFloat(wallet.balance || '0');

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg border border-border bg-card/50"
    >
      <div className="flex items-center justify-between mb-1">
        <Badge variant="outline" className="text-xs">
          {networkLabels[wallet.network] || wallet.network}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">
          {balance.toFixed(4)} ETH
        </span>
      </div>
      <div className="flex items-center gap-2">
        <code className="text-xs font-mono text-foreground flex-1 truncate">
          {wallet.address}
        </code>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onCopy(wallet.address)}>
            {copiedAddress === wallet.address ? (
              <CheckCircle2 className="w-3 h-3 text-accent" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
          <a
            href={`${explorerUrls[wallet.network] || explorerUrls.ethereum}${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-muted/50"
          >
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onExportKey(wallet.network)}>
            <Key className="w-3 h-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-6 w-6 p-0", isWithdrawOpen && "text-primary")}
            onClick={onToggleWithdraw}
            title="Withdraw funds"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Withdraw Form */}
      {isWithdrawOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-border space-y-2"
        >
          <div className="flex items-center gap-2">
            <Send className="w-3 h-3 text-primary shrink-0" />
            <span className="text-xs font-medium text-foreground">Withdraw ETH</span>
          </div>
          <Input
            placeholder="Destination address (0x...)"
            value={withdrawAddress}
            onChange={(e) => onWithdrawAddressChange(e.target.value)}
            className="text-xs h-8 font-mono"
          />
          {connectedWalletAddress && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-primary"
              onClick={() => onWithdrawAddressChange(connectedWalletAddress)}
            >
              Use connected wallet ({connectedWalletAddress.slice(0,6)}...{connectedWalletAddress.slice(-4)})
            </Button>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Amount in ETH"
                type="number"
                step="0.0001"
                min="0"
                value={withdrawAmount}
                onChange={(e) => onWithdrawAmountChange(e.target.value)}
                className="text-xs h-8 pr-12"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-8 text-xs text-primary px-2"
                onClick={onSetMaxAmount}
              >
                MAX
              </Button>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={onWithdraw}
              disabled={isWithdrawing || !withdrawAddress || !withdrawAmount || balance <= 0}
            >
              {isWithdrawing ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              Send
            </Button>
          </div>
          {balance <= 0 && (
            <p className="text-xs text-muted-foreground">No balance to withdraw</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
