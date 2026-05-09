Goal: Take the Bitget Wallet Skill repo beyond a basic connector — wire its tx-signing/relay patterns into our gasless flow, embed an AI assistant in the sidebar that can read balances and trigger trades, and adopt useful UX patterns.

## What we'll build

### 1. Bitget gasless tx adapter (backend)
- New `supabase/functions/_shared/bitget-adapter.ts` with helpers ported from the skill:
  - `buildBitgetMetaTx(to, data, value, deadline)` — EIP-712 typed-data structure
  - `relayBitgetTx(signed, network)` — submits to Bitget paymaster/relayer with Gelato fallback
- Update `supabase/functions/gasless-relay/index.ts` to detect `walletType === 'bitget'` from the request body and route through the new adapter (Bitget paymaster first, ERC-4337/Gelato as fallback). Keep existing flow untouched for MetaMask/injected.

### 2. Frontend signing path
- Update `src/hooks/useWallet.ts` so `signTypedData` uses the Bitget provider when `connectorType === 'bitget'`.
- Update `src/components/terminal/GaslessTransactionBuilder.tsx` to pass `walletType` through to the relay call.

### 3. AI Wallet Assistant sidebar (Bitget skill style)
- New edge function `supabase/functions/wallet-assistant/index.ts` using Lovable AI (`google/gemini-2.5-flash`) with tool-calling. Tools:
  - `get_balance(address, network)` — on-chain via existing RPC helpers
  - `get_opportunities()` — reads `arbitrage_opportunities` table
  - `prepare_trade(opportunityId)` — returns calldata for user to sign (no auto-execute)
  - `get_points(address)` — reads `user_points`
- New component `src/components/terminal/WalletAssistant.tsx`: collapsible panel mounted in the existing terminal sidebar, react-markdown rendered, tool-call results shown inline, full conversation history sent each turn (in-memory; not persisted unless asked).
- Mount in `src/components/terminal/Sidebar.tsx` behind a toggle button so it doesn't crowd the layout.

### 4. UX patterns from the skill
- Adopt their command palette style (`/balance`, `/scan`, `/trade <id>`) as quick-action buttons above the assistant input.
- Reuse their compact tx-status badges in `OpportunityCard` for consistency.

## Out of scope
- No new smart contract deployments (per project memory).
- No persistent chat history table — session-only unless you ask later.
- No external API keys; everything runs on Lovable AI + existing RPCs + Bitget gateway.

## Files

Create:
- `supabase/functions/_shared/bitget-adapter.ts`
- `supabase/functions/wallet-assistant/index.ts`
- `src/components/terminal/WalletAssistant.tsx`

Edit:
- `supabase/functions/gasless-relay/index.ts` (Bitget routing)
- `src/hooks/useWallet.ts` (typed-data signing per provider)
- `src/components/terminal/GaslessTransactionBuilder.tsx` (pass walletType)
- `src/components/terminal/Sidebar.tsx` (mount assistant + toggle)
- `src/components/terminal/OpportunityCard.tsx` (status badges)

## Verification
- Deploy `gasless-relay` and `wallet-assistant` edge functions
- Connect Bitget Wallet → trigger a gasless test tx → confirm Bitget paymaster path is used
- Open assistant → ask "what's my balance on arbitrum?" → verify tool call returns on-chain data

Approve to proceed, or tell me which steps to drop/adjust.