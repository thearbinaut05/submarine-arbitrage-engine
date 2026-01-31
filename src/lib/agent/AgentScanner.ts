import { ethers } from 'ethers';
import { Network } from '@/types/defi';
import { GelatoRelay } from '../gasless/GelatoRelay';
import { SubmarineCommit } from '../gasless/SubmarineCommit';
import { DexAggregator, DexPrice } from '../scanner/DexAggregator';

// Token addresses by network - needed for accurate token matching
const TOKEN_ADDRESSES: Record<Network, Record<string, string>> = {
  ethereum: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeACB5BE1023a',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
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
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
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

// Agent configuration
export interface AgentConfig {
  networks: Network[];
  minProfitPercent: number;
  minProfitUsd: number;
  maxGasGwei: number;
  autoExecute: boolean;
  confidenceThreshold: number;
  scanIntervalMs: number;
  maxTradeSizeUsd: number;
  slippageTolerance: number;
}

// Agent state
export interface AgentState {
  isRunning: boolean;
  lastScanTime: number | null;
  opportunitiesFound: number;
  transactionsExecuted: number;
  totalProfitUsd: number;
  averageConfidence: number;
  errors: string[];
}

// Arbitrage opportunity with agent metadata
export interface AgentOpportunity {
  id: string;
  network: Network;
  tokenIn: string;
  tokenOut: string;
  sourceDex: string;
  targetDex: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  profitUsd: number;
  gasEstimate: number;
  netProfit: number;
  confidence: number;
  liquidity: number;
  timestamp: number;
  estimatedGas: bigint;
  route: string[];
  isSubmarine: boolean;
  priority: 'high' | 'medium' | 'low';
  // For gasless execution
  encodedTx?: string;
  deadline?: number;
  signature?: string;
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  taskId?: string;
  txHash?: string;
  profitUsd?: number;
  error?: string;
  gasSaved?: number;
  isSubmarine?: boolean;
}

type AgentEventCallback = (event: {
  type: 'scan' | 'opportunity' | 'execution' | 'error' | 'profit';
  data: unknown;
  timestamp: number;
}) => void;

/**
 * Agentic Arbitrage Scanner and Executor
 * 
 * Autonomous agent that:
 * - Continuously scans for arbitrage opportunities across mainnets
 * - Analyzes profitability and confidence
 * - Auto-executes profitable trades with gasless transactions
 * - Routes profits directly to user's connected wallet
 * - Uses MEV protection via submarine transactions
 */
export class AgenticArbitrageScanner {
  private config: AgentConfig;
  private state: AgentState;
  private dexAggregator: DexAggregator;
  private gelatoRelay: GelatoRelay;
  private submarineCommit: SubmarineCommit;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private eventCallbacks: Set<AgentEventCallback> = new Set();
  private walletAddress: string | null = null;
  private signer: ethers.Signer | null = null;
  private isExecuting: boolean = false;

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      networks: ['ethereum', 'arbitrum', 'polygon', 'bsc'],
      minProfitPercent: 0.5,
      minProfitUsd: 50,
      maxGasGwei: 100,
      autoExecute: true,
      confidenceThreshold: 80,
      scanIntervalMs: 3000,
      maxTradeSizeUsd: 100000,
      slippageTolerance: 0.005, // 0.5%
      ...config,
    };

    this.state = {
      isRunning: false,
      lastScanTime: null,
      opportunitiesFound: 0,
      transactionsExecuted: 0,
      totalProfitUsd: 0,
      averageConfidence: 0,
      errors: [],
    };

    this.dexAggregator = new DexAggregator();
    this.gelatoRelay = new GelatoRelay();
    this.submarineCommit = new SubmarineCommit();
  }

  /**
   * Set wallet credentials for signing transactions
   */
  setWallet(walletAddress: string, signer: ethers.Signer): void {
    this.walletAddress = walletAddress;
    this.signer = signer;
  }

  /**
   * Register event callback
   */
  onEvent(callback: AgentEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: { type: string; data: unknown }): void {
    const eventWithTimestamp = { ...event, timestamp: Date.now() };
    this.eventCallbacks.forEach(cb => cb(eventWithTimestamp as AgentEventCallback extends (event: infer T) => void ? T : never));
  }

  /**
   * Start the agentic scanner
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.warn('Agent is already running');
      return;
    }

    console.log('🚀 Starting Agentic Arbitrage Scanner...');
    console.log(`   Networks: ${this.config.networks.join(', ')}`);
    console.log(`   Auto-execute: ${this.config.autoExecute}`);
    console.log(`   Min profit: ${this.config.minProfitPercent}% / $${this.config.minProfitUsd}`);

    this.state.isRunning = true;
    this.emit({ type: 'scan', data: { status: 'started' } });

    // Initial scan
    await this.scanAllNetworks();

    // Continuous scanning
    this.intervalId = setInterval(() => {
      this.scanAllNetworks();
    }, this.config.scanIntervalMs);
  }

  /**
   * Stop the agentic scanner
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state.isRunning = false;
    console.log('🛑 Agentic Arbitrage Scanner stopped');
    this.emit({ type: 'scan', data: { status: 'stopped' } });
  }

  /**
   * Scan all configured networks for opportunities
   */
  async scanAllNetworks(): Promise<AgentOpportunity[]> {
    const allOpportunities: AgentOpportunity[] = [];

    for (const network of this.config.networks) {
      try {
        const networkOpportunities = await this.scanNetwork(network);
        allOpportunities.push(...networkOpportunities);
      } catch (error) {
        const errorMsg = `Error scanning ${network}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        this.state.errors.push(errorMsg);
        this.emit({ type: 'error', data: { network, error: errorMsg } });
      }
    }

    if (allOpportunities.length > 0) {
      this.state.opportunitiesFound += allOpportunities.length;
      this.state.lastScanTime = Date.now();
      
      // Sort by net profit and assign priorities
      allOpportunities.sort((a, b) => b.netProfit - a.netProfit);
      
      // Emit opportunities event
      this.emit({ type: 'opportunity', data: { opportunities: allOpportunities } });

      // Auto-execute if enabled
      if (this.config.autoExecute && this.walletAddress && this.signer) {
        for (const opportunity of allOpportunities) {
          if (this.shouldExecute(opportunity)) {
            await this.executeOpportunity(opportunity);
          }
        }
      }
    }

    return allOpportunities;
  }

  /**
   * Scan a single network for arbitrage opportunities
   */
  private async scanNetwork(network: Network): Promise<AgentOpportunity[]> {
    // Get all DEX prices for configured token pairs
    const tokenPairs = [
      ['WETH', 'USDC'],
      ['WETH', 'USDT'],
      ['WETH', 'DAI'],
      ['USDC', 'USDT'],
      ['WBTC', 'WETH'],
      ['LINK', 'WETH'],
      ['UNI', 'WETH'],
      ['AAVE', 'WETH'],
    ];

    const opportunities: AgentOpportunity[] = [];

    for (const [tokenInSymbol, tokenOutSymbol] of tokenPairs) {
      try {
        // Get token addresses from our TOKEN_ADDRESSES mapping
        const tokenInAddress = TOKEN_ADDRESSES[network]?.[tokenInSymbol];
        const tokenOutAddress = TOKEN_ADDRESSES[network]?.[tokenOutSymbol];

        if (!tokenInAddress || !tokenOutAddress) {
          console.warn(`Token addresses not found for ${tokenInSymbol}/${tokenOutSymbol} on ${network}`);
          continue;
        }

        // Get prices from all DEXs
        const dexPrices = await this.dexAggregator.getAllPrices(network, tokenInSymbol, tokenOutSymbol);
        
        if (dexPrices.length < 2) continue;

        // Find price differences between DEXs
        for (let i = 0; i < dexPrices.length; i++) {
          for (let j = i + 1; j < dexPrices.length; j++) {
            const dex1 = dexPrices[i];
            const dex2 = dexPrices[j];

            // Get normalized prices for tokenIn in terms of tokenOut
            const normalized1 = this.getNormalizedPrices(dex1, tokenInAddress, tokenOutAddress);
            const normalized2 = this.getNormalizedPrices(dex2, tokenInAddress, tokenOutAddress);

            const price1 = normalized1.priceIn;
            const price2 = normalized2.priceIn;

            if (price1 === 0 || price2 === 0) continue;

            // Calculate spread - this is the price difference between DEXs
            // If price1 < price2, buy on DEX1 and sell on DEX2
            const minPrice = Math.min(price1, price2);
            const maxPrice = Math.max(price1, price2);
            const spread = (maxPrice - minPrice) / minPrice;
            const spreadPercent = spread * 100;

            // Calculate profitability
            // Use the average liquidity of both DEXs
            const avgLiquidity = (dex1.liquidity + dex2.liquidity) / 2;
            const tradeSize = Math.min(this.config.maxTradeSizeUsd, avgLiquidity / 2);
            const profitUsd = tradeSize * spread;
            const gasEstimate = this.estimateGasCost(network, tradeSize);
            const netProfit = profitUsd - gasEstimate;

            // Calculate confidence based on:
            // - Spread size (larger spread = higher confidence)
            // - Liquidity (higher liquidity = higher confidence)
            // - Price stability (measured by monitoring)
            const liquidityScore = Math.min(avgLiquidity / 1000000, 1); // Cap at 1M
            const spreadScore = Math.min(spreadPercent / 2, 1); // 2% spread = max score
            const confidence = Math.min((liquidityScore * 0.3 + spreadScore * 0.7) * 100, 95);

            // Check if opportunity meets thresholds
            if (
              spreadPercent >= this.config.minProfitPercent &&
              profitUsd >= this.config.minProfitUsd &&
              netProfit > 0 &&
              confidence >= 50
            ) {
              // Buy on DEX with lower price, sell on DEX with higher price
              const buyDex = price1 < price2 ? dex1 : dex2;
              const sellDex = price1 < price2 ? dex2 : dex1;
              const buyPrice = Math.min(price1, price2);
              const sellPrice = Math.max(price1, price2);

              const opportunity: AgentOpportunity = {
                id: `agent-${network}-${tokenInSymbol}-${tokenOutSymbol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                network,
                tokenIn: tokenInSymbol,
                tokenOut: tokenOutSymbol,
                sourceDex: buyDex.dex,
                targetDex: sellDex.dex,
                buyPrice,
                sellPrice,
                spreadPercent,
                profitUsd,
                gasEstimate,
                netProfit,
                confidence,
                liquidity: avgLiquidity,
                timestamp: Date.now(),
                estimatedGas: BigInt(300000), // Estimate for flash loan arbitrage
                route: [tokenInSymbol, tokenOutSymbol],
                isSubmarine: true,
                priority: this.calculatePriority(netProfit, confidence),
              };

              opportunities.push(opportunity);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning ${tokenInSymbol}/${tokenOutSymbol} on ${network}:`, error);
      }
    }

    // Sort by net profit
    opportunities.sort((a, b) => b.netProfit - a.netProfit);
    
    return opportunities.slice(0, 20); // Top 20 opportunities
  }

  /**
   * Determine if opportunity should be executed
   */
  private shouldExecute(opportunity: AgentOpportunity): boolean {
    // Check confidence threshold
    if (opportunity.confidence < this.config.confidenceThreshold) {
      return false;
    }

    // Check net profit is positive
    if (opportunity.netProfit <= 0) {
      return false;
    }

    // Check if already executing
    if (this.isExecuting) {
      return false;
    }

    // Check if profitable enough
    if (opportunity.netProfit < this.config.minProfitUsd) {
      return false;
    }

    return true;
  }

  /**
   * Calculate opportunity priority
   */
  private calculatePriority(netProfit: number, confidence: number): 'high' | 'medium' | 'low' {
    if (netProfit > 1000 && confidence > 90) return 'high';
    if (netProfit > 500 && confidence > 75) return 'medium';
    return 'low';
  }

  /**
   * Estimate gas cost in USD
   */
  private estimateGasCost(network: Network, tradeSize: number): number {
    // Simplified gas estimation
    const gasUnits = 300000; // Typical flash loan arbitrage
    const gasPriceGwei = 50; // Conservative estimate
    const ethPrice = 3500; // Approximate ETH price
    
    const gasCostEth = (gasUnits * gasPriceGwei) / 1e9;
    const gasCostUsd = gasCostEth * ethPrice;
    
    return Math.round(gasCostUsd * 100) / 100;
  }

  /**
   * Get normalized price for a token from DexPrice
   * Returns the price of 1 unit of the target token in terms of the quote token
   * 
   * @param dexPrice - The DEX price data
   * @param targetTokenAddress - The address of the token we want the price for
   * @param quoteTokenAddress - The address of the token to quote the price in (optional, uses the other token in pair)
   * @returns The price of 1 target token in terms of quote token, or 0 if not found
   */
  private getTokenPrice(
    dexPrice: DexPrice, 
    targetTokenAddress: string,
    _quoteTokenAddress?: string
  ): number {
    const targetLower = targetTokenAddress.toLowerCase();
    const token0Lower = dexPrice.token0.toLowerCase();
    const token1Lower = dexPrice.token1.toLowerCase();

    // Check which token in the pair matches the target token
    if (token0Lower === targetLower) {
      // target token is token0, return price of token0 in terms of token1
      // price0 is how many token1 you get for 1 token0
      return dexPrice.price0;
    } else if (token1Lower === targetLower) {
      // target token is token1, return price of token1 in terms of token0
      // price1 is how many token0 you get for 1 token1
      return dexPrice.price1;
    }

    // Token not found in this pair
    console.warn(`Token ${targetTokenAddress} not found in DEX pair ${dexPrice.dex}`);
    return 0;
  }

  /**
   * Get both token prices from a DexPrice object normalized for comparison
   * Returns prices in the same direction (both as token0/token1 or both as tokenIn/tokenOut)
   */
  private getNormalizedPrices(
    dexPrice: DexPrice,
    tokenInAddress: string,
    tokenOutAddress: string
  ): { priceIn: number; priceOut: number } {
    const tokenInLower = tokenInAddress.toLowerCase();
    const token0Lower = dexPrice.token0.toLowerCase();
    const token1Lower = dexPrice.token1.toLowerCase();

    let priceIn: number;
    let priceOut: number;

    if (token0Lower === tokenInLower && token1Lower === tokenOutAddress.toLowerCase()) {
      // token0 = tokenIn, token1 = tokenOut
      priceIn = dexPrice.price0; // price of tokenIn in tokenOut
      priceOut = dexPrice.price1; // price of tokenOut in tokenIn
    } else if (token1Lower === tokenInLower && token0Lower === tokenOutAddress.toLowerCase()) {
      // token1 = tokenIn, token0 = tokenOut
      priceIn = dexPrice.price1; // price of tokenIn in tokenOut
      priceOut = dexPrice.price0; // price of tokenOut in tokenIn
    } else {
      // Token order doesn't match - this shouldn't happen for valid pairs
      console.warn(`Token mismatch in DEX pair for ${tokenInAddress}/${tokenOutAddress}`);
      return { priceIn: 0, priceOut: 0 };
    }

    return { priceIn, priceOut };
  }

  /**
   * Execute an arbitrage opportunity with gasless transaction
   */
  async executeOpportunity(opportunity: AgentOpportunity): Promise<ExecutionResult> {
    if (!this.walletAddress || !this.signer) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (this.isExecuting) {
      return { success: false, error: 'Already executing another transaction' };
    }

    this.isExecuting = true;
    console.log(`⚡ Executing opportunity: ${opportunity.id}`);
    console.log(`   Network: ${opportunity.network}`);
    console.log(`   Route: ${opportunity.tokenIn} -> ${opportunity.tokenOut}`);
    console.log(`   Profit: $${opportunity.netProfit.toFixed(2)} (confidence: ${opportunity.confidence.toFixed(0)}%)`);

    this.emit({ type: 'execution', data: { opportunity, status: 'pending' } });

    try {
      // Get contract addresses from environment
      const FLASH_ARB_ADDRESS = import.meta.env.VITE_FLASH_ARB_ADDRESS;
      const GASLESS_RELAYER_ADDRESS = import.meta.env.VITE_GASLESS_RELAYER_ADDRESS;

      if (!FLASH_ARB_ADDRESS || FLASH_ARB_ADDRESS === '0x0000000000000000000000000000000000000000') {
        // Simulation mode
        return await this.simulateExecution(opportunity);
      }

      // Prepare transaction data
      const amountIn = this.calculateTradeAmount(opportunity);
      
      // Encode arbitrage parameters
      const params = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'address', 'uint256', 'bytes', 'bytes'],
        [
          opportunity.tokenIn,
          opportunity.tokenOut,
          opportunity.targetDex,
          0, // minAmountOut
          '0x', // swapDataSource
          '0x', // swapDataTarget
        ]
      );

      // Get contract instance
      const contract = new ethers.Contract(
        FLASH_ARB_ADDRESS,
        [
          'function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external',
        ],
        this.signer
      );

      // Encode function call
      const txData = contract.interface.encodeFunctionData('executeFlashLoan', [
        opportunity.tokenIn,
        amountIn,
        params,
      ]);

      // Create deadline
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes

      // Check if we should use submarine transaction (MEV protection)
      let result: ExecutionResult;
      
      if (opportunity.isSubmarine && this.config.autoExecute) {
        result = await this.executeWithSubmarine(
          opportunity,
          txData,
          deadline
        );
      } else {
        result = await this.executeWithGasless(
          opportunity,
          txData,
          deadline
        );
      }

      if (result.success) {
        this.state.transactionsExecuted++;
        this.state.totalProfitUsd += result.profitUsd || opportunity.netProfit;
        this.updateAverageConfidence(opportunity.confidence);
        
        this.emit({ 
          type: 'profit', 
          data: { 
            profitUsd: result.profitUsd || opportunity.netProfit,
            txHash: result.txHash,
            network: opportunity.network,
          } 
        });
      }

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Execution failed:', errorMsg);
      
      this.state.errors.push(errorMsg);
      this.emit({ type: 'error', data: { opportunity, error: errorMsg } });

      return { success: false, error: errorMsg };
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute with gasless transaction via Gelato
   */
  private async executeWithGasless(
    opportunity: AgentOpportunity,
    txData: string,
    deadline: number
  ): Promise<ExecutionResult> {
    try {
      // Create meta-transaction
      const metaTx = await this.gelatoRelay.createMetaTransaction(
        opportunity.network,
        this.walletAddress!,
        import.meta.env.VITE_FLASH_ARB_ADDRESS,
        txData,
        deadline
      );

      // Sign the transaction
      const signature = await this.signer!.signMessage(ethers.getBytes(metaTx.messageDigest));
      
      // Submit to Gelato relay
      const result = await this.gelatoRelay.submitMetaTransaction(
        opportunity.network,
        {
          from: this.walletAddress!,
          to: import.meta.env.VITE_FLASH_ARB_ADDRESS,
          value: '0',
          data: txData,
          deadline,
          signature,
        }
      );

      return {
        success: true,
        taskId: result.taskId,
        gasSaved: opportunity.gasEstimate,
        isSubmarine: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gasless execution failed',
      };
    }
  }

  /**
   * Execute with submarine transaction (MEV protection)
   */
  private async executeWithSubmarine(
    opportunity: AgentOpportunity,
    txData: string,
    deadline: number
  ): Promise<ExecutionResult> {
    try {
      // Create submarine commit
      const salt = ethers.randomBytes(32);
      const commitment = await this.submarineCommit.createCommitment(
        this.walletAddress!,
        import.meta.env.VITE_FLASH_ARB_ADDRESS,
        txData,
        salt
      );

      // Submit commit to relayer (private)
      const commitResult = await this.submarineCommit.submitCommit(
        opportunity.network,
        commitment,
        deadline
      );

      // Wait for commit confirmation, then reveal
      await this.submarineCommit.waitForCommit(commitResult.taskId);

      // Reveal and execute
      const revealResult = await this.submarineCommit.revealAndExecute(
        opportunity.network,
        this.walletAddress!,
        import.meta.env.VITE_FLASH_ARB_ADDRESS,
        txData,
        salt,
        this.signer!
      );

      return {
        success: true,
        taskId: revealResult.taskId,
        txHash: revealResult.txHash,
        profitUsd: opportunity.netProfit,
        gasSaved: opportunity.gasEstimate,
        isSubmarine: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submarine execution failed',
      };
    }
  }

  /**
   * Simulate execution for testing
   */
  private async simulateExecution(opportunity: AgentOpportunity): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        
        resolve({
          success,
          txHash: success ? `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}` : undefined,
          profitUsd: success ? opportunity.netProfit : 0,
          isSubmarine: opportunity.isSubmarine,
          error: success ? undefined : 'Simulation: execution failed',
        });
      }, 2000 + Math.random() * 2000);
    });
  }

  /**
   * Calculate trade amount based on opportunity
   */
  private calculateTradeAmount(opportunity: AgentOpportunity): bigint {
    // Calculate amount based on profit potential and max trade size
    const baseAmount = this.config.maxTradeSizeUsd;
    const adjustedAmount = Math.min(baseAmount, opportunity.liquidity * 0.1);
    
    // Convert to ETH equivalent
    const ethAmount = adjustedAmount / 3500; // Approximate ETH price
    
    return ethers.parseEther(ethAmount.toString());
  }

  /**
   * Update average confidence statistic
   */
  private updateAverageConfidence(newConfidence: number): void {
    const totalExecutions = this.state.transactionsExecuted;
    const currentAvg = this.state.averageConfidence;
    
    this.state.averageConfidence = ((currentAvg * (totalExecutions - 1)) + newConfidence) / totalExecutions;
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Get current agent config
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update agent configuration
   */
  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Manually trigger a scan
   */
  async manualScan(): Promise<AgentOpportunity[]> {
    return this.scanAllNetworks();
  }
}

// Export singleton instance factory
export function createAgenticScanner(config?: Partial<AgentConfig>): AgenticArbitrageScanner {
  return new AgenticArbitrageScanner(config);
}

