# Gasless fix report - 2026-10-18

Branch: fix/gasless-service-relayer
Base: main@9f4d047
Commits: d254ffd, f69f3fc, 1ca06fa (bot), 693b9c1, 93aaf50, e9f6ddd (bot scanner), this cleanup.
CI: patch-gasless run 39084882125 success; patch-scanner run 39084958082 success.

## Verified on branch (read back via GitHub API)
- mainnet-config.ts: PAYMASTERS = {}, usePaymasters: false, flashArbExecutor/gaslessRelayer = 0x000...0 (NOT DEPLOYED), no Balancer/Uniswap executor defaults, no 0xdCBE/0x8888 paymasters.
- contract-addresses.ts: same zeroing, header warns never send executeFlashLoanGasless to Balancer/routers.
- GaslessRelayer.sol + contracts/scripts/config.ts: paymaster arrays zeroed.
- gasless-relay/index.ts: 410 fail-closed stub.
- scan-opportunities/index.ts: autoExecuteOpportunity fail-closed (SCANNER_AUTO_EXECUTE_DISABLED), Gelato code commented out, braces/parens balanced. Scanner still returns opportunities; execution must go via execute-flash-loan.
- contracts/test/FlashArbExecutor.fork.ts: authorised-relayer, recipient-mismatch, safe-revert checks (skipped unless RUN_FORK_TESTS=1).

## NOT verified in CI
- Full vite build on PR (Pages workflow only runs on main). Run `npm install && npm run build` locally / in PR check before merge; edge functions are Deno, not built by vite.
- Fork test not run (needs fork RPC + AAVE_POOL_ADDRESSES_PROVIDER, UNISWAP_V3_ROUTER, FORK_USDC).

## Still required before mainnet (owner-only)
Fork test pass, Sepolia deploy, service relayer funded (gas only), DEPLOYER_PRIVATE_KEY + FLASH_ARB_EXECUTOR_<NETWORK> in Supabase secrets only, setAuthorizedRelayer/setAllowedSwapTarget, Render service, first <$100 Arbitrum test. No audit performed. Supabase Auth UNHEALTHY at audit time.
