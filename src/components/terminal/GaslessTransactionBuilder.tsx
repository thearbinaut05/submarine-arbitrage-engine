import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Wallet,
  ArrowRight,
  Zap,
  Clock,
  Info,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface GaslessTransactionBuilderProps {
  isWalletConnected: boolean;
}

export function GaslessTransactionBuilder({ isWalletConnected }: GaslessTransactionBuilderProps) {
  const [isSubmarine, setIsSubmarine] = useState(false);
  const [useGasSponsor, setUseGasSponsor] = useState(true);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'signing' | 'relaying' | 'confirmed'>('idle');

  const handleSubmit = async () => {
    if (!isWalletConnected) return;
    
    setIsSubmitting(true);
    setStatus('signing');
    
    // Simulate signing
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStatus('relaying');
    
    // Simulate relaying
    await new Promise(resolve => setTimeout(resolve, 2000));
    setStatus('confirmed');
    
    setTimeout(() => {
      setIsSubmitting(false);
      setStatus('idle');
    }, 2000);
  };

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-sans font-semibold text-foreground">Gasless Transaction Builder</h3>
        </div>
        <Badge variant="outline" className="text-xs border-primary/50 text-primary">
          Meta-Transaction
        </Badge>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={cn(
          "p-3 rounded-lg border transition-all cursor-pointer",
          isSubmarine 
            ? "border-neon-purple/50 bg-neon-purple/10" 
            : "border-border bg-muted/30 hover:border-neon-purple/30"
        )}
        onClick={() => setIsSubmarine(!isSubmarine)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Submarine TX</span>
            <Switch checked={isSubmarine} onCheckedChange={setIsSubmarine} />
          </div>
          <p className="text-xs text-muted-foreground">
            Hide transaction until confirmation
          </p>
        </div>

        <div className={cn(
          "p-3 rounded-lg border transition-all cursor-pointer",
          useGasSponsor 
            ? "border-accent/50 bg-accent/10" 
            : "border-border bg-muted/30 hover:border-accent/30"
        )}
        onClick={() => setUseGasSponsor(!useGasSponsor)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Gas Sponsor</span>
            <Switch checked={useGasSponsor} onCheckedChange={setUseGasSponsor} />
          </div>
          <p className="text-xs text-muted-foreground">
            Transaction fee paid by relayer
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Recipient Address</label>
          <Input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="bg-muted/50 border-border focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Amount (ETH)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="bg-muted/50 border-border focus:border-primary"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border mb-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            {isSubmarine && useGasSponsor 
              ? "Your transaction will be hidden from the mempool and gas will be sponsored. Maximum MEV protection."
              : isSubmarine 
              ? "Your transaction will be hidden until it's confirmed on-chain. Protects against front-running."
              : useGasSponsor
              ? "Gas fees will be paid by the relayer. You only need to sign the transaction."
              : "Standard transaction. You will pay gas fees from your wallet."}
          </div>
        </div>
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center gap-3">
            <StatusStep 
              label="Sign" 
              status={status === 'signing' ? 'active' : ['relaying', 'confirmed'].includes(status) ? 'completed' : 'pending'} 
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <StatusStep 
              label="Relay" 
              status={status === 'relaying' ? 'active' : status === 'confirmed' ? 'completed' : 'pending'} 
            />
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <StatusStep 
              label="Confirm" 
              status={status === 'confirmed' ? 'completed' : 'pending'} 
            />
          </div>
        </motion.div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isWalletConnected || isSubmitting || !recipient || !amount}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {status === 'signing' ? 'Signing...' : status === 'relaying' ? 'Relaying...' : 'Confirmed!'}
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2" />
            {useGasSponsor ? 'Submit Gasless Transaction' : 'Submit Transaction'}
          </>
        )}
      </Button>

      {!isWalletConnected && (
        <p className="text-xs text-center text-muted-foreground mt-2">
          Connect your wallet to submit transactions
        </p>
      )}
    </div>
  );
}

interface StatusStepProps {
  label: string;
  status: 'pending' | 'active' | 'completed';
}

function StatusStep({ label, status }: StatusStepProps) {
  return (
    <div className="flex items-center gap-1.5">
      {status === 'completed' ? (
        <CheckCircle2 className="w-4 h-4 text-accent" />
      ) : status === 'active' ? (
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
      ) : (
        <Clock className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={cn(
        "text-xs font-medium",
        status === 'completed' ? "text-accent" : status === 'active' ? "text-primary" : "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}
