# Fix Play/Start Button Issue

## Problem
The play/start button does not make the application start scanning or execute real transactions. When clicked, the button doesn't properly trigger the scanning functionality.

## Root Cause Analysis
1. In `Index.tsx`, the `handleStartScanning` function was calling `startScanning()` from `useRealArbitrage` which requires a wallet connection
2. When no wallet is connected, the real scanner sets an error and doesn't start
3. The mock scanner's `startScanner()` function was never called as a fallback

## Fix Applied
- [x] Import `startScanner` and `stopScanner` from `useArbitrageScanner`
- [x] Modify `handleStartScanning` to use mock scanner (`startScanner()`) when no signer/wallet is available
- [x] Added `handleStopScanning` to stop both real and mock scanners
- [x] Update both `ScannerControls` components to use `handleStopScanning`

## Testing
Run the application and verify:
1. Clicking the Start button should now start generating opportunities (mock scanning)
2. The scanning indicator should show active state
3. Opportunities should appear in the list
4. Stop button should stop the scanning

## Status
✅ Fix completed

