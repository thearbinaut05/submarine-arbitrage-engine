export type Network = 'ethereum' | 'arbitrum' | 'polygon' | 'bsc' | 'optimism' | 'base' | 'avalanche';

export interface NetworkConfig {
  id: Network;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  color: string;
  tokenList?: {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
  }[];
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: Network | null;
  balance: string;
}

export interface ArbitrageOpportunity {
  id: string;
  type: 'flash_loan' | 'flash_swap' | 'cross_chain';
  sourceNetwork: Network;
  targetNetwork?: Network;
  sourceDex: string;
  targetDex: string;
  tokenIn: string;
  tokenOut: string;
  profitPercent: number;
  profitUsd: number;
  gasEstimate: string;
  netProfit: number;
  confidence: number;
  timestamp: number;
  route: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  // Blockchain transaction info
  txHash?: string;
  explorerUrl?: string;
  // Submarine transaction specific
  isSubmarine?: boolean;
  submarinePhase?: 'committed' | 'revealed' | 'executed';
  // Real execution tracking
  isRealExecution?: boolean;
  executedAt?: number;
}

export interface Position {
  id: string;
  protocol: string;
  network: Network;
  type: 'lending' | 'borrowing' | 'lp' | 'staking';
  asset: string;
  amount: number;
  valueUsd: number;
  apy: number;
  healthFactor?: number;
  collateral?: number;
  debt?: number;
}

export interface Transaction {
  id: string;
  hash: string;
  type: 'flash_loan' | 'swap' | 'bridge' | 'rebalance';
  status: 'pending' | 'confirmed' | 'failed';
  network: Network;
  gasUsed: string;
  profit?: number;
  timestamp: number;
}

export interface ScannerConfig {
  isActive: boolean;
  autoExecute: boolean;
  minProfitPercent: number;
  minProfitUsd: number;
  maxGasGwei: number;
  networks: Network[];
  scanInterval: number;
}

export interface GaslessTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  deadline: number;
  signature?: string;
}
