# Architecture

- The active workstation is client-side, read-only paper trading under `src/lib/arbitrage/` and `src/hooks/usePaperScanner.ts`; this keeps quotes, risk checks, and evidence separate from legacy execution code.
- Financial math uses integer token base units and fresh on-chain quotes; floating-point values are for display only, preventing decimal and rounding errors from changing trade decisions.
- Legacy edge functions and wallet-key modules are not part of the active paper-trading flow; do not reconnect them without an explicit live-execution request and a verified executor.
