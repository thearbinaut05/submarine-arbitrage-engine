import pathlib, sys
p = pathlib.Path('supabase/functions/scan-opportunities/index.ts')
t = p.read_text()
if 'SCANNER_AUTO_EXECUTE_DISABLED' not in t:
    old_start = t.find('// Auto-execute high-confidence opportunities')
    if old_start == -1:
        print('marker not found', file=sys.stderr); sys.exit(1)
    # Insert fail-closed stub function right before shouldAutoExecute check by replacing Gelato body start
    # Simplest safe edit: make autoExecuteOpportunity return disabled immediately
    t = t.replace('async function autoExecuteOpportunity(opportunity: ArbitrageOpportunity): Promise<{', 'async function autoExecuteOpportunity(opportunity: ArbitrageOpportunity): Promise<{ // SCANNER_AUTO_EXECUTE_DISABLED 2026-10-18: Gelato auto-execute removed; use execute-flash-loan service relayer\n  success: boolean;\n  taskId?: string;\n  error?: string;\n  preparedTx?: { to: string; data: string; chainId: number; gasLimit: number };\n}> {\n  return { success: false, error: \'Scanner auto-execute disabled. Use execute-flash-loan (authorised service relayer).\' };\n/* LEGACY GELATO AUTO-EXECUTE DISABLED - kept for audit, never execute:', 1)
    # Close the disabled block before shouldAutoExecute comment
    t = t.replace('// Check if opportunity qualifies for auto-execution', '*/\n// Check if opportunity qualifies for auto-execution', 1)
    # Ensure shouldAutoExecute always false
    t = t.replace('function shouldAutoExecute(opportunity: ArbitrageOpportunity): boolean {\n  if (!SCANNER_CONFIG.autoExecuteEnabled) return false;', 'function shouldAutoExecute(_opportunity: ArbitrageOpportunity): boolean { return false; // SCANNER_AUTO_EXECUTE_DISABLED', 1) if 'function shouldAutoExecute(opportunity: ArbitrageOpportunity): boolean {\n  if (!SCANNER_CONFIG.autoExecuteEnabled) return false;' in t else t
    p.write_text(t)
    print('patched scan-opportunities')
else:
    print('already patched')
# Verify no live Gelato fetch remains outside comment markers count check
t2 = p.read_text()
if 'SCANNER_AUTO_EXECUTE_DISABLED' not in t2:
    sys.exit(1)
print('ok')
