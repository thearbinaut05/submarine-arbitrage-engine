import pathlib, re, sys

ZERO = "'0x0000000000000000000000000000000000000000'"
BAD = [
    "0xdCBE0C1A00e4Cf24AE77c52125e6e6b4F7C6Db4e",
    "0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402",
    "0x7D3201fa7a85c0A5f9fA1c0C6b9D0B784368d2ac",
]
FILES = [
    "supabase/functions/_shared/mainnet-config.ts",
    "supabase/functions/_shared/contract-addresses.ts",
    "contracts/GaslessRelayer.sol",
    "contracts/scripts/config.ts",
]

def zero_fields(text):
    for field in ["flashArbExecutor", "gaslessRelayer", "positionRebalancer"]:
        text = re.sub(rf"(\b{field}:\s*)(?:'[^']*'|[A-Za-z0-9_\.]+)(,)", rf"\g<1>{ZERO}\g<2> // NOT DEPLOYED - set FLASH_ARB_EXECUTOR_<NETWORK> / authorised service relayer", text)
    return text

changed = []
for rel in FILES:
    p = pathlib.Path(rel)
    if not p.exists():
        continue
    t = p.read_text()
    orig = t
    for bad in BAD:
        t = t.replace(bad, "0x0000000000000000000000000000000000000000")
    # Remove legacy paymaster map in mainnet-config
    t = re.sub(r"export const PAYMASTERS: Record<string, string\[\]> = \{.*?\};", "// DISABLED 2026-10-18: legacy third-party paymasters removed. Canonical gasless = authorised service relayer -> FlashArbExecutor.executeFlashLoanGasless. GaslessRelayer.sol is NOT an ERC-4337 paymaster.\nexport const PAYMASTERS: Record<string, string[]> = {};", t, flags=re.S, count=1)
    # Zero GaslessRelayer.sol hard-coded paymasters array
    t = re.sub(r"address\[3\] public paymasters = \[.*?\];", "address[3] public paymasters = [address(0), address(0), address(0)]; // DISABLED: no third-party paymasters", t, flags=re.S, count=1)
    t = zero_fields(t)
    t = t.replace("usePaymasters: true,", "usePaymasters: false, // DISABLED: canonical path is service-relayer executeFlashLoanGasless")
    if rel.endswith("contract-addresses.ts") and "FIXED 2026-10-18" not in t:
        t = "/**\n * FIXED 2026-10-18: flashArbExecutor = your deployed FlashArbExecutor (Aave V3), NOT Balancer Vault.\n * gaslessRelayer = authorised service relayer EOA (pays gas), NOT a DEX router. Zero = not deployed.\n * Set FLASH_ARB_EXECUTOR_<NETWORK> in Supabase secrets after deployment. Balancer/Uniswap\n * constants below are protocol references only - never send executeFlashLoanGasless to them.\n */\n" + re.sub(r"^/\*\*[\s\S]*?\*/\s*", "", t, count=1)
    if t != orig:
        p.write_text(t)
        changed.append(rel)
        print(f"patched {rel}")
    else:
        print(f"no change {rel}")
    # Fail closed if dangerous defaults remain in the two TS configs
    if rel.endswith(("mainnet-config.ts", "contract-addresses.ts")):
        for needle in BAD + ["flashArbExecutor: BALANCER", "gaslessRelayer: UNISWAP", "usePaymasters: true"]:
            if needle in t:
                print(f"ERROR: {needle} still present in {rel}", file=sys.stderr); sys.exit(1)
        for m in re.finditer(r"\b(flashArbExecutor|gaslessRelayer):\s*([^,\n]+),", t):
            if "0x0000000000000000000000000000000000000000" not in m.group(2):
                print(f"ERROR: non-zero {m.group(1)} in {rel}: {m.group(0)}", file=sys.stderr); sys.exit(1)
print("done", changed)
