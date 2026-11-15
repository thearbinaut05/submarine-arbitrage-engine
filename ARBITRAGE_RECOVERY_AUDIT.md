# Arbitrage recovery audit — 2026-11-15

## Verified findings
- Repository: `thearbinaut05/submarine-arbitrage-engine`.
- Main branch head: `196010b72c10734cd17323ea437fabd6d6eeb849` (paper-engine hardening).
- The dashboard still wires `useRealArbitrage`, including manual execution and an auto-execute toggle, while the new `usePaperScanner` is not the sole active execution path.
- Supabase project `submarine-arbitrage` (ref `iaqzemamxjpdqvxcreil`) is INACTIVE. It has active Edge Function records, including `execute-flash-loan` and `scan-opportunities`.
- The repository's `supabase/config.toml` points to a third project ref, `npwvoaizxzxphifzsadd`, which is not in the connected account's project inventory.
- The separate Click Clack Cash Flow project `tqbybefpnwxukzqkanip` is ACTIVE_HEALTHY, but it has no arbitrage/flash-loan Edge Functions in its current inventory. It must not be silently substituted for the arbitrage project.
- The current mainnet configuration has zero/unset custom executor addresses. The source contract `FlashArbExecutor.sol` exists, but no deployed executor address or successful arbitrage receipt was verified.
- The older branch `fix/gasless-service-relayer` is divergent from main (10 commits ahead, 24 behind). Its own readiness report says the executor was undeployed and mainnet steps remained outstanding.
- The older branch hard-codes a profit wallet address in `profit-wallet.ts`. It must be owner-confirmed before any live deployment; this audit does not assume it is the intended destination.
- Legacy execution code marks transactions/opportunities confirmed/completed immediately after RPC submission without first proving a successful mined receipt. That is not evidence of realized profit.
- Vercel project search returned no project matching `submarine`, `arbitrage`, or `flasharb` in the connected Vercel account. This does not rule out another hosting account/provider.

## Recovery safeguards
- A live-execution guard is being added to the current main branch's manual/automatic execution entrypoint on this recovery branch.
- Read-only scanning remains available.
- No wallet keys, Supabase secrets, database rows, contracts, or funds were changed.
- Do not deploy the legacy executor function or merge the divergent branch wholesale.

## Exit criteria
1. Confirm the intended Supabase project and review restoration/billing impact before restoring the inactive project.
2. Verify executor bytecode, chain, constructor/initializer state, and router allowlist.
3. Confirm the intended profit destination and authorized relayer independently.
4. Fork-simulate the exact transaction and prove loan plus premium repayment and positive net proceeds.
5. Require a successful mined receipt, confirmation depth, and balance/event reconciliation before recording confirmed profit.
6. Complete security review and a separately approved, smallest-size test transaction.
