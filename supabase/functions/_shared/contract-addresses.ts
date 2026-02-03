/**
 * Contract Addresses - Using ALREADY DEPLOYED Protocol Contracts
 * No custom deployment needed! These are production contracts on mainnet.
 */

// Balancer V2 Vault - Same address on all chains (CREATE2)
// FREE flash loans (0% fee)
export const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8';

// Uniswap V3 SwapRouter - Deployed on most chains
export const UNISWAP_V3_ROUTER: Record<string, string> = {
  ethereum: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  arbitrum: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  polygon: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  optimism: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  base: '0x2626664c2603336E57B271c5C0b26F421741e481',
};

// SushiSwap Router V2
export const SUSHISWAP_ROUTER: Record<string, string> = {
  ethereum: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
  arbitrum: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  polygon: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  bsc: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  avalanche: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
};

// Legacy addresses (kept for compatibility but now using protocol contracts)
export const CONTRACT_ADDRESSES = {
  ethereum: {
    chainId: 1,
    flashArbExecutor: BALANCER_VAULT, // Use Balancer for flash loans
    gaslessRelayer: UNISWAP_V3_ROUTER.ethereum,
    positionRebalancer: UNISWAP_V3_ROUTER.ethereum,
  },
  arbitrum: {
    chainId: 42161,
    flashArbExecutor: BALANCER_VAULT,
    gaslessRelayer: UNISWAP_V3_ROUTER.arbitrum,
    positionRebalancer: UNISWAP_V3_ROUTER.arbitrum,
  },
  polygon: {
    chainId: 137,
    flashArbExecutor: BALANCER_VAULT,
    gaslessRelayer: UNISWAP_V3_ROUTER.polygon,
    positionRebalancer: UNISWAP_V3_ROUTER.polygon,
  },
  bsc: {
    chainId: 56,
    flashArbExecutor: '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap
    gaslessRelayer: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    positionRebalancer: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  },
  optimism: {
    chainId: 10,
    flashArbExecutor: BALANCER_VAULT,
    gaslessRelayer: UNISWAP_V3_ROUTER.optimism,
    positionRebalancer: UNISWAP_V3_ROUTER.optimism,
  },
  base: {
    chainId: 8453,
    flashArbExecutor: BALANCER_VAULT,
    gaslessRelayer: UNISWAP_V3_ROUTER.base,
    positionRebalancer: UNISWAP_V3_ROUTER.base,
  },
  avalanche: {
    chainId: 43114,
    flashArbExecutor: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', // TraderJoe
    gaslessRelayer: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
    positionRebalancer: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
  },
} as const;

export const TOKEN_ADDRESSES = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeACB5BE1023a',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    CRV: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    LDO: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
  },
  arbitrum: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
  },
  polygon: {
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    'USDC.e': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    LINK: '0xb0897686c545045aFc77CF20eC7A532E3120E0F1',
  },
  bsc: {
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  },
  optimism: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    'USDC.e': '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD96a8f233a91',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    OP: '0x4200000000000000000000000000000000000042',
    WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
  },
  base: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0E9daF',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  },
  avalanche: {
    WAVAX: '0xB31f66AA3C1e785BaF9CBe0C3c6DaF60c8b29AD8',
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'USDC.e': '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664',
    USDT: '0x9702230A6Ea8C04618D7aDB17aB9C6C0c27Ca7e6',
    'USDT.e': '0xc7198437980c041c805A1EDcbA50c1Ce5db95118',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    WBTC: '0x152b9d0FdC40C096757F570A51E494bd4b943E50',
    WETH: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
  },
} as const;

export type NetworkName = keyof typeof CONTRACT_ADDRESSES;

export function getContractAddress(
  network: NetworkName,
  contract: 'flashArbExecutor' | 'gaslessRelayer' | 'positionRebalancer'
): string {
  const networkConfig = CONTRACT_ADDRESSES[network];
  if (!networkConfig) {
    throw new Error(`Network ${network} not deployed`);
  }
  return networkConfig[contract];
}

export function getChainId(network: NetworkName): number {
  return CONTRACT_ADDRESSES[network].chainId;
}

export function getTokenAddress(network: NetworkName, symbol: string): string | undefined {
  return (TOKEN_ADDRESSES[network] as Record<string, string>)?.[symbol];
}
