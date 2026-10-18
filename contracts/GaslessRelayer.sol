// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {IEntryPoint} from "./interfaces/IPaymasters.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./GasPoolSponsor.sol";
/// @notice Meta-tx / submarine-commit helper. NOT an ERC-4337 paymaster (no EntryPoint deposit/stake); validate/postOp kept for interface compatibility only.
contract GaslessRelayer is OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, EIP712Upgradeable {
  address public constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
  address[3] public paymasters = [address(0), address(0), address(0)]; // DISABLED: no third-party paymasters
  GasPoolSponsor public gasPoolSponsor; uint256 public minPoolBalance = 0.01 ether;
  using SafeERC20 for IERC20; using ECDSA for bytes32;
  bytes32 public constant META_TRANSACTION_TYPEHASH = keccak256("MetaTransaction(address from,address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)");
  bytes32 public constant SUBMARINE_COMMIT_TYPEHASH = keccak256("SubmarineCommit(bytes32 commitment,uint256 nonce,uint256 deadline)");
  address public gasSponsor; mapping(address=>uint256) public nonces; mapping(bytes32=>uint256) public submarineCommits; mapping(bytes32=>bool) public executedTransactions; mapping(address=>bool) public authorizedExecutors;
  event MetaTransactionExecuted(address indexed from, address indexed to, uint256 value, bytes data, uint256 nonce, bool success);
  event SubmarineCommitted(bytes32 indexed commitment, address indexed sender, uint256 revealDeadline);
  event SubmarineRevealed(bytes32 indexed commitment, address indexed from, address indexed to, uint256 value, bool success);
  event GasSponsorUpdated(address indexed o, address indexed n); event ExecutorAuthorized(address indexed e, bool a); event GasPoolUpdated(address indexed p);
  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() { _disableInitializers(); }
  function initialize(address _s, address _p) public initializer { __Ownable_init(msg.sender); __ReentrancyGuard_init(); __UUPSUpgradeable_init(); __EIP712_init("FlashArb Relayer","2"); gasSponsor=_s; gasPoolSponsor=GasPoolSponsor(_p); }
  function _authorizeUpgrade(address) internal override onlyOwner {}
  function validatePaymasterUserOp(IEntryPoint.UserOperation calldata u, bytes32, uint256) external view returns (bytes memory, uint256) { require(msg.sender==ENTRY_POINT,"Only EntryPoint"); require(authorizedExecutors[u.sender],"Unauthorized sender"); if(address(gasPoolSponsor)!=address(0)){ (,bytes memory b)=address(gasPoolSponsor).staticcall(abi.encodeWithSignature("getPoolBalance()")); require(abi.decode(b,(uint256))>=minPoolBalance,"Gas pool insufficient"); } return ("",0); }
  function postOp(IEntryPoint.UserOperation calldata, bytes calldata, uint256 c) external { require(msg.sender==ENTRY_POINT,"Only EntryPoint"); uint256 cost=c*tx.gasprice; if(address(gasPoolSponsor)!=address(0)){ (bool ok,)=address(gasPoolSponsor).call(abi.encodeWithSignature("claimGasForUserOp(uint256,uint256)",c,tx.gasprice)); if(ok){emit GasPoolUpdated(address(gasPoolSponsor)); return;} } payable(paymasters[0]).transfer(cost); }
  function setGasPoolSponsor(address p) external onlyOwner { gasPoolSponsor=GasPoolSponsor(p); emit GasPoolUpdated(p); }
  function setMinPoolBalance(uint256 b) external onlyOwner { minPoolBalance=b; }
  function executeMetaTransaction(address from,address to,uint256 value,bytes calldata data,uint256 deadline,bytes calldata sig) external nonReentrant returns (bool s, bytes memory r) { require(authorizedExecutors[msg.sender],"Not authorized executor"); require(block.timestamp<=deadline,"Expired"); uint256 n=nonces[from]; bytes32 h=keccak256(abi.encode(META_TRANSACTION_TYPEHASH,from,to,value,keccak256(data),n,deadline)); bytes32 d=_hashTypedDataV4(h); require(ECDSA.recover(d,sig)==from,"Invalid signature"); require(!executedTransactions[d],"Already executed"); executedTransactions[d]=true; nonces[from]=n+1; (s,r)=to.call{value:value}(data); emit MetaTransactionExecuted(from,to,value,data,n,s); }
  function commitSubmarine(bytes32 c, uint256 dl) external { require(dl>block.timestamp,"Invalid deadline"); require(submarineCommits[c]==0,"Already committed"); submarineCommits[c]=dl; emit SubmarineCommitted(c,msg.sender,dl); }
  function revealAndExecuteSubmarine(address from,address to,uint256 value,bytes calldata data,bytes32 salt,bytes calldata sig) external nonReentrant returns (bool s, bytes memory r) { bytes32 c=keccak256(abi.encodePacked(from,to,value,keccak256(data),salt)); uint256 dl=submarineCommits[c]; require(dl!=0,"Commitment not found"); require(block.timestamp<=dl,"Deadline passed"); uint256 n=nonces[from]; bytes32 h=keccak256(abi.encode(SUBMARINE_COMMIT_TYPEHASH,c,n,dl)); bytes32 d=_hashTypedDataV4(h); require(ECDSA.recover(d,sig)==from,"Invalid signature"); delete submarineCommits[c]; nonces[from]=n+1; (s,r)=to.call{value:value}(data); emit SubmarineRevealed(c,from,to,value,s); }
  function setAuthorizedExecutor(address e,bool a) external onlyOwner { authorizedExecutors[e]=a; emit ExecutorAuthorized(e,a); }
  function setAuthorizedRelayer(address e,bool a) external onlyOwner { authorizedExecutors[e]=a; emit ExecutorAuthorized(e,a); }
  function updateGasSponsor(address n) external onlyOwner { emit GasSponsorUpdated(gasSponsor,n); gasSponsor=n; }
  function withdrawETH(uint256 a) external onlyOwner { payable(owner()).transfer(a); }
  function withdrawToken(address t,uint256 a) external onlyOwner { IERC20(t).safeTransfer(owner(),a); }
  function getNonce(address a) external view returns (uint256) { return nonces[a]; }
  function isCommitmentValid(bytes32 c) external view returns (bool) { uint256 d=submarineCommits[c]; return d!=0 && block.timestamp<=d; }
  receive() external payable {}
}
