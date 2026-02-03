/**
 * Already-deployed protocol contracts that can be used for arbitrage
 * These are production contracts - no deployment needed!
 */

// Balancer V2 Vault - FREE flash loans (0% fee) on all networks
// Same address across all chains via CREATE2
export const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

// 1inch Aggregation Router V6 - Gasless swaps via Fusion+
export const ONEINCH_ROUTER_V6 = '0x111111125421cA6dc452d289314280a0f8842A65';

// 1inch Aggregation Router V5 (fallback)
export const ONEINCH_ROUTER_V5 = '0x1111111254EEB25477B68fb85Ed929f73A960582';

// Uniswap Universal Router - supports multi-hop swaps
export const UNISWAP_UNIVERSAL_ROUTER: Record<string, string> = {
  ethereum: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
  arbitrum: '0x5E325eDA8064b456f4781070C0738d849c824258',
  polygon: '0xec7BE89e9d109e7e3Fec59c222CF297125FEFda2',
  optimism: '0xCb1355ff08Ab38bBCE60111F1bb2B784bE25D7e8',
  base: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
};

// Aave V3 Pool - flash loans with 0.05% fee (cheaper than V2's 0.09%)
export const AAVE_V3_POOL: Record<string, string> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

// Aave V3 Pool Address Provider (for getting pool address dynamically)
export const AAVE_V3_POOL_ADDRESSES_PROVIDER: Record<string, string> = {
  ethereum: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
  arbitrum: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  polygon: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  optimism: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  base: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
  avalanche: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
};

// SushiSwap Router V2 - legacy but widely available
export const SUSHISWAP_ROUTER: Record<string, string> = {
  ethereum: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  arbitrum: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  polygon: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  bsc: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  avalanche: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
};

// Camelot Router (Arbitrum-specific DEX)
export const CAMELOT_ROUTER = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d';

// GMX Router V2 (Arbitrum/Avalanche)
export const GMX_ROUTER: Record<string, string> = {
  arbitrum: '0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064',
  avalanche: '0x5F719c2F1095F7B9fc68a68e35B51194f4b6abe8',
};

/**
 * Protocol configurations for flash loan execution
 * Using existing deployed contracts instead of custom deployment
 */
export interface ProtocolConfig {
  name: string;
  type: 'flash_loan' | 'aggregator' | 'dex';
  address: string;
  fee: number; // in basis points (100 = 1%)
  supportsGasless: boolean;
  networks: string[];
}

export const PROTOCOLS: ProtocolConfig[] = [
  {
    name: 'Balancer V2',
    type: 'flash_loan',
    address: BALANCER_VAULT,
    fee: 0, // FREE flash loans!
    supportsGasless: false,
    networks: ['ethereum', 'arbitrum', 'polygon', 'optimism', 'base', 'avalanche'],
  },
  {
    name: '1inch Fusion+',
    type: 'aggregator',
    address: ONEINCH_ROUTER_V6,
    fee: 0,
    supportsGasless: true, // Fusion+ handles gas
    networks: ['ethereum', 'arbitrum', 'polygon', 'optimism', 'base', 'avalanche', 'bsc'],
  },
  {
    name: 'Aave V3',
    type: 'flash_loan',
    address: '', // Use network-specific addresses
    fee: 5, // 0.05%
    supportsGasless: false,
    networks: ['ethereum', 'arbitrum', 'polygon', 'optimism', 'base', 'avalanche'],
  },
];

/**
 * Get the best flash loan provider for a network
 * Prefers Balancer (free) over Aave (0.05% fee)
 */
export function getBestFlashLoanProvider(network: string): {
  name: string;
  address: string;
  fee: number;
} {
  // Balancer is available on most networks and has 0% fee
  if (['ethereum', 'arbitrum', 'polygon', 'optimism', 'base', 'avalanche'].includes(network)) {
    return {
      name: 'Balancer V2',
      address: BALANCER_VAULT,
      fee: 0,
    };
  }

  // Fallback to Aave V3
  const aavePool = AAVE_V3_POOL[network];
  if (aavePool) {
    return {
      name: 'Aave V3',
      address: aavePool,
      fee: 5, // 0.05%
    };
  }

  throw new Error(`No flash loan provider available for network: ${network}`);
}

/**
 * ABI fragments for flash loan execution
 */
export const BALANCER_VAULT_ABI = [
  'function flashLoan(address recipient, address[] tokens, uint256[] amounts, bytes userData) external',
  'function getProtocolFeesCollector() external view returns (address)',
];

export const AAVE_V3_POOL_ABI = [
  'function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external',
  'function flashLoan(address receiverAddress, address[] calldata assets, uint256[] calldata amounts, uint256[] calldata interestRateModes, address onBehalfOf, bytes calldata params, uint16 referralCode) external',
];

export const ONEINCH_ROUTER_ABI = [
  'function swap(address executor, tuple(address srcToken, address dstToken, address srcReceiver, address dstReceiver, uint256 amount, uint256 minReturnAmount, uint256 flags) desc, bytes permit, bytes data) external payable returns (uint256 returnAmount, uint256 spentAmount)',
  'function unoswap(address srcToken, uint256 amount, uint256 minReturn, uint256[] pools) external returns (uint256 returnAmount)',
];
