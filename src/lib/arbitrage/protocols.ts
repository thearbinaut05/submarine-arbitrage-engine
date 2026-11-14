import type { Network } from '@/types/defi';

export interface WorkstationToken {
  symbol: string;
  address: string;
  expectedDecimals: number;
}

export interface DexAdapter {
  id: string;
  name: string;
  router: string;
  factory: string;
  kind: 'uniswap-v2';
  feeBps: number;
}

export interface FlashLoanAdapter {
  id: 'aave-v3';
  name: 'Aave V3';
  pool: string;
}

export interface WorkstationChain {
  id: Network;
  chainId: number;
  rpcUrls: string[];
  explorer: string;
  nativeSymbol: string;
  nativeToken: WorkstationToken;
  usdToken: WorkstationToken;
  tokens: Record<string, WorkstationToken>;
  pairs: [string, string][];
  dexes: DexAdapter[];
  flashLoan?: FlashLoanAdapter;
}

const token = (symbol: string, address: string, expectedDecimals: number): WorkstationToken => ({
  symbol,
  address,
  expectedDecimals,
});

const AAVE_POOLS: Partial<Record<Network, string>> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

const chain = (
  value: Omit<WorkstationChain, 'flashLoan'>,
): WorkstationChain => ({
  ...value,
  flashLoan: AAVE_POOLS[value.id]
    ? { id: 'aave-v3', name: 'Aave V3', pool: AAVE_POOLS[value.id]! }
    : undefined,
});

