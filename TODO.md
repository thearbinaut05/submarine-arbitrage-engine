# Fix All Linting Errors - TODO

## Status: In Progress

### Test Files
- [ ] src/test/abis.test.ts - Replace "any" with proper ABI types
- [ ] src/test/hooks.test.ts - Define types for window.ethereum and private methods
- [ ] src/test/priceFetcher.test.ts - Define types for private properties
- [ ] src/test/setup.ts - Define types for WebSocket mock and events

### Contract Scripts
- [ ] contracts/scripts/deploy-single.ts - Fix constructor args and error types
- [ ] contracts/scripts/deploy-gasless.ts - Fix error handling
- [ ] contracts/scripts/deploy-gasless-all.ts - Fix error handling
- [ ] contracts/scripts/deploy-all.ts - Fix error handling
- [ ] contracts/scripts/verify-contracts.ts - Fix error handling
- [ ] contracts/scripts/test-deployment.ts - Fix error handling

### Supabase Functions
- [ ] supabase/functions/rebalance-positions/index.ts - Define TransactionBundle type

### Verification
- [ ] Run linting to verify all "any" types are resolved
- [ ] Test that changes don't break functionality
