// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import \"./GasPoolSponsor.sol\";

/**
 * @title GaslessRelayer - Updated with Tap-to-Earn Gas Pool
 * @notice Enables gasless/meta-transactions sponsored by community gas pool from ads/taps
 */
contract GaslessRelayer is OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, EIP712 {
  
  address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
  
  address[3] public paymasters = [
    0xdCBE0C1A00e4Cf24AE77c52125e6e6b4F7C6Db4e,
    0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402,
    0x7D3201fa7a85c0A5f9fA1c0C6b9D0B784368d2ac
  ];

  GasPoolSponsor public gasPoolSponsor;
  uint256 public minPoolBalance = 0.01 ether;

  using SafeERC20 for IERC20;
  using ECDSA for bytes32;

  bytes32 public constant META_TRANSACTION_TYPEHASH = keccak256(
    \"MetaTransaction(address from,address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)\"
  );

  bytes32 public constant SUBMARINE_COMMIT_TYPEHASH = keccak256(
    \"SubmarineCommit(bytes32 commitment,uint256 nonce,uint256 deadline)\"
  );

  address public gasSponsor;
  mapping(address => uint256) public nonces;
  mapping(bytes32 => uint256) public submarineCommits;
  mapping(bytes32 => bool) public executedTransactions;
  mapping(address => bool) public authorizedExecutors;

  event MetaTransactionExecuted(address indexed from, address indexed to, uint256 value, bytes data, uint256 nonce, bool success);
  event SubmarineCommitted(bytes32 indexed commitment, address indexed sender, uint256 revealDeadline);
  event SubmarineRevealed(bytes32 indexed commitment, address indexed from, address indexed to, uint256 value, bool success);
  event GasSponsorUpdated(address indexed oldSponsor, address indexed newSponsor);
  event ExecutorAuthorized(address indexed executor, bool authorized);
  event GasPoolUpdated(address indexed pool);

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() EIP712(\"FlashArb Relayer\", \"2\") {
    _disableInitializers();
  }

  function initialize(address _gasSponsor, address _gasPoolSponsor) public initializer {
    __Ownable_init(msg.sender);
    __ReentrancyGuard_init();
    __UUPSUpgradeable_init();
    __EIP712_init(\"FlashArb Relayer\", \"2\");
    
    gasSponsor = _gasSponsor;
    gasPoolSponsor = GasPoolSponsor(_gasPoolSponsor);
  }

  function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

  function validatePaymasterUserOp(
    IEntryPoint.UserOperation calldata userOp,
    bytes32 userOpHash,
    uint256 maxCost
  ) external view returns (bytes memory context, uint256 validationData) {
    require(msg.sender == ENTRY_POINT, \"Only EntryPoint\");
    require(authorizedExecutors[userOp.sender], \"Unauthorized sender\");

    // Check gas pool balance for sponsorship (tap-to-earn funded)
    if (address(gasPoolSponsor) != address(0)) {
      (, bytes memory balanceData) = address(gasPoolSponsor).staticcall(abi.encodeWithSignature(\"getPoolBalance()\"));
      uint256 poolBalance = abi.decode(balanceData, (uint256));
      require(poolBalance >= minPoolBalance, \"Gas pool insufficient for sponsorship\");
    }

    return (\"\", 0);
  }

  function postOp(
    IEntryPoint.UserOperation calldata userOp,
    bytes calldata context,
    uint256 actualGasCost
  ) external {
    require(msg.sender == ENTRY_POINT, \"Only EntryPoint\");

    uint256 gasPrice = tx.gasprice;
    uint256 gasCost = actualGasCost * gasPrice;

    // Try claim from gas pool first (ads/tap funded)
    if (address(gasPoolSponsor) != address(0)) {
      (bool success, ) = address(gasPoolSponsor).call(
        abi.encodeWithSignature(\"claimGasForUserOp(uint256,uint256)\", actualGasCost, gasPrice)
      );
      if (success) {
        emit GasPoolUpdated(address(gasPoolSponsor));
        return;
      }
    }

    // Fallback to direct paymaster transfer
    payable(paymasters[0]).transfer(gasCost);
  }

  function setGasPoolSponsor(address _gasPoolSponsor) external onlyOwner {
    gasPoolSponsor = GasPoolSponsor(_gasPoolSponsor);
    emit GasPoolUpdated(_gasPoolSponsor);
  }

  function setMinPoolBalance(uint256 _minBalance) external onlyOwner {
    minPoolBalance = _minBalance;
  }

  function executeMetaTransaction(
    address from,
    address to,
    uint256 value,
    bytes calldata data,
    uint256 deadline,
    bytes calldata signature
  ) external nonReentrant returns (bool success, bytes memory returnData) {
    require(authorizedExecutors[msg.sender], \"Not authorized executor\");
    require(block.timestamp <= deadline, \"Transaction expired\");
    
    uint256 currentNonce = nonces[from];
    
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
    require(signer == from, \"Invalid signature\");
    
    require(!executedTransactions[digest], \"Already executed\");
    executedTransactions[digest] = true;
    
    nonces[from] = currentNonce + 1;
    
    (success, returnData) = to.call{value: value}(data);
    
    emit MetaTransactionExecuted(from, to, value, data, currentNonce, success);
  }

  function commitSubmarine(bytes32 commitment, uint256 revealDeadline) external {
    require(revealDeadline > block.timestamp, \"Invalid deadline\");
    require(submarineCommits[commitment] == 0, \"Already committed\");
    
    submarineCommits[commitment] = revealDeadline;
    
    emit SubmarineCommitted(commitment, msg.sender, revealDeadline);
  }

  function revealAndExecuteSubmarine(
    address from,
    address to,
    uint256 value,
    bytes calldata data,
    bytes32 salt,
    bytes calldata signature
  ) external nonReentrant returns (bool success, bytes memory returnData) {
    bytes32 commitment = keccak256(abi.encodePacked(from, to, value, keccak256(data), salt));
    
    uint256 revealDeadline = submarineCommits[commitment];
    require(revealDeadline != 0, \"Commitment not found\");
    require(block.timestamp <= revealDeadline, \"Reveal deadline passed\");
    
    uint256 currentNonce = nonces[from];
    bytes32 structHash = keccak256(abi.encode(
      SUBMARINE_COMMIT_TYPEHASH,
      commitment,
      currentNonce,
      revealDeadline
    ));
    
    bytes32 digest = _hashTypedDataV4(structHash);
    address signer = ECDSA.recover(digest, signature);
    require(signer == from, \"Invalid signature\");
    
    delete submarineCommits[commitment];
    nonces[from] = currentNonce + 1;
    
    (success, returnData) = to.call{value: value}(data);
    
    emit SubmarineRevealed(commitment, from, to, value, success);
  }

  function setAuthorizedExecutor(address executor, bool authorized) external onlyOwner {
    authorizedExecutors[executor] = authorized;
    emit ExecutorAuthorized(executor, authorized);
  }

  function updateGasSponsor(address newSponsor) external onlyOwner {
    address oldSponsor = gasSponsor;
    gasSponsor = newSponsor;
    emit GasSponsorUpdated(oldSponsor, newSponsor);
  }

  function withdrawETH(uint256 amount) external onlyOwner {
    payable(owner()).transfer(amount);
  }

  function withdrawToken(address token, uint256 amount) external onlyOwner {
    IERC20(token).safeTransfer(owner(), amount);
  }

  function getNonce(address account) external view returns (uint256) {
    return nonces[account];
  }

  function isCommitmentValid(bytes32 commitment) external view returns (bool) {
    uint256 deadline = submarineCommits[commitment];
    return deadline != 0 && block.timestamp <= deadline;
  }

  receive() external payable {}
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

