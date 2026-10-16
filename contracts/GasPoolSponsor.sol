// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
contract GasPoolSponsor is OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }
    address public gaslessRelayer;
    address[3] public paymasters;
    struct DepositInfo { uint256 amount; string sponsorType; address depositor; uint256 timestamp; }
    DepositInfo[] public deposits;
    mapping(address => uint256) public depositorShares;
    event GasDeposited(address indexed depositor, uint256 amount, string sponsorType);
    event GasWithdrawn(address indexed to, uint256 amount);
    event PaymasterApproved(address indexed paymaster, uint256 amount);
    modifier onlyRelayer() { require(msg.sender == gaslessRelayer, "Only GaslessRelayer"); _; }
    function initialize(address _gaslessRelayer, address[3] memory _paymasters) external initializer {
        __Ownable_init(msg.sender); __UUPSUpgradeable_init(); __ReentrancyGuard_init();
        gaslessRelayer = _gaslessRelayer; paymasters = _paymasters;
    }
    function _authorizeUpgrade(address) internal override onlyOwner {}
    function depositGas(string calldata sponsorType) external payable nonReentrant {
        require(msg.value > 0, "Must deposit >0");
        deposits.push(DepositInfo(msg.value, sponsorType, msg.sender, block.timestamp));
        depositorShares[msg.sender] += msg.value;
        for (uint i = 0; i < 3; i++) if (paymasters[i] != address(0)) emit PaymasterApproved(paymasters[i], msg.value);
        emit GasDeposited(msg.sender, msg.value, sponsorType);
    }
    function claimGasForUserOp(uint256 gasLimit, uint256 gasPrice) external onlyRelayer nonReentrant returns (uint256 sponsored) {
        uint256 cost = gasLimit * gasPrice; require(address(this).balance >= cost, "Pool insufficient");
        sponsored = cost; payable(gaslessRelayer).transfer(sponsored);
    }
    function withdrawExcess(uint256 amount) external onlyOwner nonReentrant { payable(owner()).transfer(amount); }
    function getPoolBalance() external view returns (uint256) { return address(this).balance; }
    function getDepositorShare(address d) external view returns (uint256) { uint256 t; for (uint i=0;i<deposits.length;i++) t+=deposits[i].amount; return t>0 ? depositorShares[d]*1e18/t : 0; }
    function GASLESS_RELAYER() external view returns (address) { return gaslessRelayer; }
    receive() external payable { depositGas("direct_deposit"); }
}
