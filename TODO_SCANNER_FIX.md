# Scanner Fix TODO List

## Phase 1: Core Scanner Fixes
- [ ] 1. Fix price fetching to add slippage modeling
- [ ] 2. Add dynamic gas estimation instead of hardcoded 500k
- [ ] 3. Fix flash loan fee calculation to be token-specific
- [ ] 4. Add proper spread threshold (not 0.01% which is unrealistic)

## Phase 2: Debugging & Transparency
- [ ] 5. Add detailed logging for each price check
- [ ] 6. Show actual vs calculated profits
- [ ] 7. Add RPC response debugging
- [ ] 8. Add network-specific debugging

## Phase 3: Configuration Improvements
- [ ] 9. Update SCANNER_CONFIG with realistic thresholds
- [ ] 10. Add more RPC endpoints for reliability
- [ ] 11. Improve error handling

## Phase 4: Testing
- [ ] 12. Test scanner with realistic settings
- [ ] 13. Verify debug output is visible

