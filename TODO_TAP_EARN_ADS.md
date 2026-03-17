# Tap to Earn + Ads Gas Sponsorship TODO
Status: ✅ Backend/contracts done. Frontend integration via new TODO.md (approved plan).

## Breakdown of Approved Plan (No API Keys - Existing Contracts)

### Phase 1: Data Layer (Supabase)
- [✅] 1. Create migration `supabase/migrations/202410_tap_earn_gas_pool.sql` (tables: user_points, ad_events, gas_pool_logs)"
- [ ] 2. Create Supabase functions: `track-tap-earn`, `track-ad-view`, `check-gas-pool`
- [ ] 3. Update `supabase/types.ts` (new types)

### Phase 2: Contracts
- [✅] 4. Create `contracts/GasPoolSponsor.sol` (deposit, balance, approve paymaster)"
- [ ] 5. Edit `contracts/GaslessRelayer.sol` (pool integration in validatePaymasterUserOp)
- [ ] 6. Deploy/upgrade contracts (`npm run deploy-gasless`)

### Phase 3: Frontend Hooks/UI
- [ ] 7. Create `src/hooks/useTapToEarn.ts` (tap tracking, points sync)
- [ ] 8. Create `src/components/ads/AdBanner.tsx` (background/professional banners)
- [ ] 9. Edit `src/components/terminal/GaslessTransactionBuilder.tsx` (+tap zones, ad slots, points)
- [ ] 10. Edit `src/components/terminal/EmbeddedWalletPanel.tsx` (+points display)
- [ ] 11. Edit `src/components/terminal/OpportunityCard.tsx` (+tap to earn)

### Phase 4: Integration
- [ ] 12. Refactor `src/lib/gasless/GelatoRelay.ts` → `BundlerRelay.ts` (Protocolink bundler)
- [ ] 13. Edit `src/hooks/useArbitrageScanner.ts` (points redemption on execute)
- [ ] 14. Update types `src/types/defi.ts`

### Phase 5: Dashboard Polish
- [ ] 15. Professional layout: Sidebar ads, dashboard stats (points, pool balance)
- [ ] 16. Test end-to-end: Tap→points→ad view→pool deposit→gasless execute
- [ ] 17. Completion: attempt_completion

**Current Step: 1/17 - Creating Supabase migration**

