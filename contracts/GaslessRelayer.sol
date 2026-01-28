// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title GaslessRelayer
 * @notice Enables gasless/meta-transactions with optional submarine transaction support
 * @dev Implements EIP-712 for typed data signing and commit-reveal for submarine txs
 */
contract GaslessRelayer is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Typehash for meta-transactions
    bytes32 public constant META_TRANSACTION_TYPEHASH = keccak256(
        "MetaTransaction(address from,address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)"
    );

    // Typehash for submarine commit
    bytes32 public constant SUBMARINE_COMMIT_TYPEHASH = keccak256(
        "SubmarineCommit(bytes32 commitment,uint256 nonce,uint256 deadline)"
    );

    // Gas sponsor address
    address public gasSponsor;
    
    // Owner
    address public owner;
    
    // Nonces for replay protection
    mapping(address => uint256) public nonces;
    
    // Submarine transaction commits (commitment => reveal deadline)
    mapping(bytes32 => uint256) public submarineCommits;
    
    // Executed transactions
    mapping(bytes32 => bool) public executedTransactions;

    // Events
    event MetaTransactionExecuted(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data,
        uint256 nonce,
        bool success
    );

    event SubmarineCommitted(
        bytes32 indexed commitment,
        address indexed sender,
        uint256 revealDeadline
    );

    event SubmarineRevealed(
        bytes32 indexed commitment,
        address indexed from,
        address indexed to,
        uint256 value,
        bool success
    );

    event GasSponsorUpdated(address indexed oldSponsor, address indexed newSponsor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlySponsor() {
        require(msg.sender == gasSponsor || msg.sender == owner, "Not authorized");
        _;
    }

    constructor(address _gasSponsor) EIP712("FlashArb Relayer", "1") {
        owner = msg.sender;
        gasSponsor = _gasSponsor;
    }

    /**
     * @notice Executes a meta-transaction on behalf of a user
     * @param from The address of the user
     * @param to The target contract address
     * @param value The ETH value to send
     * @param data The calldata
     * @param deadline The transaction deadline
     * @param signature The user's signature
     */
    function executeMetaTransaction(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        uint256 deadline,
        bytes calldata signature
    ) external onlySponsor nonReentrant returns (bool success, bytes memory returnData) {
        require(block.timestamp <= deadline, "Transaction expired");
        
        uint256 currentNonce = nonces[from];
        
        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            META_TRANSACTION_TYPEHASH,
            from,
            to,
            value,
            keccak256(data),
            currentNonce,
            deadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == from, "Invalid signature");
        
        // Check not already executed
        require(!executedTransactions[digest], "Already executed");
        executedTransactions[digest] = true;
        
        // Increment nonce
        nonces[from] = currentNonce + 1;
        
        // Execute transaction
        (success, returnData) = to.call{value: value}(data);
        
        emit MetaTransactionExecuted(from, to, value, data, currentNonce, success);
    }

    /**
     * @notice Commits a submarine transaction (hidden until reveal)
     * @param commitment The hash of the transaction details
     * @param revealDeadline When the reveal must happen by
     */
    function commitSubmarine(
        bytes32 commitment,
        uint256 revealDeadline
    ) external {
        require(revealDeadline > block.timestamp, "Invalid deadline");
        require(submarineCommits[commitment] == 0, "Already committed");
        
        submarineCommits[commitment] = revealDeadline;
        
        emit SubmarineCommitted(commitment, msg.sender, revealDeadline);
    }

    /**
     * @notice Reveals and executes a submarine transaction
     * @param from The address of the user
     * @param to The target contract address
     * @param value The ETH value
     * @param data The calldata
     * @param salt Random salt used in commitment
     * @param signature The user's signature
     */
    function revealAndExecuteSubmarine(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes32 salt,
        bytes calldata signature
    ) external onlySponsor nonReentrant returns (bool success, bytes memory returnData) {
        // Reconstruct commitment
        bytes32 commitment = keccak256(abi.encodePacked(from, to, value, keccak256(data), salt));
        
        // Verify commitment exists and not expired
        uint256 revealDeadline = submarineCommits[commitment];
        require(revealDeadline != 0, "Commitment not found");
        require(block.timestamp <= revealDeadline, "Reveal deadline passed");
        
        // Verify signature
        uint256 currentNonce = nonces[from];
        bytes32 structHash = keccak256(abi.encode(
            SUBMARINE_COMMIT_TYPEHASH,
            commitment,
            currentNonce,
            revealDeadline
        ));
        
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == from, "Invalid signature");
        
        // Mark as executed
        delete submarineCommits[commitment];
        nonces[from] = currentNonce + 1;
        
        // Execute transaction
        (success, returnData) = to.call{value: value}(data);
        
        emit SubmarineRevealed(commitment, from, to, value, success);
    }

    /**
     * @notice Updates the gas sponsor address
     * @param newSponsor The new sponsor address
     */
    function updateGasSponsor(address newSponsor) external onlyOwner {
        address oldSponsor = gasSponsor;
        gasSponsor = newSponsor;
        emit GasSponsorUpdated(oldSponsor, newSponsor);
    }

    /**
     * @notice Withdraws ETH from the contract
     * @param amount The amount to withdraw
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        payable(owner).transfer(amount);
    }

    /**
     * @notice Withdraws tokens from the contract
     * @param token The token address
     * @param amount The amount to withdraw
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner, amount);
    }

    /**
     * @notice Returns the current nonce for an address
     */
    function getNonce(address account) external view returns (uint256) {
        return nonces[account];
    }

    /**
     * @notice Checks if a commitment exists and is valid
     */
    function isCommitmentValid(bytes32 commitment) external view returns (bool) {
        uint256 deadline = submarineCommits[commitment];
        return deadline != 0 && block.timestamp <= deadline;
    }

    receive() external payable {}
}
