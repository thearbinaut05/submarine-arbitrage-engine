import { motion } from 'framer-motion';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Network, NetworkConfig } from '@/types/defi';

interface NetworkSelectorProps {
  currentNetwork: Network | null;
  networks: Record<Network, NetworkConfig>;
  onSelect: (network: Network) => void;
  disabled?: boolean;
}

const networkIcons: Record<Network, string> = {
  ethereum: '⟠',
  arbitrum: '🔵',
  polygon: '🟣',
  bsc: '🟡',
};

export function NetworkSelector({ currentNetwork, networks, onSelect, disabled }: NetworkSelectorProps) {
  const current = currentNetwork ? networks[currentNetwork] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="min-w-[140px] border-border hover:border-primary/50 bg-card"
        >
          {current ? (
            <div className="flex items-center gap-2">
              <span className="text-lg">{networkIcons[currentNetwork!]}</span>
              <span className="text-foreground">{current.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Select Network</span>
            </div>
          )}
          <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(networks).map(([key, network]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onSelect(key as Network)}
            className="flex items-center gap-2"
          >
            <span className="text-lg">{networkIcons[key as Network]}</span>
            <span>{network.name}</span>
            {currentNetwork === key && (
              <motion.div
                className="ml-auto w-2 h-2 rounded-full bg-accent"
                layoutId="network-indicator"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
