/**
 * Mainnet Optimized Configuration
 * Maximum speed, security, and profit extraction
 */

// Premium RPC endpoints with fallbacks (fastest first)
export const RPC_ENDPOINTS: Record<string, string[]> = {
  ethereum: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
  ],
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.publicnode.com',
    'https://1rpc.io/arb',
  ],
  polygon: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon.llamarpc.com',
    'https://1rpc.io/matic',
  ],
  bsc: [
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://rpc.ankr.com/bsc',
    'https://bsc.publicnode.com',
  ],
  optimism: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.publicnode.com',
    'https://1rpc.io/op',
  ],
  base: [
    'https://mainnet.base.org',
    'https://base.publicnode.com',
    'https://1rpc.io/base',
    'https://base.llamarpc.com',
  ],
  avalanche: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche.publicnode.com',
    'https://1rpc.io/avax/c',
  ],
};

// Chain IDs
export const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  bsc: 56,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
};

// Block times in milliseconds (for scan timing)
export const BLOCK_TIMES: Record<string, number> = {
  ethereum: 12000,
  arbitrum: 250,
  polygon: 2000,
  bsc: 3000,
  optimism: 2000,
  base: 2000,
  avalanche: 2000,
};

// Gas price limits (in gwei) per network
export const GAS_LIMITS: Record<string, { max: number; target: number; priority: number }> = {
  ethereum: { max: 100, target: 30, priority: 2 },
  arbitrum: { max: 1, target: 0.1, priority: 0.01 },
  polygon: { max: 500, target: 100, priority: 30 },
  bsc: { max: 10, target: 3, priority: 1 },
  optimism: { max: 1, target: 0.01, priority: 0.001 },
  base: { max: 1, target: 0.01, priority: 0.001 },
  avalanche: { max: 100, target: 25, priority: 2 },
};

// Deployed contract addresses
export const CONTRACT_ADDRESSES: Record<string, {
  flashArbExecutor: string;
  gaslessRelayer: string;
  positionRebalancer: string;
}> = {
  ethereum: {
    flashArbExecutor: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    gaslessRelayer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    positionRebalancer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  },
  arbitrum: {
    flashArbExecutor: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
    gaslessRelayer: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
    positionRebalancer: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
  },
  polygon: {
    flashArbExecutor: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    gaslessRelayer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    positionRebalancer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  },
  bsc: {
    flashArbExecutor: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    gaslessRelayer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    positionRebalancer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  },
  optimism: {
    flashArbExecutor: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    gaslessRelayer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    positionRebalancer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  },
  base: {
    flashArbExecutor: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    gaslessRelayer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    positionRebalancer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  },
  avalanche: {
    flashArbExecutor: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    gaslessRelayer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
    positionRebalancer: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  },
};

// Aave V3 Pool addresses (for flash loans)
export const AAVE_POOLS: Record<string, string> = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  bsc: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  avalanche: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

// DEX configurations with router addresses
export const DEX_CONFIGS: Record<string, Record<string, {
  router: string;
  factory: string;
  type: 'v2' | 'v3';
  fees?: number[];
}>> = {
  ethereum: {
    uniswap_v2: {
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      type: 'v2',
    },
    uniswap_v3: {
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      type: 'v3',
      fees: [100, 500, 3000, 10000],
    },
    sushiswap: {
      router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
      type: 'v2',
    },
    curve: {
      router: '0x99a58482BD75cbab83b27EC03CA68fF489b5788f',
      factory: '0xB9fC157394Af804a3578134A6585C0dc9cc990d4',
      type: 'v2',
    },
  },
  arbitrum: {
    uniswap_v3: {
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      type: 'v3',
      fees: [100, 500, 3000, 10000],
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      factory: '0xc35DADB65773f9F65d6f80C70a3C25a7ebce92bD',
      type: 'v2',
    },
    camelot: {
      router: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
      factory: '0x6EcCab422D763aC031210895C81787E87B43A652',
      type: 'v2',
    },
    gmx: {
      router: '0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064',
      factory: '0x0000000000000000000000000000000000000000',
      type: 'v2',
    },
  },
  polygon: {
    quickswap: {
      router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
      type: 'v2',
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      factory: '0xc35DADB65773f9F65d6f80C70a3C25a7ebce92bD',
      type: 'v2',
    },
    uniswap_v3: {
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      type: 'v3',
      fees: [100, 500, 3000, 10000],
    },
  },
  bsc: {
    pancakeswap_v2: {
      router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
      type: 'v2',
    },
    pancakeswap_v3: {
      router: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      type: 'v3',
      fees: [100, 500, 2500, 10000],
    },
    biswap: {
      router: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
      factory: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
      type: 'v2',
    },
  },
  optimism: {
    uniswap_v3: {
      router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      type: 'v3',
      fees: [100, 500, 3000, 10000],
    },
    velodrome: {
      router: '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858',
      factory: '0x25CbdDb98b35ab1FF77413456B31EC81A6B6B746',
      type: 'v2',
    },
  },
  base: {
    uniswap_v3: {
      router: '0x2626664c2603336E57B271c5C0b26F421741e481',
      factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
      type: 'v3',
      fees: [100, 500, 3000, 10000],
    },
    aerodrome: {
      router: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
      factory: '0x420DD381b31aEf6683db6B902084cB0FFECe40Da',
      type: 'v2',
    },
    baseswap: {
      router: '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86',
      factory: '0xFDa619b6d20975be80A10332dD4b9b9F0B5B41e6',
      type: 'v2',
    },
  },
  avalanche: {
    trader_joe: {
      router: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
      factory: '0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10',
      type: 'v2',
    },
    pangolin: {
      router: '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106',
      factory: '0xefa94DE7a4656D787667C749f7E1223D71E9FD88',
      type: 'v2',
    },
    uniswap_v3: {
      router: '0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE',
      factory: '0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD',
      type: 'v3',
      fees: [100, 500, 3000, 10000],
    },
  },
};

