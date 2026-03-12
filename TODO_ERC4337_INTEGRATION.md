# ERC4337 Paymaster Integration TODO

Status: Pending user approval

## Information Gathered
- Current: EIP712 meta-tx + Gelato, no ERC4337.
- Target: Use top paymasters (0xdCBE0C1A..., 0x8888...) for gas sponsorship.
- Networks: mainnet primary.

## Detailed Plan

**1. contracts/package.json** - Add deps
```
"@pimlico/sdk": "^6.0.5",
"@account-abstraction/sdk": "^0.7.0",
"wagmi": "^2.12.4" 
```

**2. contracts/scripts/config.ts** - Add paymasters
```
export const MAINNET_PAYMASTERS = [
  '0xdCBE0C1A00e4Cf24AE77c52125e6e6b4F7C6Db4e',
  '0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402',
  '0x7D3201fa7a85c0A5f9fA1c0C6b9D0B784368d2ac'
];
export const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789'; // v0.7
```

**3. contracts/GaslessRelayer.sol** - ERC4337 support
- Inherit `BasePaymaster, IStakeManager` 
- Add `validatePaymasterUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost)`
- Policy: Sponsor if userOp.callData targets FlashArbExecutor, payLater mode.
- `postOp`: Transfer arb profit % to paymaster from context.

**4. src/components/terminal/GaslessTransactionBuilder.tsx** - ERC4337 bundler
- Integrate PimlicoClient, SmartAccount
- useSmartAccount, sendUserOperation with paymaster from list.

**5. supabase/functions/gasless-relay/** - Server-side bundler calls.

## Follow-up Steps
1. `cd contracts && npm i deps`
2. Edit files per plan.
3. `npx hardhat compile`
4. Test locally.
5. Deploy & update frontend.

Approve to create revised files?

