# Mainnet gasless readiness

## Architecture (canonical)
- Funding: Aave V3 `flashLoanSimple` inside `FlashArbExecutor`. No user trade capital.
- Gasless execution: authorized Supabase service relayer calls `FlashArbExecutor.executeFlashLoanGasless(asset, amount, params, profitRecipient)`.
- Params: `abi.encode(tokenOut, sourceRouter, targetRouter, sourceKind, targetKind, sourceFee, targetFee, minIntermediate, profitRecipient)`. Kind `1` = Uniswap-V3-style `exactInputSingle`, kind `2` = V2-style `swapExactTokensForTokens`.
- Profit recipient must equal the connected wallet. Contract requires profit > 0 after repaying amount + premium.
- `GaslessRelayer.sol` is a meta-tx/submarine-commit helper, not an ERC-4337 paymaster. ERC-4337/paymaster/Bundler fallback is not used for flash-loan execution.

## Required Supabase secrets
Set only in Supabase project secrets. Never commit and never put service keys in `VITE_*` or Render frontend env vars.

- `DEPLOYER_PRIVATE_KEY` - service relayer wallet key (authorized on every executor). Fund it with native gas on each enabled network.
- `FLASH_ARB_EXECUTOR_ETHEREUM`
- `FLASH_ARB_EXECUTOR_ARBITRUM`
- `FLASH_ARB_EXECUTOR_POLYGON`
- `FLASH_ARB_EXECUTOR_BASE`

Do not set an executor secret for a network that is not deployed/authorized yet; execution fails closed for that network.

## Contract deployment (owner signs, local Hardhat)
Only Ethereum, Arbitrum, Polygon, Base are supported for the Aave executor. BSC/Avalanche are excluded.

1. `cd contracts && npm install && npx hardhat compile`
2. `RUN_FORK_TESTS=1 npx hardhat test --network hardhat`
3. Set `DEPLOYER_PRIVATE_KEY` and RPC URLs in `contracts/.env` locally (never commit).
4. `npx hardhat run scripts/deploy-mainnet.ts --network mainnet` and repeat for `arbitrum`, `polygon`, `base`.
5. Save `contracts/deployments/<network>.json` addresses.
6. Owner calls per network: `FlashArbExecutor.setAllowedSwapTarget(router, true)` for every router used; `FlashArbExecutor.setAuthorizedRelayer(serviceWallet, true)`.
7. Put the executor addresses in Supabase secrets above.
8. First live test: smallest scanner amount; verify profit lands in the connected wallet and loan + premium are repaid.

## Supabase
- Create project `submarine-arbitrage`, apply migrations in timestamp order, then deploy edge functions: `scan-opportunities`, `execute-flash-loan`, `gasless-relay`, `wallet-assistant`, `rebalance-positions`, `check-gas-pool`, `embedded-wallet`, plus tracking functions if used.
- Do not reuse the inactive/legacy Supabase projects in the account for this app.

## Frontend (Render)
- Render Blueprint is `render.yaml` (static site, `dist`, SPA rewrite). Set only public build vars in Render: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Initial Render service creation/linking must be done in the Render UI; after that, deploys can be triggered via API.

## Security blockers before mainnet
- Rotate/revoke any credential that appeared in tracked `.env.mainnet` history, including the API-key URL removed by PR #1. Consider history purge.
- `.env` and `.env.mainnet` are removed from tracking in this fix branch and ignored; verify no secrets remain in git history before public exposure.
- Contracts are unaudited. Start with the smallest viable amount; pause available via `FlashArbExecutor.setPaused(true)`.

## Known limits
- Scanner profit is estimated off-chain. On-chain `minIntermediate`, `amountOwed`, and `profit > 0` checks are the safety gate; a revert costs gas only and the loan is not taken if `executeOperation` reverts.
- `executeFlashLoan` (owner path) requires the connected wallet to be the executor owner; normal users use the gasless relayer path above.
