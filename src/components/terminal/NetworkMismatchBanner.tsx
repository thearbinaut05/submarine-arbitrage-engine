import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Network } from '@/types/defi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NetworkMismatchBannerProps {
  walletNetwork: Network | null;
  requiredNetwork: Network | null;
  requiredLabel?: string;
  reason?: string;
  onSwitch: (network: Network) => Promise<void> | void;
  onDismiss?: () => void;
}

const PRETTY: Record<Network, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  bsc: 'BSC',
  optimism: 'Optimism',
  base: 'Base',
  avalanche: 'Avalanche',
};

export function NetworkMismatchBanner({
  walletNetwork,
  requiredNetwork,
  requiredLabel,
  reason,
  onSwitch,
  onDismiss,
}: NetworkMismatchBannerProps) {
  const [switching, setSwitching] = useState(false);
  const visible = !!requiredNetwork && walletNetwork !== requiredNetwork;

  const handle = async () => {
    if (!requiredNetwork) return;
    setSwitching(true);
    try {
      await onSwitch(requiredNetwork);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg border',
            'border-yellow-500/40 bg-yellow-500/10 text-yellow-100 font-mono'
          )}
        >
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
          <div className="flex-1 text-xs sm:text-sm leading-snug">
            <span className="font-semibold">Wrong network.</span>{' '}
            {reason ?? `This requires ${requiredLabel ?? PRETTY[requiredNetwork!]}.`}{' '}
            {walletNetwork && (
              <span className="opacity-70">
                You're on {PRETTY[walletNetwork]}.
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handle}
            disabled={switching}
            className="border-yellow-400/50 hover:bg-yellow-500/20 text-xs"
          >
            {switching ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <ArrowRightLeft className="h-3 w-3 mr-1" />
            )}
            Switch to {PRETTY[requiredNetwork!]}
          </Button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs opacity-60 hover:opacity-100 px-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
