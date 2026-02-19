# Fix Plan - Mainnet Execution

## Information Gathered

After analyzing the codebase, I found:

1. **Supabase Configuration**: Environment variables are documented in `TODO_FIX_ALL.md`:
   - `VITE_SUPABASE_URL=https://npwvoaizxzxphifzsadd.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)

2. **Scanner Architecture**:
   - `useRealArbitrage.ts` - Real arbitrage hook calling Supabase edge functions
   - `supabase/functions/scan-opportunities/index.ts` - Scanner edge function
   - `supabase/functions/execute-flash-loan/index.ts` - Execution edge function

3. **Execution Flow**:
   - Scanner calls `scan-opportunities` edge function
   - Execution calls `execute-flash-loan` edge function
   - Uses Gelato for gasless relay

4. **Issue in Index.tsx**: `handleStartScanning` doesn't call `realStartScanning` from `useRealArbitrage` hook

## Fix Plan

### Step 1: Create Environment File
Create `.env` with Supabase configuration

### Step 2: Fix Index.tsx
Update `handleStartScanning` to also call `realStartScanning`

### Step 3: Verify Supabase Edge Functions
Check if edge functions are deployed and functional

### Step 4: Test the Application
Verify scanner works and transactions can be executed

## Files to Edit

1. `.env` - Create with Supabase config
2. `src/pages/Index.tsx` - Fix scanner initialization

## Follow-up Steps

1. Deploy Supabase edge functions if not deployed
2. Configure Gelato API key in Supabase secrets
3. Test scanner end-to-end
4. Monitor transaction execution on mainnet

