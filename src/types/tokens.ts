/**
 * @title Comprehensive Token Configuration
 * @notice Unified configuration for all supported tokens across all chains
 */

// ============================================================================
// TOKEN DEFINITIONS
// ============================================================================

export type TokenSymbol = 
  | 'ETH' | 'WETH' | 'WBTC' | 'USDC' | 'USDT' | 'DAI' | 'MATIC' | 'BNB'
  | 'AVAX' | 'FTM' | 'ONE' | 'CRO' | 'GLMR' | 'EVMOS' | 'OKT' | 'xDAI'
  | 'LINK' | 'UNI' | 'AAVE' | 'CRV' | 'SNX' | 'MKR' | 'COMP' | 'ENS'
  | 'OP' | 'ARB' | 'SOL' | 'LDO' | 'STG' | 'sUSD' | 'GNO' | 'KAVA'
  | 'CELO' | 'MAI' | 'USDD' | 'TUSD' | 'BUSD' | 'WBTC.e' | 'WETH.e' | 'USDC.e'
  | 'USDT.e' | 'DAI.e' | 'BTC.b' | 'CAKE';

export interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  decimals: number;
  isNative: boolean;
  isStable: boolean;
  isWrapped: boolean;
  coingeckoId?: string;
}

export const TOKENS: Record<TokenSymbol, TokenConfig> = {
  ETH: { symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'ethereum' },
  WETH: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, isNative: false, isStable: false, isWrapped: true, coingeckoId: 'weth' },
  MATIC: { symbol: 'MATIC', name: 'Polygon', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'matic-network' },
  BNB: { symbol: 'BNB', name: 'BNB', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'binancecoin' },
  AVAX: { symbol: 'AVAX', name: 'Avalanche', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'avalanche-2' },
  FTM: { symbol: 'FTM', name: 'Fantom', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'fantom' },
  ONE: { symbol: 'ONE', name: 'Harmony', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'harmony' },
  CRO: { symbol: 'CRO', name: 'Cronos', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'crypto-com-coin' },
  GLMR: { symbol: 'GLMR', name: 'Glimmer', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'moonbeam' },
  EVMOS: { symbol: 'EVMOS', name: 'Evmos', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'evmos' },
  OKT: { symbol: 'OKT', name: 'OKT', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'okexchain' },
  xDAI: { symbol: 'xDAI', name: 'xDai', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'xdai' },
  KAVA: { symbol: 'KAVA', name: 'Kava', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'kava' },
  CELO: { symbol: 'CELO', name: 'Celo', decimals: 18, isNative: true, isStable: false, isWrapped: false, coingeckoId: 'celo' },
  WBTC: { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, isNative: false, isStable: false, isWrapped: true, coingeckoId: 'wrapped-bitcoin' },
  'BTC.b': { symbol: 'BTC.b', name: 'Bitcoin (Bridge)', decimals: 8, isNative: false, isStable: false, isWrapped: true },
  USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'usd-coin' },
  USDT: { symbol: 'USDT', name: 'Tether', decimals: 6, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'tether' },
  DAI: { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'dai' },
  TUSD: { symbol: 'TUSD', name: 'TrueUSD', decimals: 18, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'true-usd' },
  BUSD: { symbol: 'BUSD', name: 'Binance USD', decimals: 18, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'binance-usd' },
  USDD: { symbol: 'USDD', name: 'USDD', decimals: 18, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'usdd' },
  MAI: { symbol: 'MAI', name: 'Mai USD', decimals: 18, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'mimatic' },
  sUSD: { symbol: 'sUSD', name: 'Synth sUSD', decimals: 18, isNative: false, isStable: true, isWrapped: false, coingeckoId: 'nusd' },
  'WETH.e': { symbol: 'WETH.e', name: 'Wrapped ETH (Avalanche)', decimals: 18, isNative: false, isStable: false, isWrapped: true },
  'USDC.e': { symbol: 'USDC.e', name: 'USD Coin (Avalanche)', decimals: 6, isNative: false, isStable: true, isWrapped: true },
  'USDT.e': { symbol: 'USDT.e', name: 'Tether (Avalanche)', decimals: 6, isNative: false, isStable: true, isWrapped: true },
  'DAI.e': { symbol: 'DAI.e', name: 'Dai (Avalanche)', decimals: 18, isNative: false, isStable: true, isWrapped: true },
  'WBTC.e': { symbol: 'WBTC.e', name: 'Wrapped BTC (Ethereum)', decimals: 8, isNative: false, isStable: false, isWrapped: true },
  LINK: { symbol: 'LINK', name: 'Chainlink', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'chainlink' },
  UNI: { symbol: 'UNI', name: 'Uniswap', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'uniswap' },
  AAVE: { symbol: 'AAVE', name: 'Aave', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'aave' },
  CRV: { symbol: 'CRV', name: 'Curve DAO', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'curve-dao-token' },
  SNX: { symbol: 'SNX', name: 'Synthetix', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'havven' },
  MKR: { symbol: 'MKR', name: 'Maker', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'maker' },
  COMP: { symbol: 'COMP', name: 'Compound', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'compound-governance-token' },
  ENS: { symbol: 'ENS', name: 'Ethereum Name Service', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'ethereum-name-service' },
  OP: { symbol: 'OP', name: 'Optimism', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'optimism' },
  ARB: { symbol: 'ARB', name: 'Arbitrum', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'arbitrum' },
  LDO: { symbol: 'LDO', name: 'Lido DAO', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'lido-dao' },
  STG: { symbol: 'STG', name: 'Stargate', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'stargate-finance' },
  SOL: { symbol: 'SOL', name: 'Solana', decimals: 9, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'solana' },
  GNO: { symbol: 'GNO', name: 'Gnosis', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'gnosis' },
  CAKE: { symbol: 'CAKE', name: 'PancakeSwap', decimals: 18, isNative: false, isStable: false, isWrapped: false, coingeckoId: 'pancakeswap-token' },
};

