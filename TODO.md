# Integrated Tap-to-Earn + Self-Promo Ads → Gas Sponsor Paymasters
Status: 🚀 Implementation started (Plan approved)

## Steps to Complete (Track Progress)

### 1. Planning & Setup [✅ Complete]
- [✅] Update TODO_TAP_EARN_ADS.md (mark prior complete)
- [✅] Create this TODO.md

### 2. Paymaster Config [✅ Configs exist in config.ts/contracts]
- [ ] Read/edit contracts/GasPoolSponsor.sol (hardcode paymasters)
- [ ] Read/edit contracts/GaslessRelayer.sol (update paymasters array)
- [ ] execute_command: bun run deploy-gasless (or npm)

### 3. Ads Enhancement
- [✅] Edit src/components/ads/AdBanner.tsx (self-promo content, auto-track)
- [✅] Edit src/pages/Index.tsx (embed dashboard ads + useTapToEarn stats)

### 4. Tap UI + Tokenomics
- [ ] Edit src/components/terminal/OpportunityCard.tsx (tap button + mini-ad)
- [ ] Edit src/components/terminal/DashboardStats.tsx (points/pool display)
- [ ] Edit src/hooks/useTapToEarn.ts (add redeemPoints for gas rebate)

### 5. Gasless Integration
- [ ] Edit src/components/terminal/GaslessTransactionBuilder.tsx (use embedded + sponsor)
- [ ] Edit src/hooks/useRealArbitrage.ts (points redemption on tx)

### 6. Supabase Polish
- [ ] Edit supabase/functions/track-ad-view/index.ts (revenue → pool deposit)
- [ ] supabase db push (add points_redeemed col if needed)

### 7. Test & Demo
- [ ] End-to-end test: Tap/ad → points/revenue → pool → gasless execute
- [ ] execute_command: bun dev (demo app)

**Next Action: Embed AdBanner in Index.tsx + tap UI**

