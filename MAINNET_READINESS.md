# Mainnet readiness - submarine arbitrage (gasless)

## Canonical gasless architecture (2026-10-18)
- Funding = Aave V3 flash loan only. No user trade capital.
- Gasless = authorised SERVICE relayer wallet (Supabase secret `DEPLOYER_PRIVATE_KEY`, funded only with gas) calls `FlashArbExecutor.executeFlashLoanGasless(asset, amount, params, profitRecipient)` where `profitRecipient` MUST equal the recipient encoded in params and MUST be the connected user's wallet.
- `GaslessRelayer.sol` is a meta-tx helper, NOT an ERC-4337 paymaster. Do NOT route through Balancer Vault, a DEX router, an ERC-4337 bundler, or third-party paymasters.

## Done in repo
- [x] PR #1 merged: tracked `.env.mainnet` removed, `.gitignore` hardened
- [x] PR #2 merged: fail-safe Supabase client, Render static config (`render.yaml`), SPA fallback
- [x] PR #3 merged: FlashArbExecutor canonical gasless encoding, allowlisted swaps, correct profit accounting; GasPoolSponsor/GaslessRelayer cleanup; `deploy-mainnet.ts` rewrite; fork test stub
- [x] Supabase project `submarine-arbitrage` created (ref `iaqzemamxjpdqvxcreil`, us-east-2)
- [x] [2026-10-18] Gasless consolidation (partial - see PR): `gasless-relay` disabled (410 stub), on-chain fork test added. `contract-addresses.ts` + `mainnet-config.ts` fixes (zero executor, empty PAYMASTERS, usePaymasters=false) MUST land before merge.

## NOT done - owner-only gated steps (signing / secrets - never in chat/git)
1. Rotate/revoke any credential that appeared in git history.
2. Contracts: `cd contracts && npm install && npx hardhat compile`
3. Fork test: `RUN_FORK_TESTS=1 npx hardhat test test/FlashArbExecutor.fork.ts --network hardhat`
4. Sepolia deploy + tiny gasless test via authorised service relayer.
5. Create/fund service relayer wallet (gas only). Set `DEPLOYER_PRIVATE_KEY` in Supabase secrets ONLY.
6. Set RPC URLs in `contracts/.env` (never commit).
7. Deploy per network: `npx hardhat run scripts/deploy-mainnet.ts --network arbitrum|mainnet|polygon|base` with `SERVICE_RELAYER_ADDRESS` set.
8. Owner calls if not done by script: `setAllowedSwapTarget(router,true)`; `setAuthorizedRelayer(serviceWallet,true)`.
9. Supabase: apply migrations in order, deploy `execute-flash-loan` only (NOT `gasless-relay`), set `FLASH_ARB_EXECUTOR_<NETWORK>` secrets.
10. Render: create static service from `render.yaml`, set only `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
11. First live test: smallest scanner amount, verify profit lands in connected wallet and loan+premium repaid.

## Known limits
- Scanner profit is estimated off-chain; on-chain `profit > 0` check is the safety gate. A revert costs the service relayer gas only.
- No audit has been performed. Start small (<$100 on Arbitrum first).
- Supabase Auth reported UNHEALTHY on 2026-10-18 audit - check Auth settings before inviting users.
