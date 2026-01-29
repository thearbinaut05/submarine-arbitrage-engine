/**
 * @title Comprehensive Multi-Chain Configuration
 * @notice Unified configuration for all supported blockchains
 */

// ============================================================================
// CHAIN CONFIGURATIONS
// ============================================================================

export type NetworkId = 
  | 'ethereum' | 'sepolia' 
  | 'arbitrum' | 'base' | 'optimism'
  | 'polygon' 
  | 'bsc'
  | 'avalanche'
  | 'linea'
  | 'zksync'
  | 'scroll'
  | 'mantle'
  | 'metis'
  | 'gnosis'
  | 'fantom'
  | 'celo'
  | 'moonbeam'
  | 'kava'
  | 'harmony'
  | 'cronos'
  | 'evmos'
  | 'okc';

export interface ChainConfig {
  id: number;
  name: string;
  shortName: string;
  networkId: NetworkId;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  color: string;
  aaveV3?: {
    poolProvider: string;
    pool: string;
  };
  isTestnet: boolean;
}

export const CHAINS: Record<NetworkId, ChainConfig> = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    networkId: 'ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
    blockExplorerUrls: ['https://etherscan.io'],
    color: '#627EEA',
    aaveV3: {
      poolProvider: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
      pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    },
    isTestnet: false,
  },
  sepolia: {
    id: 11155111,
    name: 'Sepolia',
    shortName: 'SEP',
    networkId: 'sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    color: '#8B5CF6',
    aaveV3: {
      poolProvider: '0x4e6333b981c25fA72b4E9751A83d09d82C221a6d',
      pool: '0x6dD96377e9dbA8fF95bA5e5e27fafbb33c6B4B8f',
    },
    isTestnet: true,
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    networkId: 'arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    blockExplorerUrls: ['https://arbiscan.io'],
    color: '#28A0F0',
    aaveV3: {
      poolProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    },
    isTestnet: false,
  },
  base: {
    id: 8453,
    name: 'Base',
    shortName: 'BASE',
    networkId: 'base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org', 'https://rpc.ankr.com/base'],
    blockExplorerUrls: ['https://basescan.org'],
    color: '#0052FF',
    isTestnet: false,
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    shortName: 'OP',
    networkId: 'optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    color: '#FF0420',
    aaveV3: {
      poolProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    },
    isTestnet: false,
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    shortName: 'MATIC',
    networkId: 'polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
    blockExplorerUrls: ['https://polygonscan.com'],
    color: '#8247E5',
    aaveV3: {
      poolProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    },
    isTestnet: false,
  },
  bsc: {
    id: 56,
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    networkId: 'bsc',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
    blockExplorerUrls: ['https://bscscan.com'],
    color: '#F0B90B',
    isTestnet: false,
  },
  avalanche: {
    id: 43114,
    name: 'Avalanche',
    shortName: 'AVAX',
    networkId: 'avalanche',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
    color: '#E84142',
    aaveV3: {
      poolProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
      pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    },
    isTestnet: false,
  },
  linea: {
    id: 59144,
    name: 'Linea',
    shortName: 'LINEA',
    networkId: 'linea',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.linea.build'],
    blockExplorerUrls: ['https://lineascan.build'],
    color: '#121D33',
    isTestnet: false,
  },
  zksync: {
    id: 324,
    name: 'zksync Era',
    shortName: 'ZK',
    networkId: 'zksync',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.era.zksync.io'],
    blockExplorerUrls: ['https://explorer.zksync.io'],
    color: '#8B8DFC',
    isTestnet: false,
  },
  scroll: {
    id: 534352,
    name: 'Scroll',
    shortName: 'SCRL',
    networkId: 'scroll',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.scroll.io'],
    blockExplorerUrls: ['https://scrollscan.com'],
    color: '#E0F2FE',
    isTestnet: false,
  },
  mantle: {
    id: 5000,
    name: 'Mantle',
    shortName: 'MNT',
    networkId: 'mantle',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
    rpcUrls: ['https://rpc.mantle.xyz'],
    blockExplorerUrls: ['https://explorer.mantle.xyz'],
    color: '#00A3E0',
    isTestnet: false,
  },
  metis: {
    id: 1088,
    name: 'Metis',
    shortName: 'METIS',
    networkId: 'metis',
    nativeCurrency: { name: 'Metis', symbol: 'METIS', decimals: 18 },
    rpcUrls: ['https://andromeda.metis.io/?owner=1088'],
    blockExplorerUrls: ['https://andromeda-explorer.metis.io'],
    color: '#00D6A3',
    isTestnet: false,
  },
  gnosis: {
    id: 100,
    name: 'Gnosis',
    shortName: 'GNO',
    networkId: 'gnosis',
    nativeCurrency: { name: 'xDai', symbol: 'xDAI', decimals: 18 },
    rpcUrls: ['https://rpc.gnosischain.com'],
    blockExplorerUrls: ['https://gnosisscan.io'],
    color: '#477DAA',
    isTestnet: false,
  },
  fantom: {
    id: 250,
    name: 'Fantom',
    shortName: 'FTM',
    networkId: 'fantom',
    nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
    rpcUrls: ['https://rpc.fantom.network'],
    blockExplorerUrls: ['https://ftmscan.com'],
    color: '#13B5EA',
    isTestnet: false,
  },
  celo: {
    id: 42220,
    name: 'Celo',
    shortName: 'CELO',
    networkId: 'celo',
    nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://celoscan.io'],
    color: '#FBCC5C',
    isTestnet: false,
  },
  moonbeam: {
    id: 1284,
    name: 'Moonbeam',
    shortName: 'GLMR',
    networkId: 'moonbeam',
    nativeCurrency: { name: 'Glimmer', symbol: 'GLMR', decimals: 18 },
    rpcUrls: ['https://rpc.moonbeam.network'],
    blockExplorerUrls: ['https://moonscan.io'],
    color: '#53C3F2',
    isTestnet: false,
  },
  kava: {
    id: 2222,
    name: 'Kava',
    shortName: 'KAVA',
    networkId: 'kava',
    nativeCurrency: { name: 'Kava', symbol: 'KAVA', decimals: 18 },
    rpcUrls: ['https://evm.kava.io'],
    blockExplorerUrls: ['https://explorer.kava.io'],
    color: '#FF564F',
    isTestnet: false,
  },
  harmony: {
    id: 1666600000,
    name: 'Harmony',
    shortName: 'ONE',
    networkId: 'harmony',
    nativeCurrency: { name: 'ONE', symbol: 'ONE', decimals: 18 },
    rpcUrls: ['https://api.harmony.one'],
    blockExplorerUrls: ['https://explorer.harmony.one'],
    color: '#00AEEF',
    isTestnet: false,
  },
  cronos: {
    id: 25,
    name: 'Cronos',
    shortName: 'CRO',
    networkId: 'cronos',
    nativeCurrency: { name: 'Cronos', symbol: 'CRO', decimals: 18 },
    rpcUrls: ['https://evm.cronos.org'],
    blockExplorerUrls: ['https://cronoscan.com'],
    color: '#002D73',
    isTestnet: false,
  },
  evmos: {
    id: 9001,
    name: 'Evmos',
    shortName: 'EVMOS',
    networkId: 'evmos',
    nativeCurrency: { name: 'Evmos', symbol: 'EVMOS', decimals: 18 },
    rpcUrls: ['https://evmos-evm.publicnode.com'],
    blockExplorerUrls: ['https://evm.evmos.org'],
    color: '#A057F2',
    isTestnet: false,
  },
  okc: {
    id: 66,
    name: 'OKC',
    shortName: 'OKT',
    networkId: 'okc',
    nativeCurrency: { name: 'OKT', symbol: 'OKT', decimals: 18 },
    rpcUrls: ['https://exchainrpc.okex.com'],
    blockExplorerUrls: ['https://www.oklink.com/okc'],
    color: '#00C8FF',
    isTestnet: false,
  },
};

// Helper function to get chain by chain ID
export function getChainById(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find(chain => chain.id === chainId);
}

// Helper function to get chain by network ID
export function getChainByNetworkId(networkId: string): ChainConfig | undefined {
  return CHAINS[networkId as NetworkId];
}

// Get all mainnet chains (non-testnet)
export function getMainnetChains(): ChainConfig[] {
  return Object.values(CHAINS).filter(chain => !chain.isTestnet);
}

// Get all testnet chains
export function getTestnetChains(): ChainConfig[] {
  return Object.values(CHAINS).filter(chain => chain.isTestnet);
}

