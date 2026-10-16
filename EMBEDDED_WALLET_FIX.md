# Embedded wallet backend fix required

File: supabase/functions/embedded-wallet/index.ts

Replace old generateWallet() that derived address from SHA-256(privateKeyBytes) with proper secp256k1:

```ts
async function generateWallet(): Promise<{ address: string; privateKey: string }> {
  const { ethers } = await import("https://esm.sh/ethers@6.13.4");
  const wallet = ethers.Wallet.createRandom();
  return { address: wallet.address, privateKey: wallet.privateKey };
}
```

Why: SHA-256 slice is NOT an Ethereum address (correct is keccak256 of secp256k1 public key). Funds to old address unrecoverable; withdraw signing controls a different address.

Frontend no longer depends on this: built-in wallet (useLocalWallet + LocalWalletPanel) creates real ethers wallets locally. Redeploy edge function only after Supabase restored (402 exceed_db_size_quota). Do NOT deposit to embedded addresses created before this fix.
