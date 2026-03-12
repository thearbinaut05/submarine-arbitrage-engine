// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title GaslessRelayer
 * @notice Enables gasless/meta-transactions with optional submarine transaction support
 * @dev Implements EIP-712 for typed data signing and commit-reveal for submarine txs
 * @dev UUPS upgradeable for future improvements
 */
contract GaslessRelayer is OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, EIP712 {
  import "./interfaces/IPaymasters.sol";

  address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
  address[3] public paymasters = [
    0xdCBE0C1A00e4Cf24AE77c52125e6e6b4F7C6Db4e,
    0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402,
    0x7D3201fa7a85c0A5f9fA1c0C6b9D0B784368d2ac
  ];

  /**
   * @notice ERC4337 Paymaster validation for gas sponsorship
   */
  function validatePaymasterUserOp(
    IEntryPoint.UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
  ) external view returns (bytes memory context, uint256 validationData) {
    require(msg.sender == ENTRY_POINT, "Only EntryPoint");
    require(authorizedExecutors[userOp.sender], "Unauthorized sender");
    // Sponsor all arb ops
    return ("", 0);
  }

  /**
   * @notice Post operation - transfer profits to paymaster
   */
  function postOp(
    IEntryPoint.UserOperation calldata userOp,
    bytes calldata context,
    uint256 actualGasCost
  ) external {
    require(msg.sender == ENTRY_POINT, "Only EntryPoint");
    // Refund paymaster from contract balance or profit
    uint256 gasPrice = tx.gasprice;
    payable(paymasters[0]).transfer(actualGasCost * gasPrice);
  }

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

    // Gas sponsor address (Gelato relay)
    address public gasSponsor;
    
    // Nonces for replay protection
    mapping(address => uint256) public nonces;
    
    // Submarine transaction commits (commitment => reveal deadline)
    mapping(bytes32 => uint256) public submarineCommits;
    
    // Executed transactions
    mapping(bytes32 => bool) public executedTransactions;

    // Authorized executors (contracts that can call executeMetaTransaction)
    mapping(address => bool) public authorizedExecutors;

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
    
    event ExecutorAuthorized(address indexed executor, bool authorized);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() EIP712("FlashArb Relayer", "1") {
        _disableInitializers();
    }

    function initialize(address _gasSponsor) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __EIP712_init("FlashArb Relayer", "1");
        
        gasSponsor = _gasSponsor;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Executes a meta-transaction on behalf of a user (only by authorized executors)
     */
    function executeMetaTransaction(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant returns (bool success, bytes memory returnData) {
        require(authorizedExecutors[msg.sender], "Not authorized executor");
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
     */
    function revealAndExecuteSubmarine(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        bytes32 salt,
        bytes calldata signature
    ) external nonReentrant returns (bool success, bytes memory returnData) {
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
     * @notice Authorizes or deauthorizes a contract executor
     */
    function setAuthorizedExecutor(address executor, bool authorized) external onlyOwner {
        authorizedExecutors[executor] = authorized;
        emit ExecutorAuthorized(executor, authorized);
    }

    /**
     * @notice Updates the gas sponsor address
     */
    function updateGasSponsor(address newSponsor) external onlyOwner {
        address oldSponsor = gasSponsor;
        gasSponsor = newSponsor;
        emit GasSponsorUpdated(oldSponsor, newSponsor);
    }

    /**
     * @notice Withdraws ETH from the contract
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }

    /**
     * @notice Withdraws tokens from the contract
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
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

