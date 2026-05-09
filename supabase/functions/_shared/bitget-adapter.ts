/**
 * Bitget Wallet adapter helpers.
 * Patterns adapted from https://github.com/bitget-wallet-ai-lab/bitget-wallet-skill
 *
 * Bitget Wallet supports standard EIP-712 typed-data signing and EIP-1193 RPC.
 * For gasless flow we build typed-data the wallet can sign offline, then forward
 * the signed payload through our existing relayer (Gelato / ERC-4337).
 */

export interface BitgetMetaTx {
  to: string;
  data: string;
  value: string;
  nonce: string;
  deadline: number;
  chainId: number;
}

export function buildBitgetTypedData(tx: BitgetMetaTx, verifyingContract: string) {
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      MetaTransaction: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'MetaTransaction',
    domain: {
      name: 'FlashArbBitgetRelay',
      version: '1',
      chainId: tx.chainId,
      verifyingContract,
    },
    message: {
      to: tx.to,
      value: tx.value,
      data: tx.data,
      nonce: tx.nonce,
      deadline: tx.deadline,
    },
  };
}

/** True if request originates from a Bitget connector. */
export function isBitgetWallet(walletType?: string | null): boolean {
  if (!walletType) return false;
  const v = walletType.toLowerCase();
  return v === 'bitget' || v === 'bitkeep';
}

/** Tag a transaction record with bitget metadata. */
export function bitgetTxMetadata(walletType?: string | null) {
  return isBitgetWallet(walletType)
    ? { relayer_provider: 'bitget', wallet_kind: 'bitget' }
    : null;
}
