import { ethers } from 'ethers';
import type { Network } from '@/types/defi';
import {
  AAVE_READ_ABI,
  ERC20_READ_ABI,
  V2_FACTORY_READ_ABI,
  V2_PAIR_READ_ABI,
  V2_ROUTER_READ_ABI,
  WORKSTATION_CHAINS,
  type DexAdapter,
  type WorkstationChain,
  type WorkstationToken,
} from './protocols';
import {
  baseToDisplay,
  calculateNetProfit,
  decimalConversion,
  evaluateRepaymentInvariant,
  priceImpactBps,
  quoteStaleness,
  usdBaseToPrincipalToken,
  type PaperEvidence,
  type PaperOpportunity,
  type RiskConfig,
  type RouteQuoteEvidence,
} from './engine';

const PLANNING_GAS_UNITS = 650_000;
const ZERO_ADDRESS = ethers.ZeroAddress;

interface RuntimeToken extends WorkstationToken {
  decimals: number;
}

interface PairSnapshot {
  pair: string;
  reserveIn: bigint;
}

interface ProviderQuote {
  feeBps: bigint;
  availableLiquidity: bigint;
  address: string;
  name: string;
}

export interface NetworkScanResult {
  network: Network;
  opportunities: PaperOpportunity[];
  errors: string[];
  blockNumber: number | null;
  scannedAt: number;
}

