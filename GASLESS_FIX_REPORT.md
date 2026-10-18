# Gasless fix report - 2026-10-18

Branch: fix/gasless-service-relayer | PR: https://github.com/thearbinaut05/submarine-arbitrage-engine/pull/6
Profit wallet (owner-set): 0x1713A06B6dE68139E63306bC604CaFD928fbb310

## Verified on branch
- mainnet-config.ts / contract-addresses.ts: PAYMASTERS={}, usePaymasters:false, executor/relayer zeroed, no third-party paymasters.
- GaslessRelayer.sol + config.ts: paymasters zeroed.
- gasless-relay: 410 stub. scan-opportunities: Gelato auto-execute fail-closed.
- execute-flash-loan: import { PROFIT_WALLET } from ../_shared/profit-wallet.ts; const profitRecipient = norm(PROFIT_WALLET); request profitRecipient ignored. Blob fb424c8.
- profit-wallet.ts: PROFIT_WALLET=0x1713a06b6de68139e63306bc604cafd928fbb310 (checksummed 0x1713A06B...fbb310).
- Fork test added (RUN_FORK_TESTS=1 only).

CI: 39084882125, 39084958082, 39089149588 all success.

## Existing contracts - honest limits
Aave/Balancer/Uniswap alone cannot atomically borrow-swap-swap-repay-pay you. FlashArbExecutor (yours, undeployed) is the receiver that does it via Aave callback. Submarine (Flashbots/commit-reveal) only hides the tx; profit still settles to PROFIT_WALLET in same tx.

## Before mainnet
Fork test, Sepolia, funded service relayer, Supabase secrets only, authorise relayer/routers, Render, <$100 Arbitrum test. No audit.
