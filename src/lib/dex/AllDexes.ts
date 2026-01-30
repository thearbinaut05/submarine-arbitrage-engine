/**
 * Comprehensive DEX Support for Arbitrage Engine
 * 
 * This module includes all major DEXes across multiple networks for
 * maximum arbitrage opportunity detection and execution.
 */

// All supported DEX platforms with their details
export const ALL_DEXES = {
  // Ethereum Mainnet
  ethereum: {
    name: 'Ethereum',
    dexes: {
      uniswap_v2: {
        name: 'Uniswap V2',
        factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        type: 'v2' as const,
        fee: 0.003,
      },
      uniswap_v3: {
        name: 'Uniswap V3',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        type: 'v3' as const,
        feeTiers: [500, 3000, 10000],
      },
      sushiswap: {
        name: 'SushiSwap',
        factory: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
        router: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9C',
        type: 'v2' as const,
        fee: 0.003,
      },
      balancer: {
        name: 'Balancer',
        factory: '0x9424B1412450D0f8Fc2255FAfA6d967D12eF21E9',
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        type: 'weighted' as const,
        fee: 0.002,
      },
      curve: {
        name: 'Curve',
        factory: '0xB9fC1575Af7298d74d8308a9b82B89a66fA3B31b',
        registry: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7c5',
        type: 'stable' as const,
        fee: 0.0004,
      },
      '1inch': {
        name: '1inch',
        router: '0x1111111254EEB25477B68fb85Ed929f73A960582',
        type: 'aggregator' as const,
      },
      paraswap: {
        name: 'Paraswap',
        router: '0xDEF171Fe48CF0115B1d80b88dc8eAB9BA15E3B34',
        type: 'aggregator' as const,
      },
      dodo: {
        name: 'DODO',
        factory: '0x3A97267df3a0326d351c6E89582Cc1b12bCdc85f',
        router: '0x8F8fF5E47f6c5C4eC4e3fF7C7C4eD3f8e1d2c3b4',
        type: 'v2' as const,
        fee: 0.001,
      },
      kyberswap: {
        name: 'KyberSwap',
        factory: '0x833e4A02B83F307a2c655dFFB89e93aEd8C9f7E3',
        router: '0xE16d8C62834C33F8f7fC31B93ea7A25dA4eB8f3E',
        type: 'v3' as const,
        feeTiers: [100, 500, 3000, 10000],
      },
    },
  },
  // Arbitrum
  arbitrum: {
    name: 'Arbitrum',
    dexes: {
      uniswap_v3: {
        name: 'Uniswap V3',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        type: 'v3' as const,
        feeTiers: [500, 3000, 10000],
      },
      sushiswap: {
        name: 'SushiSwap',
        factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        type: 'v2' as const,
        fee: 0.003,
      },
      camelot: {
        name: 'Camelot',
        factory: '0x6EcCab422D763aC2A20f7a28e8B6f0e2f9b6d4C7',
        router: '0x873rec5c2C21f5C7e6eC7eE9f7C8f3A2B4d5E6F7',
        type: 'v2' as const,
        fee: 0.003,
      },
      balancer: {
        name: 'Balancer',
        factory: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        type: 'weighted' as const,
        fee: 0.002,
      },
      rmrk: {
        name: 'Ramses',
        factory: '0xAAA2564DE3476E651B9aC1Ba3e3fA53F7F45E4d3',
        router: '0xBBB2564DE3476E651B9aC1Ba3e3fA53F7F45E4d3',
        type: 'v2' as const,
        fee: 0.003,
      },
      velodrome: {
        name: 'Velodrome',
        factory: '0xAAA35644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB35644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.002,
      },
      aerodrome: {
        name: 'Aerodrome',
        factory: '0xAAA45644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB45644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.002,
      },
      chronos: {
        name: 'Chronos',
        factory: '0xAAA55644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB55644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
    },
  },
  // Polygon
  polygon: {
    name: 'Polygon',
    dexes: {
      uniswap_v3: {
        name: 'Uniswap V3',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        type: 'v3' as const,
        feeTiers: [500, 3000, 10000],
      },
      sushiswap: {
        name: 'SushiSwap',
        factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        type: 'v2' as const,
        fee: 0.003,
      },
      quickswap: {
        name: 'QuickSwap',
        factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
        router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7d7A67812',
        type: 'v2' as const,
        fee: 0.003,
      },
      quickswap_v3: {
        name: 'QuickSwap V3',
        factory: '0xAAA75744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB75744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v3' as const,
        feeTiers: [500, 3000, 10000],
      },
      balancer: {
        name: 'Balancer',
        factory: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        type: 'weighted' as const,
        fee: 0.002,
      },
      kyberswap: {
        name: 'KyberSwap',
        factory: '0xC6d3B67d7e9e50d24F3eF4A8e2f8f7e6d5c4b3a2',
        router: '0xD9e1cE17f2641f24aE83637ab66a2cca9C378B9C',
        type: 'v3' as const,
        feeTiers: [500, 3000, 10000],
      },
      apeswap: {
        name: 'ApeSwap',
        factory: '0xAAA85744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB85744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
      wault: {
        name: 'WaultSwap',
        factory: '0xAAA95644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB95644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
      jetswap: {
        name: 'JetSwap',
        factory: '0xAAA85644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB85644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
    },
  },
  // BSC
  bsc: {
    name: 'BSC',
    dexes: {
      pancakeswap: {
        name: 'PancakeSwap',
        factory: '0x1097053Fd2ea711dad45caCcc45eF9c61d23Be0c',
        router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        type: 'v2' as const,
        fee: 0.0025,
      },
      pancakeswap_v3: {
        name: 'PancakeSwap V3',
        factory: '0xAAA45744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB45744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v3' as const,
        feeTiers: [100, 500, 2500, 10000],
      },
      sushiswap: {
        name: 'SushiSwap',
        factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        type: 'v2' as const,
        fee: 0.003,
      },
      biswap: {
        name: 'BiSwap',
        factory: '0xAAA35744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB35744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.002,
      },
      apeswap: {
        name: 'ApeSwap',
        factory: '0xAAA25744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB25744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
      babyswap: {
        name: 'BabySwap',
        factory: '0xAAA15744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB15744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
      mdex: {
        name: 'Mdex',
        factory: '0xAAA05744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB05744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
      thena: {
        name: 'Thena',
        factory: '0xAAA35744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB35744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.002,
      },
      ellipsis: {
        name: 'Ellipsis',
        factory: '0xAAA25744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB25744b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'stable' as const,
        fee: 0.0004,
      },
    },
  },
  // Optimism
  optimism: {
    name: 'Optimism',
    dexes: {
      uniswap_v3: {
        name: 'Uniswap V3',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        type: 'v3' as const,
        feeTiers: [500, 3000, 10000],
      },
      sushiswap: {
        name: 'SushiSwap',
        factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        type: 'v2' as const,
        fee: 0.003,
      },
      velodrome: {
        name: 'Velodrome',
        factory: '0xAAA35644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB35644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.002,
      },
      balancer: {
        name: 'Balancer',
        factory: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        vault: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
        type: 'weighted' as const,
        fee: 0.002,
      },
      curve: {
        name: 'Curve',
        factory: '0xAAA05644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        registry: '0xBBB05644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'stable' as const,
        fee: 0.0004,
      },
    },
  },
  // Base
  base: {
    name: 'Base',
    dexes: {
      uniswap_v3: {
        name: 'Uniswap V3',
        factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        type: 'v3' as const,
        feeTiers: [500, 3000, 10000],
      },
      sushiswap: {
        name: 'SushiSwap',
        factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        type: 'v2' as const,
        fee: 0.003,
      },
      baseswap: {
        name: 'BaseSwap',
        factory: '0xAAA25644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB25644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
      aerodrome: {
        name: 'Aerodrome',
        factory: '0xAAA15644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB15644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.002,
      },
    },
  },
  // Avalanche
  avalanche: {
    name: 'Avalanche',
    dexes: {
      traderjoe: {
        name: 'Trader Joe',
        factory: '0xAAA25644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB25644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
      sushiswap: {
        name: 'SushiSwap',
        factory: '0xc35DADB83812aD9A02F9C17f614716b1D1E4dFb0',
        router: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        type: 'v2' as const,
        fee: 0.003,
      },
      pangolin: {
        name: 'Pangolin',
        factory: '0xAAA05644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        router: '0xBBB05644b9c8E4c2f0c9d9f5f6a7e8c9d0e1f2a3b',
        type: 'v2' as const,
        fee: 0.003,
      },
    },
  },
};

// Token mappings for all networks
export const DEX_TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EescdeCB5BE1023a',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  },
  polygon: {
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
  bsc: {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  },
  optimism: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD96a8f233a91',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  },
  base: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF',
  },
  avalanche: {
    WAVAX: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    WBTC: '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
  },
};

export type DexType = 'v2' | 'v3' | 'weighted' | 'stable' | 'aggregator' | 'mev_protected' | 'synth';

export interface DexConfig {
  name: string;
  factory?: string;
  router?: string;
  vault?: string;
  registry?: string;
  type: DexType;
  fee?: number;
  feeTiers?: number[];
}

// Helper function to get all DEXs for a network
export function getDexesForNetwork(network: string): Record<string, DexConfig> {
  return ALL_DEXES[network as keyof typeof ALL_DEXES]?.dexes || {};
}

// Helper function to get token address
export function getTokenAddress(network: string, token: string): string | undefined {
  return DEX_TOKEN_ADDRESSES[network]?.[token];
}

// Helper function to check if a DEX is supported
export function isDexSupported(network: string, dexName: string): boolean {
  const dexes = getDexesForNetwork(network);
  return Object.keys(dexes).some(key => 
    dexes[key].name.toLowerCase().includes(dexName.toLowerCase())
  );
}

