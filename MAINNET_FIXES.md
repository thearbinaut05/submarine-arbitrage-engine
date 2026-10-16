# Mainnet fixes (fix/mainnet-flashloan-wiring)

## Bugs fixed
1. FlashArbExecutor.executeFlashLoanGasless double-encoded params (nested bytes+address) while executeOperation expected (address,address,address,uint256,bytes,bytes,address) - every gasless call would revert. Now a single canonical encoding is used.
2. _executeArbitrage compared post-trade balance to a balance captured after the flash loan landed, requiring balance > loan+start while still owing amount+premium. Now balanceAfter >= amount+premium is required and profit = balanceAfter - amountOwed.
3. Arbitrary swap targets/calldata: both DEX legs must now be allowlisted via setAllowedSwapTarget (owner only). Routers set in initialize/updateRouters are allowlisted.
4. GaslessRelayer had a duplicated trailing block after receive() and a stray IEntryPoint type reference - cleaned; setAuthorizedRelayer alias added for deploy scripts.
5. PositionRebalancer imported @aave/v3-core (not a dependency) - switched to @aave/core-v3.
6. GasPoolSponsor had `address public immutable GASLESS_RELAYER` assigned in initialize() - immutables cannot be assigned there; made it regular state.
7. hardhat.config.ts had a duplicate `paths` key and viaIR enabled - deduplicated, viaIR removed.
8. deploy-mainnet.ts: GaslessRelayer.initialize(gasSponsor, gasPoolSponsor) now receives 2 args (GasPoolSponsor deployed first), FlashArbExecutor proxy initialize/constructor args corrected, relayer authorised on the executor. deploy-all.ts had wrong constructor args for all three contracts - it now delegates to deploy-mainnet logic in docs (do not use the old script).
9. Config corrections: Arbitrum native USDC 0xaf88d065e77c8cC2239327C5EDb3A432268e5831, Base Aave provider/pool corrected in mainnet-config, BSC marked unsupported for the Aave executor (no Aave V3 PoolAddressesProvider).

## Architecture decision
Trade funding = Aave V3 flash loan (POOL.flashLoanSimple). No user trade capital.
Execution paths:
- Wallet-signed (primary): frontend -> execute-flash-loan (prepareOnly) -> backend builds FlashArbExecutor.executeFlashLoan calldata with two router swaps -> user wallet calls executeFlashLoan (user must be owner, or use the relayer path below). NOTE: executeFlashLoan is onlyOwner, so the wallet-signed path requires the connected wallet to be the executor owner. For non-owner users use the gasless relayer path.
- Gasless relayer: Supabase service wallet (DEPLOYER_PRIVATE_KEY, set by owner in Supabase secrets only) -> authorised relayer on FlashArbExecutor -> executeFlashLoanGasless(asset, amount, params, profitRecipient=connected wallet). Gas can be sponsored via BUNDLER_URL/PIMLICO + paymaster where configured; otherwise the service wallet pays gas. Never use a user private key server-side.

## Deployment (owner signs, Hardhat)
Ethereum / Arbitrum / Polygon / Base only (Aave V3 live). BSC/Avalanche excluded (no Aave provider in config).
1. cd contracts && npm install && npx hardhat compile
2. RUN_FORK_TESTS=1 npx hardhat test --network hardhat  (mainnet fork, Ethereum)
3. Set DEPLOYER_PRIVATE_KEY + MAINNET_RPC_URL / ARBITRUM_RPC_URL / POLYGON_RPC_URL / BASE_RPC_URL in contracts/.env (never commit)
4. npx hardhat run scripts/deploy-mainnet.ts --network mainnet   (repeat: arbitrum, polygon, base)
5. Save contracts/deployments/<network>.json addresses, then owner calls:
   - FlashArbExecutor.setAllowedSwapTarget(router, true) for each router used
   - FlashArbExecutor.setAuthorizedRelayer(serviceWallet, true)
6. Put service wallet key + BUNDLER_URL (optional) in Supabase secrets only. Set FLASH_ARB_EXECUTOR_<NETWORK> secrets.
7. First live test: smallest scanner amount, verify profit lands in connected wallet and loan+premium repaid.

## Known limits
- GaslessRelayer.sol is a meta-tx/submarine-commit helper, NOT an ERC-4337 paymaster (no EntryPoint deposit/stake). Gasless in production = service-wallet relayer + optional external paymaster/bundler configured in Supabase, not this contract paying EntryPoint.
- Scanner profit is estimated off-chain; on-chain minAmountOut + amountOwed checks are the safety gate. A revert costs gas only, loan is not taken if executeOperation reverts.
