// Network-specific contract addresses for deployment
export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    // Aave V3
    aavePoolProvider: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
    // DEX Routers
    uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiswapRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    // Common tokens
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    dai: "0x6B175474E89094C44Da98b954EescdeCB5BE1023a",
    // Gelato Relay for gasless submarine transactions
    // Using Gelato's official mainnet relay address for sponsored calls
    gelatoRelay: "0x27e4D5a5c6De0065F90fDa5Da0bA5f1dB39D8b8f",
    // Alternative Gelato addresses for different relay types:
    // - 0x27e4D5a5c6De0065F90fDa5Da0bA5f1dB39D8b8f (Gelato Relay v2)
    // - 0xaBcC9b596420A9E9172FD5938620E265a0f9Df92 (Gelato Automate)
// Gas settings
    maxGasPrice: 100_000_000_000, // 100 gwei
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    paymasters: [
      "0xdCBE0C1A00e4Cf24AE77c52125e6e6b4F7C6Db4e",
      "0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402",
      "0x7D3201fa7a85c0A5f9fA1c0C6b9D0B784368d2ac"
    ]
  },

  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiswapRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    usdc: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    dai: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    maxGasPrice: 1_000_000_000, // 1 gwei
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    aavePoolProvider: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiswapRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    quickswapRouter: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    weth: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    dai: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    maxGasPrice: 500_000_000_000, // 500 gwei
  },
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    aavePoolProvider: "0x0000000000000000000000000000000000000000", // No Aave on BSC
    pancakeswapRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    sushiswapRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    weth: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdt: "0x55d398326f99059fF775485246999027B3197955",
    dai: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    maxGasPrice: 5_000_000_000, // 5 gwei
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    aavePoolProvider: "0x0496275d34753A48320CA58103d5220d394FF77FC", // Aave V3 Sepolia
    uniswapV3Router: "0xC532a74256D3Db42D0Bf7a0400feFDbad7694008", // Uniswap V3 Sepolia
    sushiswapRouter: "0x0", // No Sushiswap on Sepolia
    weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH Sepolia
    usdc: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // USDC Sepolia
    usdt: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", // USDT Sepolia
    dai: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", // DAI Sepolia
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92", // Gelato Relay
    maxGasPrice: 50_000_000_000, // 50 gwei
  },
};

export interface NetworkConfig {
  entryPoint?: string;
  paymasters?: string[];

  chainId: number;
  name: string;
  aavePoolProvider: string;
  uniswapV3Router?: string;
  sushiswapRouter?: string;
  quickswapRouter?: string;
  pancakeswapRouter?: string;
  weth: string;
  usdc: string;
  usdt: string;
  dai: string;
  gelatoRelay: string;
  maxGasPrice: number;
}

export interface DeployedContracts {
  flashArbExecutor: string;
  gaslessRelayer: string;
  positionRebalancer: string;
  network: string;
  deployer: string;
  timestamp: number;
  txHashes: {
    flashArbExecutor: string;
    gaslessRelayer: string;
    positionRebalancer: string;
  };
}
