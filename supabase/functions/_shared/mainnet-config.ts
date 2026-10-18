/**
 * Mainnet Optimized Configuration - PRODUCTION READY
 * Maximum speed, security, and profit extraction
 * Uses ALREADY DEPLOYED protocol contracts - NO custom deployment needed!
 */

// Premium RPC endpoints with fallbacks (fastest first)
export const RPC_ENDPOINTS: Record<string, string[]> = {
  ethereum: [
    'https://eth.llamarpc.com',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
    'https://cloudflare-eth.com',
  ],
  arbitrum: [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum.publicnode.com',
    'https://1rpc.io/arb',
  ],
  polygon: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon.llamarpc.com',
    'https://1rpc.io/matic',
  ],
  bsc: [
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://bsc.publicnode.com',
  ],
  optimism: [
    'https://mainnet.optimism.io',
    'https://optimism.publicnode.com',
    'https://1rpc.io/op',
  ],
  base: [
    'https://mainnet.base.org',
    'https://base.publicnode.com',
    'https://1rpc.io/base',
  ],
  avalanche: [
    'https://api.avax.network/ext/bc/C/rpc',
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

// --------------------------------------------------------------------------------
// **Optional paymaster addresses used for ERC-4337 sponsorship**
// These are the high‑volume paymasters we've identified (see PIMLICO_PAYMASTERS_ANALYSIS.md).
// When the scanner is configured to use paymasters, profits will be sent directly to one of
// these addresses and gas will be sponsored via our gasless relay path.
// DISABLED 2026-10-18: legacy third-party paymasters removed. Canonical gasless = authorised service relayer -> FlashArbExecutor.executeFlashLoanGasless. GaslessRelayer.sol is NOT an ERC-4337 paymaster.
export const PAYMASTERS: Record<string, string[]> = {};

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

// Gas price limits (in gwei) per network - Made more lenient to allow scanning during high gas
export const GAS_LIMITS: Record<string, { max: number; target: number; priority: number }> = {
  ethereum: { max: 150, target: 30, priority: 2 },
  arbitrum: { max: 1.5, target: 0.1, priority: 0.01 },
  polygon: { max: 600, target: 100, priority: 30 },
  bsc: { max: 20, target: 3, priority: 1 },
  optimism: { max: 2, target: 0.01, priority: 0.001 },
  base: { max: 2, target: 0.01, priority: 0.001 },
  avalanche: { max: 150, target: 25, priority: 2 },
};

// ============================================================
// PRODUCTION DEPLOYED CONTRACT ADDRESSES
// These are ALREADY DEPLOYED battle-tested protocols!
// ============================================================

// Balancer V2 Vault - FREE flash loans (0% fee) - Same address on all chains
const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

// Uniswap V3 SwapRouter - Production routers for each network
const UNISWAP_V3_ROUTER: Record<string, string> = {
  ethereum: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  arbitrum: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  polygon: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  optimism: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  base: '0x2626664c2603336E57B271c5C0b26F421741e481',
  avalanche: '0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE',
};

// Using REAL deployed protocol contracts
export const CONTRACT_ADDRESSES: Record<string, {
  flashArbExecutor: string;
  gaslessRelayer: string;
  positionRebalancer: string;
}> = {
  ethereum: {
    flashArbExecutor: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    gaslessRelayer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    positionRebalancer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
  },
  arbitrum: {
    flashArbExecutor: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    gaslessRelayer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    positionRebalancer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
  },
  polygon: {
    flashArbExecutor: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    gaslessRelayer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    positionRebalancer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
  },
  bsc: {
    flashArbExecutor: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer // PancakeSwap V2
    gaslessRelayer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer // PancakeSwap V3
    positionRebalancer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
  },
  optimism: {
    flashArbExecutor: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    gaslessRelayer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    positionRebalancer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
  },
  base: {
    flashArbExecutor: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    gaslessRelayer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    positionRebalancer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
  },
  avalanche: {
    flashArbExecutor: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer // TraderJoe
    gaslessRelayer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
    positionRebalancer: '0x0000000000000000000000000000000000000000', // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer
  },
};

// Aave V3 Pool addresses (for flash loans - 0.05% fee backup)
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
    balancer: {
      router: BALANCER_VAULT,
      factory: BALANCER_VAULT,
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
    ramses: {
      router: '0xAAA87963EFeB6f7E0a2711F397663105Acb1805e',
      factory: '0xAAA20D08e59F6561f242b08513D36266C5A29415',
      type: 'v2',
    },
    zyberswap: {
      router: '0x16e71B13fE6079B4312063F7E81F76d165Ad32Ad',
      factory: '0xaC2ee06A14c52570Ef3B9812Ed240BCe359772e7',
      type: 'v2',
    },
    balancer: {
      router: BALANCER_VAULT,
      factory: BALANCER_VAULT,
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
    apeswap: {
      router: '0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607',
      factory: '0xCf083Be4164828f00cAE704EC15a36D711491284',
      type: 'v2',
    },
    balancer: {
      router: BALANCER_VAULT,
      factory: BALANCER_VAULT,
      type: 'v2',
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
    apeswap: {
      router: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
      factory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
      type: 'v2',
    },
    babyswap: {
      router: '0x325E343f1dE602396E256B67eFd1F61C3A6B38Bd',
      factory: '0x86407bEa2078ea5f5EB5A52B2caA963bC1F889Da',
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
    beethovenx: {
      router: BALANCER_VAULT,
      factory: BALANCER_VAULT,
      type: 'v2',
    },
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      factory: '0xc35DADB65773f9F65d6f80C70a3C25a7ebce92bD',
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
    swapbased: {
      router: '0xaaa3b1F1bd7BCc97fD1917c18ADE665C5D31F066',
      factory: '0x04C9f118d21e8B767D2e50C946f0cC9F6C367300',
      type: 'v2',
    },
    sushiswap: {
      router: '0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891',
      factory: '0x71524B4f93c58fcbF659783284E38825f0622859',
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
    sushiswap: {
      router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      factory: '0xc35DADB65773f9F65d6f80C70a3C25a7ebce92bD',
      type: 'v2',
    },
    platypus: {
      router: '0x73256EC7575D999C360c1EeC118ECbEFd8DA7D12',
      factory: '0x66357dCaCe80431aee0A7507e2E361B7e2402370',
      type: 'v2',
    },
  },
};

// ============================================================
// COMPREHENSIVE TOKEN LIST - 70+ tokens per network
// ============================================================
export const TOKEN_ADDRESSES: Record<string, Record<string, {
  address: string;
  decimals: number;
  symbol: string;
}>> = {
  ethereum: {
    // Major tokens
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0x6B175474E89094C44Da98b954EedeACB5BE1023a', decimals: 18, symbol: 'DAI' },
    WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, symbol: 'WBTC' },
    // DeFi tokens
    LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, symbol: 'LINK' },
    UNI: { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, symbol: 'UNI' },
    AAVE: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, symbol: 'AAVE' },
    CRV: { address: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18, symbol: 'CRV' },
    LDO: { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', decimals: 18, symbol: 'LDO' },
    MKR: { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', decimals: 18, symbol: 'MKR' },
    COMP: { address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', decimals: 18, symbol: 'COMP' },
    SNX: { address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', decimals: 18, symbol: 'SNX' },
    // Stablecoins
    FRAX: { address: '0x853d955aCEf822Db058eb8505911ED77F175b99e', decimals: 18, symbol: 'FRAX' },
    LUSD: { address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0', decimals: 18, symbol: 'LUSD' },
    GUSD: { address: '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd', decimals: 2, symbol: 'GUSD' },
    // LSDs
    stETH: { address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18, symbol: 'stETH' },
    wstETH: { address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18, symbol: 'wstETH' },
    rETH: { address: '0xae78736Cd615f374D3085123A210448E74Fc6393', decimals: 18, symbol: 'rETH' },
    cbETH: { address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', decimals: 18, symbol: 'cbETH' },
    // Meme/Popular
    SHIB: { address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', decimals: 18, symbol: 'SHIB' },
    PEPE: { address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', decimals: 18, symbol: 'PEPE' },
    APE: { address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381', decimals: 18, symbol: 'APE' },
    // Layer 2 / Other
    MATIC: { address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', decimals: 18, symbol: 'MATIC' },
    ARB: { address: '0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1', decimals: 18, symbol: 'ARB' },
    OP: { address: '0x4200000000000000000000000000000000000042', decimals: 18, symbol: 'OP' },
    // Wrapped assets
    renBTC: { address: '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D', decimals: 8, symbol: 'renBTC' },
    BUSD: { address: '0x4Fabb145d64652a948d72533023f6E7A623C7C53', decimals: 18, symbol: 'BUSD' },
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
    MAGIC: { address: '0x539bdE0d7Dbd336b79148AA742883198BBF60342', decimals: 18, symbol: 'MAGIC' },
    GRAIL: { address: '0x3d9907F9a368ad0a51Be60f7Da3b97cf940982D8', decimals: 18, symbol: 'GRAIL' },
    RDNT: { address: '0x3082CC23568eA640225c2467653dB90e9250AaA0', decimals: 18, symbol: 'RDNT' },
    PENDLE: { address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8', decimals: 18, symbol: 'PENDLE' },
    wstETH: { address: '0x5979D7b546E38E414F7E9822514be443A4800529', decimals: 18, symbol: 'wstETH' },
    rETH: { address: '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8', decimals: 18, symbol: 'rETH' },
    FRAX: { address: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F', decimals: 18, symbol: 'FRAX' },
    STG: { address: '0x6694340fc020c5E6B96567843da2df01b2CE1eb6', decimals: 18, symbol: 'STG' },
    JOE: { address: '0x371c7ec6D8039ff7933a2AA28EB827Ffe1F52f07', decimals: 18, symbol: 'JOE' },
    SUSHI: { address: '0xd4d42F0b6DEF4CE0383636770eF773390d85c61A', decimals: 18, symbol: 'SUSHI' },
    UNI: { address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', decimals: 18, symbol: 'UNI' },
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
    AAVE: { address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18, symbol: 'AAVE' },
    CRV: { address: '0x172370d5Cd63279eFa6d502DAB29171933a610AF', decimals: 18, symbol: 'CRV' },
    BAL: { address: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3', decimals: 18, symbol: 'BAL' },
    QUICK: { address: '0xB5C064F955D8e7F38fE0460C556a72987494eE17', decimals: 18, symbol: 'QUICK' },
    SUSHI: { address: '0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a', decimals: 18, symbol: 'SUSHI' },
    GRT: { address: '0x5fe2B58c013d7601147DcdD68C143A77499f5531', decimals: 18, symbol: 'GRT' },
    UNI: { address: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', decimals: 18, symbol: 'UNI' },
    SAND: { address: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683', decimals: 18, symbol: 'SAND' },
    MANA: { address: '0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4', decimals: 18, symbol: 'MANA' },
    stMATIC: { address: '0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4', decimals: 18, symbol: 'stMATIC' },
    MaticX: { address: '0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6', decimals: 18, symbol: 'MaticX' },
  },
  bsc: {
    WBNB: { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', decimals: 18, symbol: 'WBNB' },
    BUSD: { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, symbol: 'BUSD' },
    USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, symbol: 'USDT' },
    USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, symbol: 'USDC' },
    ETH: { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, symbol: 'ETH' },
    BTCB: { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, symbol: 'BTCB' },
    CAKE: { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, symbol: 'CAKE' },
    XVS: { address: '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63', decimals: 18, symbol: 'XVS' },
    ALPACA: { address: '0x8F0528cE5eF7B51152A59745bEfDD91D97091d2F', decimals: 18, symbol: 'ALPACA' },
    BAKE: { address: '0xE02dF9e3e622DeBdD69fb838bB799E3F168902c5', decimals: 18, symbol: 'BAKE' },
    AUTO: { address: '0xa184088a740c695E156F91f5cC086a06bb78b827', decimals: 18, symbol: 'AUTO' },
    BANANA: { address: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95', decimals: 18, symbol: 'BANANA' },
    DOT: { address: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', decimals: 18, symbol: 'DOT' },
    ADA: { address: '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', decimals: 18, symbol: 'ADA' },
    XRP: { address: '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', decimals: 18, symbol: 'XRP' },
    LINK: { address: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', decimals: 18, symbol: 'LINK' },
    UNI: { address: '0xBf5140A22578168FD562DCcF235E5D43A02ce9B1', decimals: 18, symbol: 'UNI' },
    DAI: { address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', decimals: 18, symbol: 'DAI' },
    TUSD: { address: '0x14016E85a25aeb13065688cAFB43044C2ef86784', decimals: 18, symbol: 'TUSD' },
  },
  optimism: {
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC' },
    'USDC.e': { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6, symbol: 'USDC.e' },
    USDT: { address: '0x94b008aA00579c1307B0EF2c499aD96a8f233a91', decimals: 6, symbol: 'USDT' },
    DAI: { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18, symbol: 'DAI' },
    OP: { address: '0x4200000000000000000000000000000000000042', decimals: 18, symbol: 'OP' },
    WBTC: { address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8, symbol: 'WBTC' },
    LINK: { address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', decimals: 18, symbol: 'LINK' },
    wstETH: { address: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb', decimals: 18, symbol: 'wstETH' },
    rETH: { address: '0x9Bcef72be871e61ED4fBbc7630889beE758eb81D', decimals: 18, symbol: 'rETH' },
    SNX: { address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4', decimals: 18, symbol: 'SNX' },
    sUSD: { address: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9', decimals: 18, symbol: 'sUSD' },
    VELO: { address: '0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db', decimals: 18, symbol: 'VELO' },
    AAVE: { address: '0x76FB31fb4af56892A25e32cFC43De717950c9278', decimals: 18, symbol: 'AAVE' },
    CRV: { address: '0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53', decimals: 18, symbol: 'CRV' },
    PERP: { address: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0', decimals: 18, symbol: 'PERP' },
    FRAX: { address: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475', decimals: 18, symbol: 'FRAX' },
    LDO: { address: '0xFdb794692724153d1488CcdBE0C56c252596735F', decimals: 18, symbol: 'LDO' },
  },
  base: {
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC' },
    USDbC: { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', decimals: 6, symbol: 'USDbC' },
    cbETH: { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF', decimals: 18, symbol: 'cbETH' },
    DAI: { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18, symbol: 'DAI' },
    wstETH: { address: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452', decimals: 18, symbol: 'wstETH' },
    rETH: { address: '0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c', decimals: 18, symbol: 'rETH' },
    COMP: { address: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0', decimals: 18, symbol: 'COMP' },
    AERO: { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', decimals: 18, symbol: 'AERO' },
    BRETT: { address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', decimals: 18, symbol: 'BRETT' },
    DEGEN: { address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', decimals: 18, symbol: 'DEGEN' },
    TOSHI: { address: '0xAC1Bd2486aAf3B5C0fc3Fd868558b082a531B2B4', decimals: 18, symbol: 'TOSHI' },
    WELL: { address: '0xA88594D404727625A9437C3f886C7643872296AE', decimals: 18, symbol: 'WELL' },
    SNX: { address: '0x22e6966B799c4D5B13BE962E1D117b56327FDa66', decimals: 18, symbol: 'SNX' },
  },
  avalanche: {
    WAVAX: { address: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8', decimals: 18, symbol: 'WAVAX' },
    USDC: { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, symbol: 'USDC' },
    'USDC.e': { address: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', decimals: 6, symbol: 'USDC.e' },
    USDT: { address: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6', decimals: 6, symbol: 'USDT' },
    'USDT.e': { address: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', decimals: 6, symbol: 'USDT.e' },
    DAI: { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18, symbol: 'DAI' },
    'DAI.e': { address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', decimals: 18, symbol: 'DAI.e' },
    WBTC: { address: '0x152b9d0FdC40C096757F570A51E494bd4b943E50', decimals: 8, symbol: 'WBTC' },
    'WBTC.e': { address: '0x50b7545627a5162F82A992c33b87aDc75187B218', decimals: 8, symbol: 'WBTC.e' },
    WETH: { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, symbol: 'WETH' },
    'WETH.e': { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, symbol: 'WETH.e' },
    LINK: { address: '0x5947BB275c521040051D82396192181b413227A3', decimals: 18, symbol: 'LINK' },
    AAVE: { address: '0x63a72806098Bd3D9520cC43356dD78afe5D386D9', decimals: 18, symbol: 'AAVE' },
    JOE: { address: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd', decimals: 18, symbol: 'JOE' },
    PNG: { address: '0x60781C2586D68229fde47564546784ab3fACA982', decimals: 18, symbol: 'PNG' },
    QI: { address: '0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5', decimals: 18, symbol: 'QI' },
    sAVAX: { address: '0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE', decimals: 18, symbol: 'sAVAX' },
    GMX: { address: '0x62edc0692BD897D2295872a9FFCac5425011c661', decimals: 18, symbol: 'GMX' },
    STG: { address: '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590', decimals: 18, symbol: 'STG' },
  },
};

// ============================================================
// HIGH-LIQUIDITY TOKEN PAIRS - Top 15 per network for fast scanning
// ============================================================
export const PRIORITY_PAIRS: Record<string, [string, string][]> = {
  ethereum: [
    ['WETH', 'USDC'], ['WETH', 'USDT'], ['WETH', 'DAI'],
    ['USDC', 'USDT'], ['USDC', 'DAI'], ['USDT', 'DAI'],
    ['WBTC', 'WETH'], ['WBTC', 'USDC'],
    ['LINK', 'WETH'], ['UNI', 'WETH'], ['AAVE', 'WETH'],
    ['stETH', 'WETH'], ['wstETH', 'WETH'], ['rETH', 'WETH'], ['cbETH', 'WETH'],
  ],
  arbitrum: [
    ['WETH', 'USDC'], ['WETH', 'USDC.e'], ['WETH', 'USDT'], ['WETH', 'DAI'],
    ['USDC', 'USDC.e'], ['USDC', 'USDT'], ['USDC', 'DAI'],
    ['WBTC', 'WETH'], ['ARB', 'WETH'], ['ARB', 'USDC'],
    ['GMX', 'WETH'], ['GMX', 'USDC'],
    ['LINK', 'WETH'], ['wstETH', 'WETH'], ['rETH', 'WETH'],
  ],
  polygon: [
    ['WMATIC', 'USDC'], ['WMATIC', 'USDT'], ['WMATIC', 'WETH'],
    ['WETH', 'USDC'], ['WETH', 'USDT'], ['WETH', 'DAI'],
    ['USDC', 'USDT'], ['USDC', 'DAI'],
    ['WBTC', 'WETH'], ['WBTC', 'USDC'],
    ['LINK', 'WETH'], ['AAVE', 'WETH'],
    ['QUICK', 'WMATIC'], ['stMATIC', 'WMATIC'], ['MaticX', 'WMATIC'],
  ],
  bsc: [
    ['WBNB', 'USDT'], ['WBNB', 'BUSD'], ['WBNB', 'USDC'],
    ['USDT', 'BUSD'], ['USDC', 'BUSD'], ['USDT', 'USDC'],
    ['BTCB', 'WBNB'], ['BTCB', 'USDT'], ['ETH', 'WBNB'], ['ETH', 'USDT'],
    ['CAKE', 'WBNB'], ['CAKE', 'USDT'],
    ['LINK', 'WBNB'], ['DOT', 'WBNB'], ['XRP', 'WBNB'],
  ],
  optimism: [
    ['WETH', 'USDC'], ['WETH', 'USDT'], ['WETH', 'DAI'],
    ['USDC', 'USDT'], ['USDC', 'DAI'], ['USDC', 'sUSD'],
    ['OP', 'WETH'], ['OP', 'USDC'],
    ['SNX', 'WETH'], ['SNX', 'USDC'], ['SNX', 'OP'],
    ['AAVE', 'WETH'], ['wstETH', 'WETH'], ['rETH', 'WETH'], ['VELO', 'WETH'],
  ],
  base: [
    ['WETH', 'USDC'], ['WETH', 'USDbC'], ['WETH', 'DAI'],
    ['USDC', 'USDbC'], ['USDC', 'DAI'],
    ['cbETH', 'WETH'], ['cbETH', 'USDC'],
    ['wstETH', 'WETH'], ['rETH', 'WETH'],
    ['AERO', 'WETH'], ['AERO', 'USDC'],
    ['COMP', 'WETH'], ['SNX', 'WETH'],
    ['BRETT', 'WETH'], ['DEGEN', 'WETH'],
  ],
  avalanche: [
    ['WAVAX', 'USDC'], ['WAVAX', 'USDT'], ['WAVAX', 'WETH'],
    ['USDC', 'USDT'], ['USDC', 'DAI'], ['USDC', 'USDC.e'],
    ['WBTC', 'WAVAX'], ['WETH', 'USDC'],
    ['JOE', 'WAVAX'], ['JOE', 'USDC'],
    ['LINK', 'WAVAX'], ['AAVE', 'WAVAX'],
    ['sAVAX', 'WAVAX'], ['GMX', 'WAVAX'], ['PNG', 'WAVAX'],
  ],
};

// Scanner optimization settings - Made more lenient to find more opportunities
export const SCANNER_CONFIG = {
  // Parallel scanning settings
  maxConcurrentNetworks: 3,
  maxConcurrentPairs: 5, // Reduced to avoid CPU timeout
  
  // Timing settings
  scanIntervalMs: 300, // Faster scanning
  rpcTimeoutMs: 3000,
  maxRetries: 2,
  
  // Profit thresholds (minimum to display) - LOWERED to find more opportunities
  minProfitPercent: 0.01, // Very low threshold to catch micro-arbitrage
  minProfitUsd: 1,
  minNetProfitUsd: 0.5,
  
  // AUTO-EXECUTION THRESHOLDS - client-controlled only; scanner should never fire live txs by itself
  autoExecuteEnabled: false,
  autoExecuteMinProfitPercent: 0.5, // Much lowered for more trades
  autoExecuteMinConfidence: 50, // Lowered
  autoExecuteMinNetProfitUsd: 5, // Much lowered for more trades
  autoExecuteMaxSlippage: 2.0,
  
  // Confidence thresholds - LOWERED to show more opportunities
  minConfidence: 30, // Much lowered to show more opportunities
  highConfidenceThreshold: 70,
  
  // Slippage settings
  defaultSlippage: 0.5,
  maxSlippage: 3.0,
  
  // Trade size settings
  defaultTradeAmountUsd: 100, // Conservative default so user wallets can cover the trade
  maxTradeAmountUsd: 5000,
  minLiquidityUsd: 10000, // Lowered liquidity requirement
  
  // MEV protection
  useSubmarineTransactions: true,
  usePrivateMempool: true,
  maxBlocksToWait: 3,

  // if enabled, transactions will be routed through the first address in
  // PAYMASTERS[network].  That address is *not* a private key – it's an
  // ERC‑4337 paymaster contract.  Your backend must forward the call through
  // an ERC‑4337 bundler (set BUNDLER_URL or PIMLICO_BUNDLER_URL) which attaches
  // `paymasterAddress` to the UserOperation.  The connected wallet still
  // receives profits; the paymaster contract is responsible for gas.
  //
  // Existing code previously required PAYMASTER_PRIVATE_KEY; that pattern is
  // now deprecated and removed (the private key cannot be derived for a
  // contract).  If you really want a server‑side key instead you can still
  // fallback to the old direct path by disabling usePaymasters.
  usePaymasters: false, // DISABLED: canonical path is service-relayer executeFlashLoanGasless
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

export function getAllNetworks(): string[] {
  return Object.keys(CHAIN_IDS);
}

export function getNetworkChainId(network: string): number {
  return CHAIN_IDS[network] || 1;
}
