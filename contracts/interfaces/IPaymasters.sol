// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
interface IEntryPoint {
    struct UserOperation { address sender; uint256 nonce; bytes initCode; bytes callData; uint256 callGasLimit; uint256 verificationGasLimit; uint256 preVerificationGas; uint256 maxFeePerGas; uint256 maxPriorityFeePerGas; bytes paymasterAndData; bytes signature; }
}
interface IBasePaymaster {
    function validatePaymasterUserOp(IEntryPoint.UserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost) external returns (bytes memory context, uint256 validationData);
    function postOp(IEntryPoint.UserOperation calldata userOp, bytes calldata context, uint256 actualGasCost) external;
}
