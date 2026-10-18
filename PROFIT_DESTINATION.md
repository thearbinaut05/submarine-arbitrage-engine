# Profit destination

Owner-set 2026-10-18:

**All arbitrage profits go to `0x1713A06B6dE68139E63306bC604CaFD928fbb310`**

- Constant: `supabase/functions/_shared/profit-wallet.ts` (`PROFIT_WALLET`)
- Enforced in: `supabase/functions/execute-flash-loan/index.ts` (ignores request `profitRecipient`/`walletAddress` for profit routing; `walletAddress` still required/validated as the caller identity)
- On-chain: `FlashArbExecutor.executeFlashLoanGasless(asset, amount, params, profitRecipient)` requires `profitRecipient == recipient encoded in params`; `executeOperation` transfers `balance - (amount+premium)` to that recipient, repays Aave, reverts if profit <= 0.
- Submarine/private submission does NOT change the recipient; it only hides the tx (Flashbots Protect on Ethereum, private RPC where available) until included. Profit still settles to the address above in the same atomic tx.

## Existing contracts you can / cannot use
- CAN use as infrastructure: Aave V3 Pool (flash loan), Uniswap V3 / SushiSwap routers (swaps, must be allowlisted), Balancer Vault (alternative flash-loan source IF a receiver contract implements IFlashLoanRecipient - your FlashArbExecutor is Aave IFlashLoanSimpleReceiver, so not Balancer-compatible without a new receiver).
- CANNOT use alone: Balancer Vault, Uniswap, Aave Pool cannot do the arbitrage by themselves. None will atomically borrow -> swap A -> swap B -> repay -> send profit to your wallet. That logic must live in a receiver/executor contract (yours: FlashArbExecutor.sol, not yet deployed) OR in a smart-account / multicall that Aave/Balancer calls back. There is no way to get atomic flash-loan arbitrage profit to 0x1713... using only already-deployed DEX/pool contracts with no executor in the middle.
- Submarine: commit-reveal via GaslessRelayer.sol hides intent, Flashbots Protect hides the tx from public mempool. Neither replaces the executor; the reveal/execution still calls FlashArbExecutor.
