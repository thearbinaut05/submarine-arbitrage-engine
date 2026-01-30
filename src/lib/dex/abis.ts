// DEX Contract ABIs for on-chain price fetching
// Uniswap V2/V3, SushiSwap, and Multicall

// ============================================
// UNISWAP V2 PAIR ABI (for getting reserves)
// ============================================
export const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function factory() view returns (address)',
  'function price0CumulativeLast() view returns (uint112)',
  'function price1CumulativeLast() view returns (uint112)',
];

// ============================================
// UNISWAP V2 FACTORY ABI (for finding pairs)
// ============================================
export const UNISWAP_V2_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address)',
  'function allPairs(uint256) view returns (address)',
  'function allPairsLength() view returns (uint256)',
];

// ============================================
// UNISWAP V3 POOL ABI (for slot0 price)
// ============================================
export const UNISWAP_V3_POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function observations(uint256) view returns (uint32 blockTimestamp, int56 tickCumulative, uint160 secondsPerLiquidityCumulativeX128, bool initialized)',
];

// ============================================
// UNISWAP V3 FACTORY ABI (for getting pool addresses)
// ============================================
export const UNISWAP_V3_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)',
  'function feeAmountTickSpacing(uint24 fee) view returns (int24)',
  'function createPool(address tokenA, address tokenB, uint24 fee) returns (address)',
];

// ============================================
// UNISWAP V3 ROUTER ABI (for swaps)
// ============================================
export const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)',
];

// ============================================
// SUSHISWAP ROUTER ABI
// ============================================
export const SUSHISWAP_ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function getAmountsIn(uint256 amountOut, address[] path) view returns (uint256[] amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint256[] amounts)',
  'function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) external returns (uint256[] amounts)',
];

// ============================================
// SUSHISWAP FACTORY ABI
// ============================================
export const SUSHISWAP_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address)',
  'function allPairs(uint256) view returns (address)',
  'function allPairsLength() view returns (uint256)',
];

// ============================================
// QUICKSWAP ROUTER ABI (Polygon)
// ============================================
export const QUICKSWAP_ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function getAmountsIn(uint256 amountOut, address[] path) view returns (uint256[] amounts)',
];

// ============================================
// PANCAKESWAP ROUTER ABI (BSC)
// ============================================
export const PANCAKESWAP_ROUTER_ABI = [
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
  'function getAmountsIn(uint256 amountOut, address[] path) view returns (uint256[] amounts)',
  'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external returns (uint256[] amounts)',
];

// ============================================
// PANCAKESWAP FACTORY ABI
// ============================================
export const PANCAKESWAP_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address)',
  'function allPairs(uint256) view returns (address)',
  'function allPairsLength() view returns (uint256)',
];

// ============================================
// ERC-20 TOKEN ABI (for decimals and balance)
// ============================================
export const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

// ============================================
// MULTICALL ABI (for batch queries)
// ============================================
export const MULTICALL_ABI = [
  'function aggregate((address target, bytes callData)[] memory calls) view returns (uint256 blockNumber, bytes[] memory returnData)',
  'function aggregate3((address target, bool allowFailure, bytes callData)[] memory calls) view returns (uint256 blockNumber, (bool success, bytes data)[] memory returnData)',
  'function tryAggregate(bool requireSuccess, (address target, bytes callData)[] memory calls) view returns (bool success, bytes memory returnData)',
];

// ============================================
// WETH ABI
// ============================================
export const WETH_ABI = [
  'function deposit() external payable',
  'function withdraw(uint256 amount) external',
  'function balanceOf(address owner) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];

// ============================================
// AAVE LENDING POOL ABI (for collateral rates)
// ============================================
export const AAVE_LENDING_POOL_ABI = [
  'function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getReserveData(address asset) view returns (uint256 configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 variableBorrowRate, uint128 stableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, uint40 stableDebtTokenAddress, uint40 variableDebtTokenAddress, uint8 positioningStrategy)',
];

// Flash Loan Executor ABI
export const FLASH_ARB_EXECUTOR_ABI = [
  'function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn, bytes calldata route) returns (uint256)',
  'function estimateProfit(address tokenIn, address tokenOut, uint256 amountIn) view returns (uint256 profit)',
  'function owner() view returns (address)',
];

// Submarine Transaction Manager ABI
export const SUBMARINE_MANAGER_ABI = [
  'function commit(bytes32 commitment, uint256 revealDeadline) external payable',
  'function commitWithSalt(bytes32 commitmentHash, bytes32 salt, uint256 revealDeadline) external payable',
  'function isCommitmentValid(bytes32 commitment) external view returns (bool)',
  'function commitments(bytes32) external view returns (bytes32)',
];