export const WORKSTATION_CHAINS: Record<Network, WorkstationChain> = {
  ethereum: chain({
    id: 'ethereum', chainId: 1, explorer: 'https://etherscan.io', nativeSymbol: 'ETH',
    rpcUrls: ['https://ethereum.publicnode.com', 'https://eth.llamarpc.com'],
    nativeToken: token('WETH', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18),
    usdToken: token('USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6),
    tokens: {
      WETH: token('WETH', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18),
      USDC: token('USDC', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6),
      USDT: token('USDT', '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6),
      WBTC: token('WBTC', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', 8),
    },
    pairs: [['WETH', 'USDC'], ['USDC', 'USDT'], ['WBTC', 'USDC']],
    dexes: [
      { id: 'uniswap-v2', name: 'Uniswap V2', router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', kind: 'uniswap-v2', feeBps: 30 },
      { id: 'sushiswap', name: 'SushiSwap', router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac', kind: 'uniswap-v2', feeBps: 30 },
    ],
  }),
  arbitrum: chain({
    id: 'arbitrum', chainId: 42161, explorer: 'https://arbiscan.io', nativeSymbol: 'ETH',
    rpcUrls: ['https://arbitrum.publicnode.com', 'https://arb1.arbitrum.io/rpc'],
    nativeToken: token('WETH', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 18),
    usdToken: token('USDC', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 6),
    tokens: {
      WETH: token('WETH', '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 18),
      USDC: token('USDC', '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', 6),
      USDT: token('USDT', '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', 6),
      WBTC: token('WBTC', '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', 8),
    },
    pairs: [['WETH', 'USDC'], ['USDC', 'USDT'], ['WBTC', 'USDC']],
    dexes: [
      { id: 'sushiswap', name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', factory: '0xc35DADB65773f9F65d6f80C70a3C25a7ebce92bD', kind: 'uniswap-v2', feeBps: 30 },
      { id: 'camelot', name: 'Camelot', router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d', factory: '0x6EcCab422D763aC031210895C81787E87B43A652', kind: 'uniswap-v2', feeBps: 30 },
    ],
  }),
  polygon: chain({
    id: 'polygon', chainId: 137, explorer: 'https://polygonscan.com', nativeSymbol: 'POL',
    rpcUrls: ['https://polygon-bor-rpc.publicnode.com', 'https://polygon.llamarpc.com'],
    nativeToken: token('WPOL', '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 18),
    usdToken: token('USDC', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 6),
    tokens: {
      WPOL: token('WPOL', '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 18),
      WETH: token('WETH', '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', 18),
      USDC: token('USDC', '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', 6),
      USDT: token('USDT', '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', 6),
      WBTC: token('WBTC', '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', 8),
    },
    pairs: [['WPOL', 'USDC'], ['WETH', 'USDC'], ['USDC', 'USDT']],
    dexes: [
      { id: 'quickswap', name: 'QuickSwap', router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', kind: 'uniswap-v2', feeBps: 30 },
      { id: 'sushiswap', name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', factory: '0xc35DADB65773f9F65d6f80C70a3C25a7ebce92bD', kind: 'uniswap-v2', feeBps: 30 },
    ],
  }),
  bsc: chain({
    id: 'bsc', chainId: 56, explorer: 'https://bscscan.com', nativeSymbol: 'BNB',
    rpcUrls: ['https://bsc.publicnode.com', 'https://bsc-dataseed1.binance.org'],
    nativeToken: token('WBNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18),
    usdToken: token('USDC', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 18),
    tokens: {
      WBNB: token('WBNB', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18),
      USDC: token('USDC', '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', 18),
      USDT: token('USDT', '0x55d398326f99059fF775485246999027B3197955', 18),
      BTCB: token('BTCB', '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', 18),
    },
    pairs: [['WBNB', 'USDC'], ['USDC', 'USDT'], ['BTCB', 'USDC']],
    dexes: [
      { id: 'pancakeswap-v2', name: 'PancakeSwap V2', router: '0x10ED43C718714eb63d5aA57B78B54704E256024E', factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73', kind: 'uniswap-v2', feeBps: 25 },
      { id: 'biswap', name: 'Biswap', router: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8', factory: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE', kind: 'uniswap-v2', feeBps: 10 },
    ],
  }),
  optimism: chain({
    id: 'optimism', chainId: 10, explorer: 'https://optimistic.etherscan.io', nativeSymbol: 'ETH',
    rpcUrls: ['https://optimism.publicnode.com', 'https://mainnet.optimism.io'],
    nativeToken: token('WETH', '0x4200000000000000000000000000000000000006', 18),
    usdToken: token('USDC', '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 6),
    tokens: {
      WETH: token('WETH', '0x4200000000000000000000000000000000000006', 18),
      USDC: token('USDC', '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', 6),
      USDT: token('USDT', '0x94b008aA00579c1307B0EF2c499aD96a8f233a91', 6),
      WBTC: token('WBTC', '0x68f180fcCe6836688e9084f035309E29Bf0A2095', 8),
    },
    pairs: [['WETH', 'USDC'], ['USDC', 'USDT'], ['WBTC', 'USDC']],
    dexes: [
      { id: 'sushiswap', name: 'SushiSwap', router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', factory: '0xc35DADB65773f9F65d6f80C70a3C25a7ebce92bD', kind: 'uniswap-v2', feeBps: 30 },
    ],
  }),
  base: chain({
    id: 'base', chainId: 8453, explorer: 'https://basescan.org', nativeSymbol: 'ETH',
    rpcUrls: ['https://base.publicnode.com', 'https://mainnet.base.org'],
    nativeToken: token('WETH', '0x4200000000000000000000000000000000000006', 18),
    usdToken: token('USDC', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6),
    tokens: {
      WETH: token('WETH', '0x4200000000000000000000000000000000000006', 18),
      USDC: token('USDC', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6),
      DAI: token('DAI', '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', 18),
      cbETH: token('cbETH', '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF', 18),
    },
    pairs: [['WETH', 'USDC'], ['USDC', 'DAI'], ['cbETH', 'USDC']],
    dexes: [
      { id: 'baseswap', name: 'BaseSwap', router: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86', factory: '0xFDa619b6d20975be80A10332dD4b9b9F0B5B41e6', kind: 'uniswap-v2', feeBps: 25 },
      { id: 'sushiswap', name: 'SushiSwap', router: '0x6BDED42c6DA8FBf0d2A55B2fa120C5e0c8D7891', factory: '0x71524B4f93c58fcbF659783284E38825f0622859', kind: 'uniswap-v2', feeBps: 30 },
    ],
  }),
  avalanche: chain({
    id: 'avalanche', chainId: 43114, explorer: 'https://snowtrace.io', nativeSymbol: 'AVAX',
    rpcUrls: ['https://avalanche.publicnode.com', 'https://api.avax.network/ext/bc/C/rpc'],
    nativeToken: token('WAVAX', '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8', 18),
    usdToken: token('USDC', '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', 6),
    tokens: {
      WAVAX: token('WAVAX', '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8', 18),
      USDC: token('USDC', '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', 6),
      USDT: token('USDT', '0x9702230A6Ea8C46118ddC91069bFF2Bb2B46E678', 6),
      WBTC: token('WBTC', '0x152b9d0FdC40C096757F570A51E494bd4b943E50', 8),
    },
    pairs: [['WAVAX', 'USDC'], ['USDC', 'USDT'], ['WBTC', 'USDC']],
    dexes: [
      { id: 'trader-joe', name: 'Trader Joe', router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10', kind: 'uniswap-v2', feeBps: 30 },
      { id: 'pangolin', name: 'Pangolin', router: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', factory: '0xefa94DE7a4656D787667C749f7E1223D71e9FD88', kind: 'uniswap-v2', feeBps: 30 },
    ],
  }),
};

export const ERC20_READ_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
];

export const V2_ROUTER_READ_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
];

export const V2_FACTORY_READ_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address)',
];

export const V2_PAIR_READ_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
];

export const AAVE_READ_ABI = [
  'function FLASHLOAN_PREMIUM_TOTAL() view returns (uint128)',
  'function getReserveData(address asset) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))',
];