export interface TokenAddress {
  symbol: TokenSymbol;
  address: string;
  chainId: number;
}

export const TOKEN_ADDRESSES: TokenAddress[] = [
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 1 },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', chainId: 1 },
  { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', chainId: 1 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chainId: 1 },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', chainId: 1 },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EescdeCB5BE1023a', chainId: 1 },
  { symbol: 'LINK', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', chainId: 1 },
  { symbol: 'UNI', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', chainId: 1 },
  { symbol: 'AAVE', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', chainId: 1 },
  { symbol: 'CRV', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', chainId: 1 },
  { symbol: 'MKR', address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', chainId: 1 },
  { symbol: 'COMP', address: '0xc00e94Cb662C3520282E6f5717214004A7f26888', chainId: 1 },
  { symbol: 'SNX', address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', chainId: 1 },
  { symbol: 'ENS', address: '0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72', chainId: 1 },
  { symbol: 'OP', address: '0x4200000000000000000000000000000000000042', chainId: 1 },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', chainId: 1 },
  { symbol: 'LDO', address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', chainId: 1 },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 42161 },
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', chainId: 42161 },
  { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7daa34160be07d9C8c41', chainId: 42161 },
  { symbol: 'USDC', address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', chainId: 42161 },
  { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', chainId: 42161 },
  { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', chainId: 42161 },
  { symbol: 'LINK', address: '0xf97f4df75117a78c1A5a0dbb814Af9245A9B68E0', chainId: 42161 },
  { symbol: 'UNI', address: '0xFa7F8980b0f1E64A2062791cc3b3e75C9c5b32eA', chainId: 42161 },
  { symbol: 'AAVE', address: '0xba5DDD1f9d7F570dc94a51479a000E3BCE4Eb03c', chainId: 42161 },
  { symbol: 'CRV', address: '0x11cDb42B0EB46D99f81c9D03e12B6C99d58E83A7', chainId: 42161 },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 8453 },
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', chainId: 8453 },
  { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', chainId: 8453 },
  { symbol: 'USDT', address: '0xfde4C96c8593536E31F229c8f28bd45d6cF3C3E5', chainId: 8453 },
  { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', chainId: 8453 },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 10 },
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', chainId: 10 },
  { symbol: 'WBTC', address: '0x68f180fcCe6836688e9084f03529E4eD9cC4b9dA', chainId: 10 },
  { symbol: 'USDC', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', chainId: 10 },
  { symbol: 'USDT', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', chainId: 10 },
  { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', chainId: 10 },
  { symbol: 'LINK', address: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6', chainId: 10 },
  { symbol: 'OP', address: '0x4200000000000000000000000000000000000042', chainId: 10 },
  { symbol: 'MATIC', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 137 },
  { symbol: 'WETH', address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', chainId: 137 },
  { symbol: 'WBTC', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', chainId: 137 },
  { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', chainId: 137 },
  { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', chainId: 137 },
  { symbol: 'DAI', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', chainId: 137 },
  { symbol: 'LINK', address: '0x53E0bca35eC356BD5ddDFEbdD1Fc0fD03FaBad39', chainId: 137 },
  { symbol: 'AAVE', address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', chainId: 137 },
  { symbol: 'BNB', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 56 },
  { symbol: 'WETH', address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', chainId: 56 },
  { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', chainId: 56 },
  { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', chainId: 56 },
  { symbol: 'DAI', address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', chainId: 56 },
  { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', chainId: 56 },
  { symbol: 'CAKE', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', chainId: 56 },
  { symbol: 'AVAX', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 43114 },
  { symbol: 'WETH.e', address: '0x49D5c2BdFfac6f2f340803c48e32cf2a80b20675', chainId: 43114 },
  { symbol: 'WBTC.e', address: '0x152b9d0FdC40C096757F7A38BD2dA6cD6A2dFd8c', chainId: 43114 },
  { symbol: 'USDC.e', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', chainId: 43114 },
  { symbol: 'USDT.e', address: '0x9702230A6Ea8C46118ddC91069bFF2Bb2B46E678', chainId: 43114 },
  { symbol: 'DAI.e', address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70', chainId: 43114 },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 59144 },
  { symbol: 'WETH', address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', chainId: 59144 },
  { symbol: 'USDC', address: '0x176211869cA2b568f2A7D4EE1E0E72C52F9cC549', chainId: 59144 },
  { symbol: 'USDT', address: '0xA219439258ca9da29E9Cc4cE559658474c12EEe', chainId: 59144 },
  { symbol: 'DAI', address: '0x4aa41bC62a13397b2eE1945775E0a49D4e15EdBC', chainId: 59144 },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 324 },
  { symbol: 'WETH', address: '0x5AEa577CB9a59E5E52C63dC9B89A9B64aC3d8751', chainId: 324 },
  { symbol: 'USDC', address: '0x3355df6D4c9C9e1e07aF5Df51b2F4a26dF5dC99B', chainId: 324 },
  { symbol: 'USDT', address: '0x493257fD37EDB34451a62e098FD91414F9325fD4', chainId: 324 },
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 534352 },
  { symbol: 'WETH', address: '0x5300000000000000000000000000000000000004', chainId: 534352 },
  { symbol: 'USDC', address: '0x06eFdBFf2a14a2298cB5503bE71d91AC82a4C85E', chainId: 534352 },
  { symbol: 'USDT', address: '0xf55BEC9Fda63C05ed57855aD7Bd7d7ad397E9b48', chainId: 534352 },
  { symbol: 'FTM', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 250 },
  { symbol: 'WETH', address: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', chainId: 250 },
  { symbol: 'USDC', address: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', chainId: 250 },
  { symbol: 'DAI', address: '0x8D11eC38a3EB5E956b052f67Da8Bdc9bef8Abf3E', chainId: 250 },
  { symbol: 'xDAI', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', chainId: 100 },
  { symbol: 'WETH', address: '0x6A023CCd1ff6F2045C3309768eE39E0B17E2FCdF', chainId: 100 },
  { symbol: 'USDC', address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83', chainId: 100 },
  { symbol: 'GNO', address: '0x9C58BAcC331c9aa871AF6bC45F7b44C3f9E6dC8c', chainId: 100 },
];

export function getTokenAddress(symbol: TokenSymbol, chainId: number): string | undefined {
  const tokenAddress = TOKEN_ADDRESSES.find(t => t.symbol === symbol && t.chainId === chainId);
  return tokenAddress?.address;
}

export function getTokensForChain(chainId: number): TokenAddress[] {
  return TOKEN_ADDRESSES.filter(t => t.chainId === chainId);
}

export function getTokenConfig(symbol: TokenSymbol): TokenConfig | undefined {
  return TOKENS[symbol];
}

