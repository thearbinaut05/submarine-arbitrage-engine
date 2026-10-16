# Gasless mainnet integration (execute-flash-loan)

## Do not use the legacy paths for mainnet gasless
- Balancer Vault is NOT FlashArbExecutor. `contract-addresses.ts` maps `flashArbExecutor` to Balancer/routers as legacy placeholders - never send `executeFlashLoanGasless` there.
- ERC-4337 paymaster/bundler flow in `gasless-relay` is NOT the deployed executor path. `GaslessRelayer.sol` is a meta-tx helper, not a paymaster (no EntryPoint deposit/stake).
- Direct deployer-signed router swaps pay gas from the signer and do not take an Aave flash loan through FlashArbExecutor.

## Canonical path
1. Scanner finds opportunity (tokenIn=asset, tokenOut, source/target routers, kinds/fees, minIntermediate).
2. Backend builds canonical params via `_shared/flash-arb-executor.ts`: `encodeCanonicalArbParams(...)` with `profitRecipient = connected wallet`.
3. Backend builds `FlashArbExecutor.executeFlashLoanGasless(asset, amount, params, profitRecipient)` calldata using the compiled ABI (ethers `Interface.encodeFunctionData`). Verify selector with `cast sig` in CI - never hand-type it.
4. The authorised SERVICE relayer wallet (Supabase secret `DEPLOYER_PRIVATE_KEY`, funded only with gas) sends the tx to `FLASH_ARB_EXECUTOR_<NETWORK>`. It must have been authorised by the contract owner: `FlashArbExecutor.setAuthorizedRelayer(serviceWallet, true)`, and each router must be allowlisted: `setAllowedSwapTarget(router, true)`.
5. On-chain safety gate: `executeOperation` requires allowlisted routers, `balanceAfter >= amountOwed`, `profit > 0`; otherwise it reverts and no loan is taken (gas only).
6. `prepareOnly` (wallet-signed) path: user wallet must be the executor owner for `executeFlashLoan`, otherwise use the gasless relayer path. Frontend must not approve user tokens to a router for a flash-loan trade - funding is the flash loan.

## Required Supabase secrets (set in dashboard, never in git/chat)
- `DEPLOYER_PRIVATE_KEY` - service relayer wallet private key (gas only)
- `FLASH_ARB_EXECUTOR_ETHEREUM`, `FLASH_ARB_EXECUTOR_ARBITRUM`, `FLASH_ARB_EXECUTOR_POLYGON`, `FLASH_ARB_EXECUTOR_BASE` (optimism if deployed)
- RPC URLs per network if private RPCs are used

## Networks
Ethereum, Arbitrum, Polygon, Base (+ Optimism if Aave provider configured). BSC/Avalanche are excluded for the Aave executor.
