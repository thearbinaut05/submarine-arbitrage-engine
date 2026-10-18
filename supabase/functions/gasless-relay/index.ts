// DISABLED 2026-10-18 - DO NOT DEPLOY THIS LEGACY FUNCTION
// Canonical gasless path is: supabase/functions/execute-flash-loan
//   authorised SERVICE relayer (DEPLOYER_PRIVATE_KEY, gas-only wallet)
//   -> FlashArbExecutor.executeFlashLoanGasless(asset, amount, params, profitRecipient=connected wallet)
// GaslessRelayer.sol is NOT an ERC-4337 paymaster. The ERC-4337 bundler/Pimlico
// and Gelato paths formerly in this file routed to Balancer/Uniswap placeholders
// and third-party paymasters, and must never be used for mainnet arbitrage.
// This stub fails closed so an accidental deploy cannot execute trades.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  return new Response(JSON.stringify({ success: false, error: "gasless-relay is disabled. Use execute-flash-loan (service-relayer gasless).", code: "GASLESS_RELAY_DISABLED" }), { status: 410, headers: { ...cors, "Content-Type": "application/json" } });
});