async function withRpc<T>(chain: WorkstationChain, task: (provider: ethers.JsonRpcProvider) => Promise<T>): Promise<T> {
  let lastError: unknown = null;
  for (const rpcUrl of chain.rpcUrls) {
    const provider = new ethers.JsonRpcProvider(rpcUrl, chain.chainId, { staticNetwork: true });
    try {
      const rpcChainId = BigInt(await provider.send('eth_chainId', []));
      if (rpcChainId !== BigInt(chain.chainId)) throw new Error(`RPC returned chain ${rpcChainId}; expected ${chain.chainId}`);
      return await task(provider);
    } catch (error) {
      lastError = error;
    } finally {
      provider.destroy();
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No public RPC responded');
}

async function readToken(provider: ethers.JsonRpcProvider, token: WorkstationToken, blockTag: number): Promise<RuntimeToken> {
  if (!ethers.isAddress(token.address)) throw new Error(`Invalid configured address for ${token.symbol}`);
  const contract = new ethers.Contract(token.address, ERC20_READ_ABI, provider);
  const code = await provider.getCode(token.address, blockTag);
  if (code === '0x') throw new Error(`${token.symbol} has no contract code at the configured address`);
  const decimals = Number(await contract.decimals({ blockTag }));
  if (decimals !== token.expectedDecimals) {
    throw new Error(`${token.symbol} decimals mismatch: chain returned ${decimals}, configuration expected ${token.expectedDecimals}`);
  }
  return { ...token, decimals };
}

async function pairSnapshot(
  provider: ethers.JsonRpcProvider,
  dex: DexAdapter,
  input: RuntimeToken,
  output: RuntimeToken,
  blockTag: number,
): Promise<PairSnapshot> {
  const factory = new ethers.Contract(dex.factory, V2_FACTORY_READ_ABI, provider);
  const pair = await factory.getPair(input.address, output.address, { blockTag });
  if (!ethers.isAddress(pair) || pair === ZERO_ADDRESS) throw new Error(`${dex.name} has no ${input.symbol}/${output.symbol} pair`);
  const pairCode = await provider.getCode(pair, blockTag);
  if (pairCode === '0x') throw new Error(`${dex.name} pair address has no contract code`);
  const pairContract = new ethers.Contract(pair, V2_PAIR_READ_ABI, provider);
  const [reserves, token0] = await Promise.all([
    pairContract.getReserves({ blockTag }),
    pairContract.token0({ blockTag }),
  ]);
  const reserveIn = token0.toLowerCase() === input.address.toLowerCase() ? BigInt(reserves[0]) : BigInt(reserves[1]);
  if (reserveIn <= 0n) throw new Error(`${dex.name} pair has no input liquidity`);
  return { pair, reserveIn };
}

function makeQuoteId(parts: Array<string | number | bigint>): string {
  return ethers.keccak256(ethers.toUtf8Bytes(parts.join(':')));
}

async function quoteV2(
  provider: ethers.JsonRpcProvider,
  chain: WorkstationChain,
  dex: DexAdapter,
  input: RuntimeToken,
  output: RuntimeToken,
  amountIn: bigint,
  blockNumber: number,
  blockTimestamp: number,
  pair?: PairSnapshot,
): Promise<RouteQuoteEvidence> {
  const routerCode = await provider.getCode(dex.router, blockNumber);
  if (routerCode === '0x') throw new Error(`${dex.name} router has no contract code on ${chain.id}`);
  const router = new ethers.Contract(dex.router, V2_ROUTER_READ_ABI, provider);
  const unitIn = 10n ** BigInt(input.decimals);
  const [actual, unit] = await Promise.all([
    router.getAmountsOut(amountIn, [input.address, output.address], { blockTag: blockNumber }),
    router.getAmountsOut(unitIn, [input.address, output.address], { blockTag: blockNumber }),
  ]);
  const expectedOut = BigInt(actual[1]);
  const unitOut = BigInt(unit[1]);
  if (expectedOut <= 0n || unitOut <= 0n) throw new Error(`${dex.name} returned a zero quote`);
  const quotedAt = Date.now();
  return {
    quoteId: makeQuoteId([chain.id, dex.id, pair?.pair ?? '', input.address, output.address, amountIn, blockNumber]),
    source: `${dex.name} getAmountsOut`,
    router: dex.router,
    pool: pair?.pair ?? null,
    blockNumber,
    blockTimestamp,
    quotedAt,
    expiresAt: quotedAt + 30_000,
    amountIn: amountIn.toString(),
    expectedOut: expectedOut.toString(),
    unitOut: unitOut.toString(),
    priceImpactBps: priceImpactBps(unitOut, amountIn, unitIn, expectedOut),
    liquidityRaw: pair?.reserveIn.toString() ?? '0',
    liquiditySymbol: input.symbol,
    dexFeeBps: dex.feeBps,
  };
}

async function usdRate(
  provider: ethers.JsonRpcProvider,
  chain: WorkstationChain,
  token: RuntimeToken,
  usdToken: RuntimeToken,
  blockTag: number,
): Promise<bigint> {
  const unit = 10n ** BigInt(token.decimals);
  if (token.address.toLowerCase() === usdToken.address.toLowerCase()) return 10n ** BigInt(usdToken.decimals);
  const router = new ethers.Contract(chain.dexes[0].router, V2_ROUTER_READ_ABI, provider);
  const amounts = await router.getAmountsOut(unit, [token.address, usdToken.address], { blockTag });
  const rate = BigInt(amounts[1]);
  if (rate <= 0n) throw new Error(`No fresh ${token.symbol}/USDC valuation quote`);
  return rate;
}

async function providerQuote(
  provider: ethers.JsonRpcProvider,
  chain: WorkstationChain,
  asset: RuntimeToken,
  blockTag: number,
): Promise<ProviderQuote | null> {
  if (!chain.flashLoan) return null;
  const code = await provider.getCode(chain.flashLoan.pool, blockTag);
  if (code === '0x') throw new Error(`${chain.flashLoan.name} pool has no contract code on ${chain.id}`);
  const pool = new ethers.Contract(chain.flashLoan.pool, AAVE_READ_ABI, provider);
  const [feeBps, reserve] = await Promise.all([
    pool.FLASHLOAN_PREMIUM_TOTAL({ blockTag }),
    pool.getReserveData(asset.address, { blockTag }),
  ]);
  const aTokenAddress = reserve.aTokenAddress ?? reserve[8];
  if (!ethers.isAddress(aTokenAddress) || aTokenAddress === ZERO_ADDRESS) {
    throw new Error(`${asset.symbol} is not an active ${chain.flashLoan.name} reserve`);
  }
  const aToken = new ethers.Contract(aTokenAddress, ERC20_READ_ABI, provider);
  const availableLiquidity = BigInt(await assetContract(asset, provider).balanceOf(aTokenAddress, { blockTag }));
  return {
    feeBps: BigInt(feeBps),
    availableLiquidity,
    address: chain.flashLoan.pool,
    name: chain.flashLoan.name,
  };
}

function assetContract(asset: RuntimeToken, provider: ethers.JsonRpcProvider): ethers.Contract {
  return new ethers.Contract(asset.address, ERC20_READ_ABI, provider);
}

function netToUsdBase(net: bigint, tokenUnit: bigint, usdPerTokenUnit: bigint): bigint {
  return (net * usdPerTokenUnit) / tokenUnit;
}

function displayUsd(value: bigint, usdDecimals: number): number {
  return baseToDisplay(value, usdDecimals);
}

async function evaluateRoute(
  provider: ethers.JsonRpcProvider,
  chain: WorkstationChain,
  sourceDex: DexAdapter,
  targetDex: DexAdapter,
  input: RuntimeToken,
  output: RuntimeToken,
  nativeToken: RuntimeToken,
  usdToken: RuntimeToken,
  providerInfo: ProviderQuote | null,
  gasPriceWei: bigint,
  blockNumber: number,
  blockTimestamp: number,
  risk: RiskConfig,
): Promise<PaperOpportunity> {
  const tokenUnit = 10n ** BigInt(input.decimals);
  const usdUnit = 10n ** BigInt(usdToken.decimals);
  const nativeUnit = 10n ** BigInt(nativeToken.decimals);
  const [tokenUsdRate, nativeUsdRate] = await Promise.all([
    usdRate(provider, chain, input, usdToken, blockNumber),
    usdRate(provider, chain, nativeToken, usdToken, blockNumber),
  ]);
  const sourcePair = await pairSnapshot(provider, sourceDex, input, output, blockNumber);
  const targetLoan = usdBaseToPrincipalToken(decimalConversion(String(risk.maxLoanUsd), usdToken.decimals), tokenUnit, tokenUsdRate);
  const liquidityCap = sourcePair.reserveIn / 100n;
  const amountIn = targetLoan > liquidityCap ? liquidityCap : targetLoan;
  if (amountIn <= 0n) throw new Error('Loan size rounds to zero at the token’s exact decimals');

  const first = await quoteV2(provider, chain, sourceDex, input, output, amountIn, blockNumber, blockTimestamp, sourcePair);
  const intermediate = BigInt(first.expectedOut);
  const targetPair = await pairSnapshot(provider, targetDex, output, input, blockNumber);
  const second = await quoteV2(provider, chain, targetDex, output, input, intermediate, blockNumber, blockTimestamp, targetPair);

  const gasNative = gasPriceWei * BigInt(PLANNING_GAS_UNITS);
  const gasUsdBase = (gasNative * nativeUsdRate) / nativeUnit;
  const gasInInput = usdBaseToPrincipalToken(gasUsdBase, tokenUnit, tokenUsdRate);
  const mevUsdBase = decimalConversion(String(risk.mevCostUsd), usdToken.decimals);
  const mevInInput = usdBaseToPrincipalToken(mevUsdBase, tokenUnit, tokenUsdRate);
  const providerFeeBps = providerInfo?.feeBps ?? 0n;
  const result = calculateNetProfit({
    principal: amountIn,
    quotedOutput: BigInt(second.expectedOut),
    providerFeeBps,
    maxSlippageBps: risk.maxSlippageBps,
    gasInPrincipalToken: gasInInput,
    mevInPrincipalToken: mevInInput,
  });
  const minNetUsdBase = decimalConversion(String(risk.minNetProfitUsd), usdToken.decimals);
  const minNetInInput = usdBaseToPrincipalToken(minNetUsdBase, tokenUnit, tokenUsdRate);
  const rejectionReasons: string[] = [];

  const stale = quoteStaleness(Math.min(first.quotedAt, second.quotedAt), Date.now(), risk.maxQuoteAgeMs);
  if (stale) rejectionReasons.push(stale);
  if (!risk.networks.includes(chain.id)) rejectionReasons.push(`${chain.id} is not in the chain allowlist.`);
  if (!risk.allowedTokens.includes(input.symbol) || !risk.allowedTokens.includes(output.symbol)) {
    rejectionReasons.push('One or both tokens are outside the token allowlist.');
  }
  if (!providerInfo) rejectionReasons.push('No verified flash-loan provider is configured for this chain.');
  if (providerInfo && amountIn > providerInfo.availableLiquidity) rejectionReasons.push('Flash-loan provider liquidity is below the requested principal.');
  const gasGwei = Number(ethers.formatUnits(gasPriceWei, 'gwei'));
  if (gasGwei > risk.maxGasGwei) rejectionReasons.push(`Gas is ${gasGwei.toFixed(2)} gwei, above the ${risk.maxGasGwei} gwei limit.`);
  const totalPriceImpact = first.priceImpactBps + second.priceImpactBps;
  if (totalPriceImpact > risk.maxSlippageBps) rejectionReasons.push('Route price impact exceeds the configured slippage limit.');
  const repaymentFailure = evaluateRepaymentInvariant(0n, result, minNetInInput);
  if (repaymentFailure) rejectionReasons.push(repaymentFailure);

  const netUsdBase = netToUsdBase(result.netAfterCosts, tokenUnit, tokenUsdRate);
  const grossBeforeCosts = BigInt(second.expectedOut) - result.repayment;
  const grossUsdBase = netToUsdBase(grossBeforeCosts, tokenUnit, tokenUsdRate);
  const dexFeesBase = (amountIn * BigInt(sourceDex.feeBps) / 10_000n) + (intermediate * BigInt(targetDex.feeBps) / 10_000n);
  const id = makeQuoteId([first.quoteId, second.quoteId, providerInfo?.address ?? 'none', risk.maxSlippageBps]);
  const expiresAt = Math.min(first.expiresAt, second.expiresAt);
  const evidence: PaperEvidence = {
    mode: 'paper', chainId: chain.chainId, blockNumber, blockTimestamp, expiresAt,
    tokenInAddress: input.address, tokenOutAddress: output.address,
    tokenInDecimals: input.decimals, tokenOutDecimals: output.decimals,
    amountInBase: amountIn.toString(), expectedIntermediateBase: intermediate.toString(),
    expectedOutputBase: second.expectedOut, minimumOutputBase: result.minimumOutput.toString(),
    repaymentBase: result.repayment.toString(), providerFeeBase: result.providerFee.toString(),
    providerFeeBps: Number(providerFeeBps), provider: providerInfo?.name ?? 'Unavailable', providerAddress: providerInfo?.address ?? null,
    dexFeesBase: dexFeesBase.toString(), gasUnits: PLANNING_GAS_UNITS, gasPriceWei: gasPriceWei.toString(),
    gasNative: ethers.formatUnits(gasNative, nativeToken.decimals), gasUsd: displayUsd(gasUsdBase, usdToken.decimals),
    slippageBps: risk.maxSlippageBps, priceImpactBps: totalPriceImpact, mevCostUsd: risk.mevCostUsd,
    liquidityRaw: sourcePair.reserveIn.toString(), tokenInUsdQuote: tokenUsdRate.toString(), nativeUsdQuote: nativeUsdRate.toString(),
    quotes: [first, second], simulation: 'route_quote_only', rejectionReasons,
  };
  return {
    id, type: 'flash_loan', sourceNetwork: chain.id, sourceDex: sourceDex.name, targetDex: targetDex.name,
    tokenIn: input.symbol, tokenOut: output.symbol,
    profitPercent: baseToDisplay(((BigInt(second.expectedOut) - result.repayment) * 10_000n) / amountIn, 2),
    profitUsd: displayUsd(grossUsdBase, usdToken.decimals),
    gasEstimate: `${evidence.gasNative} ${chain.nativeSymbol}`,
    netProfit: displayUsd(netUsdBase, usdToken.decimals), confidence: 0, timestamp: Date.now(),
    route: [input.symbol, output.symbol, input.symbol], status: 'pending', isSubmarine: false, evidence,
  };
}

export async function scanNetworkOnChain(network: Network, risk: RiskConfig): Promise<NetworkScanResult> {
  const chain = WORKSTATION_CHAINS[network];
  const result: NetworkScanResult = { network, opportunities: [], errors: [], blockNumber: null, scannedAt: Date.now() };
  if (!chain) {
    result.errors.push('Unsupported chain configuration.');
    return result;
  }
  if (chain.dexes.length < 2) {
    result.errors.push('Two verified compatible DEX routes are required; this chain currently has only one.');
    return result;
  }
  try {
    return await withRpc(chain, async (provider) => {
      const latest = await provider.getBlock('latest');
      if (!latest) throw new Error('Latest block unavailable');
      const blockNumber = latest.number;
      const pinnedBlock = await provider.getBlock(blockNumber);
      if (!pinnedBlock) throw new Error('Pinned block unavailable');
      const feeData = await provider.getFeeData();
      const gasPriceWei = feeData.gasPrice ?? feeData.maxFeePerGas;
      if (!gasPriceWei || gasPriceWei <= 0n) throw new Error('Fresh gas price unavailable');
      const usdToken = await readToken(provider, chain.usdToken, blockNumber);
      const nativeToken = await readToken(provider, chain.nativeToken, blockNumber);
      const tokenSymbols = [...new Set(chain.pairs.slice(0, 2).flat())];
      const tokenEntries = await Promise.all(tokenSymbols.map(async (symbol) => {
        const configured = chain.tokens[symbol];
        if (!configured) throw new Error(`Missing token configuration for ${symbol}`);
        return [symbol, await readToken(provider, configured, blockNumber)] as const;
      }));
      const tokens = Object.fromEntries(tokenEntries) as Record<string, RuntimeToken>;
      const providerInfo = await providerQuote(provider, chain, nativeToken, blockNumber);
      const direction = blockNumber % 2;
      const jobs: Promise<PaperOpportunity>[] = [];
      for (const pair of chain.pairs.slice(0, 2)) {
        const inputSymbol = pair[direction];
        const outputSymbol = pair[1 - direction];
        for (let sourceIndex = 0; sourceIndex < chain.dexes.length; sourceIndex++) {
          const targetIndex = (sourceIndex + 1) % chain.dexes.length;
          jobs.push(evaluateRoute(
            provider, chain, chain.dexes[sourceIndex], chain.dexes[targetIndex], tokens[inputSymbol], tokens[outputSymbol],
            nativeToken, usdToken, providerInfo, gasPriceWei, blockNumber, pinnedBlock.timestamp, risk,
          ));
        }
      }
      const settled = await Promise.allSettled(jobs);
      for (const item of settled) {
        if (item.status === 'fulfilled') result.opportunities.push(item.value);
        else result.errors.push(item.reason instanceof Error ? item.reason.message : 'Route quote failed');
      }
      result.blockNumber = blockNumber;
      result.scannedAt = Date.now();
      result.opportunities.sort((a, b) => b.netProfit - a.netProfit);
      return result;
    });
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Network scan failed');
    return result;
  }
}
