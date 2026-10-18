import pathlib, sys
p = pathlib.Path('supabase/functions/execute-flash-loan/index.ts')
t = p.read_text()
if 'PROFIT_WALLET' not in t:
    t = t.replace('import { FlashLoanSchema, validateOrError, sanitizeError } from "../_shared/validation.ts";', 'import { FlashLoanSchema, validateOrError, sanitizeError } from "../_shared/validation.ts";\nimport { PROFIT_WALLET } from "../_shared/profit-wallet.ts";')
    t = t.replace("const profitRecipient = norm(isAddr(body.profitRecipient) ? body.profitRecipient : body.walletAddress);", "// Owner-set fixed profit destination - ignore request profitRecipient to prevent diversion.\n    const profitRecipient = norm(PROFIT_WALLET);")
    if 'PROFIT_WALLET' not in t or 'const profitRecipient = norm(PROFIT_WALLET)' not in t:
        print('patch failed', file=sys.stderr); sys.exit(1)
    p.write_text(t)
    print('patched execute-flash-loan')
else:
    print('already patched')
