// Single source of truth for arbitrage profit destination.
// Set by owner 2026-10-18: ALL profits from gasless arbitrage go to this wallet.
// This overrides any connected-wallet / request-supplied profitRecipient in
// execute-flash-loan. The on-chain contract enforces recipient == recipient
// encoded in params, so backend MUST encode this address in both places.
export const PROFIT_WALLET = '0x1713a06b6de68139e63306bc604cafd928fbb310';
export const PROFIT_WALLET_CHECKSUMMED = '0x1713A06B6dE68139E63306bC604CaFD928fbb310';