// Token addresses for each network
export const TOKEN_ADDRESSES: Record<string, Record<string, {
  address: string;
  decimals: number;
  symbol: string;
}>> = {
  ethereum: {
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeACB5BE1023a', decimals: 18, symbol: 'DAI' },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, symbol: 'WBTC' },
    LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, symbol: 'LINK' },
    UNI: { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, symbol: 'UNI' },
    AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, symbol: 'AAVE' },
    CRV: { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18, symbol: 'CRV' },
    LDO: { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18, symbol: 'LDO' },
  },
  arbitrum: {
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC' },
    'USDC.e': { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', decimals: 6, symbol: 'USDC.e' },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, symbol: 'DAI' },
    WBTC: { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8, symbol: 'WBTC' },
    LINK: { address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', decimals: 18, symbol: 'LINK' },
    ARB: { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, symbol: 'ARB' },
    GMX: { address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', decimals: 18, symbol: 'GMX' },
  },
  polygon: {
    WMATIC: { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, symbol: 'WMATIC' },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, symbol: 'USDC' },
    'USDC.e': { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6, symbol: 'USDC.e' },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, symbol: 'DAI' },
    WBTC: { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8, symbol: 'WBTC' },
    LINK: { address: '0xb0897686c545045aFc77CF20eC7A532E3120E0F1', decimals: 18, symbol: 'LINK' },
  },
  bsc: {
    WBNB: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, symbol: 'WBNB' },
    BUSD: { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, symbol: 'BUSD' },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT' },
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC' },
    ETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, symbol: 'ETH' },
    BTCB: { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, symbol: 'BTCB' },
    CAKE: { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, symbol: 'CAKE' },
  },
  optimism: {
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC' },
    'USDC.e': { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6, symbol: 'USDC.e' },
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD96a8f233a91', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, symbol: 'DAI' },
    OP: { address: '0x4200000000000000000000000000000000000042', decimals: 18, symbol: 'OP' },
    WBTC: { address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8, symbol: 'WBTC' },
  },
  base: {
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC' },
    USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, symbol: 'USDbC' },
    cbETH: { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF', decimals: 18, symbol: 'cbETH' },
    DAI: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, symbol: 'DAI' },
  },
  avalanche: {
    WAVAX: { address: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8', decimals: 18, symbol: 'WAVAX' },
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, symbol: 'USDC' },
    'USDC.e': { address: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', decimals: 6, symbol: 'USDC.e' },
    USDT: { address: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6', decimals: 6, symbol: 'USDT' },
    'USDT.e': { address: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', decimals: 6, symbol: 'USDT.e' },
    DAI: { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18, symbol: 'DAI' },
    WBTC: { address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50', decimals: 8, symbol: 'WBTC' },
    WETH: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, symbol: 'WETH' },
  },
};

// High-value token pairs for priority scanning (most liquid, highest profit potential)
export const PRIORITY_PAIRS: Record<string, [string, string][]> = {
  ethereum: [
    ['WETH', 'USDC'],
    ['WETH', 'USDT'],
    ['WETH', 'DAI'],
    ['WBTC', 'WETH'],
    ['USDC', 'USDT'],
    ['USDC', 'DAI'],
    ['LINK', 'WETH'],
    ['UNI', 'WETH'],
    ['CRV', 'WETH'],
    ['LDO', 'WETH'],
  ],
  arbitrum: [
    ['WETH', 'USDC'],
    ['WETH', 'USDC.e'],
    ['WETH', 'USDT'],
    ['WBTC', 'WETH'],
    ['ARB', 'WETH'],
    ['GMX', 'WETH'],
    ['USDC', 'USDT'],
    ['LINK', 'WETH'],
  ],
  polygon: [
    ['WMATIC', 'USDC'],
    ['WMATIC', 'USDC.e'],
    ['WETH', 'USDC'],
    ['WETH', 'WMATIC'],
    ['USDC', 'USDT'],
    ['WBTC', 'WETH'],
    ['LINK', 'WMATIC'],
  ],
  bsc: [
    ['WBNB', 'USDT'],
    ['WBNB', 'BUSD'],
    ['WBNB', 'USDC'],
    ['ETH', 'WBNB'],
    ['BTCB', 'WBNB'],
    ['CAKE', 'WBNB'],
    ['USDT', 'BUSD'],
  ],
  optimism: [
    ['WETH', 'USDC'],
    ['WETH', 'USDC.e'],
    ['WETH', 'USDT'],
    ['OP', 'WETH'],
    ['WBTC', 'WETH'],
    ['USDC', 'USDT'],
  ],
  base: [
    ['WETH', 'USDC'],
    ['WETH', 'USDbC'],
    ['cbETH', 'WETH'],
    ['USDC', 'USDbC'],
    ['DAI', 'USDC'],
  ],
  avalanche: [
    ['WAVAX', 'USDC'],
    ['WAVAX', 'USDC.e'],
    ['WAVAX', 'USDT'],
    ['WETH', 'WAVAX'],
    ['WBTC', 'WAVAX'],
    ['USDC', 'USDT'],
    ['USDC.e', 'USDT.e'],
  ],
};

// Scanner optimization settings
export const SCANNER_CONFIG = {
  // Parallel scanning settings
  maxConcurrentNetworks: 7,
  maxConcurrentPairs: 10,
  
  // Timing settings
  scanIntervalMs: 1000,
  rpcTimeoutMs: 3000,
  maxRetries: 2,
  
  // Profit thresholds (minimum to display)
  minProfitPercent: 0.05,
  minProfitUsd: 5,
  minNetProfitUsd: 2,
  
  // AUTO-EXECUTION THRESHOLDS
  autoExecuteEnabled: true,
  autoExecuteMinProfitPercent: 2.0, // Only auto-execute if >= 2% profit
  autoExecuteMinConfidence: 80,      // High confidence required
  autoExecuteMinNetProfitUsd: 50,    // Minimum $50 net profit
  autoExecuteMaxSlippage: 1.0,       // Tighter slippage for auto trades
  
  // Confidence thresholds
  minConfidence: 70,
  highConfidenceThreshold: 90,
  
  // Slippage settings
  defaultSlippage: 0.5,
  maxSlippage: 2.0,
  
  // Trade size settings
  defaultTradeAmountUsd: 10000,
  maxTradeAmountUsd: 100000,
  minLiquidityUsd: 50000,
  
  // MEV protection
  useSubmarineTransactions: true,
  usePrivateMempool: true,
  maxBlocksToWait: 2,
};

// Explorer URLs
export const EXPLORER_URLS: Record<string, string> = {
  ethereum: 'https://etherscan.io',
  arbitrum: 'https://arbiscan.io',
  polygon: 'https://polygonscan.com',
  bsc: 'https://bscscan.com',
  optimism: 'https://optimistic.etherscan.io',
  base: 'https://basescan.org',
  avalanche: 'https://snowtrace.io',
};

// Utility functions
export function getWorkingRpc(network: string): string {
  const rpcs = RPC_ENDPOINTS[network];
  return rpcs?.[0] || '';
}

export function getGasSettings(network: string) {
  return GAS_LIMITS[network] || GAS_LIMITS.ethereum;
}

export function getTokenAddress(network: string, symbol: string): string | null {
  return TOKEN_ADDRESSES[network]?.[symbol]?.address || null;
}

export function getTokenDecimals(network: string, symbol: string): number {
  return TOKEN_ADDRESSES[network]?.[symbol]?.decimals || 18;
}

export function getDexRouter(network: string, dex: string): string | null {
  return DEX_CONFIGS[network]?.[dex]?.router || null;
}

export function getDexFactory(network: string, dex: string): string | null {
  return DEX_CONFIGS[network]?.[dex]?.factory || null;
}

export type NetworkName = keyof typeof CONTRACT_ADDRESSES;
