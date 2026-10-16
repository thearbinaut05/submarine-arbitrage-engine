# Mainnet readiness - submarine arbitrage (gasless)

## Done in repo
- [x] PR #1 merged: tracked `.env.mainnet` removed, `.gitignore` hardened
- [x] PR #2 merged: fail-safe Supabase client, Render static config (`render.yaml`), SPA fallback
- [x] PR #3 merged: FlashArbExecutor canonical gasless encoding, allowlisted swaps, correct profit accounting; GaslessRelayer cleanup; `deploy-mainnet.ts` rewrite; fork test stub
- [x] Supabase project `submarine-arbitrage` created (ref `iaqzemamxjpdqvxcreil`, us-east-2)
- [ ] This PR: canonical `_shared/flash-arb-executor.ts`, deploy scripts corrected
- [ ] Follow-up: untrack root `.env` (still tracked on main; `.gitignore` already prevents new env files). Rotate any credential that ever appeared in it or in `.env.mainnet` history.

## Owner-only gated steps (signing / secrets - not done by automation)
1. Rotate/revoke any credential that appeared in git history. Consider history purge; at minimum rotate.
2. Contracts: `cd contracts && npm install && npx hardhat compile`
3. Fork test: `RUN_FORK_TESTS=1 npx hardhat test --network hardhat`. Then Sepolia deploy + tiny gasless test.
4. Create/fund service relayer wallet (gas only). Set `DEPLOYER_PRIVATE_KEY` in Supabase secrets only.
5. Set RPC URLs in `contracts/.env` (never commit).
6. Deploy per network: `npx hardhat run scripts/deploy-mainnet.ts --network mainnet|arbitrum|polygon|base` with `SERVICE_RELAYER_ADDRESS` set.
7. Owner calls if not done by script: `setAllowedSwapTarget(router,true)`; `setAuthorizedRelayer(serviceWallet,true)`.
8. Supabase: apply migrations in order, deploy edge functions, set `FLASH_ARB_EXECUTOR_<NETWORK>` secrets.
9. Render: create static service from `render.yaml`, set only `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
10. First live test: smallest scanner amount, verify profit lands in connected wallet and loan+premium repaid.

## Known limits
- Scanner profit is estimated off-chain; on-chain checks are the safety gate. A revert costs gas only.
- Gasless in production = service-wallet relayer, not GaslessRelayer.sol paying EntryPoint.
- No audit has been performed. Start small.
