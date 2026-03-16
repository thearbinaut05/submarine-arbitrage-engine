// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GasPoolSponsor
 * @notice Crowd-funded gas sponsorship pool for tap-to-earn app
 * @dev Deposits ETH, approves paymasters, tracks funding sources
 * @dev Integrates with GaslessRelayer for sponsored UserOps
 */
contract GasPoolSponsor is OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    address public immutable GASLESS_RELAYER;
    address[3] public paymasters;

    struct DepositInfo {
        uint256 amount;
        string sponsorType; // 'ad_revenue', 'tap_referral', 'manual'
        address depositor;
        uint256 timestamp;
    }

    DepositInfo[] public deposits;
    mapping(address => uint256) public depositorShares;

    event GasDeposited(address indexed depositor, uint256 amount, string sponsorType);
    event GasWithdrawn(address indexed to, uint256 amount);
    event PaymasterApproved(address indexed paymaster, uint256 amount);

    modifier onlyRelayer() {
        require(msg.sender == GASLESS_RELAYER, "Only GaslessRelayer");
        _;
    }

    function initialize(address _gaslessRelayer, address[3] memory _paymasters) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        GASLESS_RELAYER = _gaslessRelayer;
        paymasters = _paymasters;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /// @notice Deposit ETH to sponsor gas pool (from ad revenue/taps)
    function depositGas(string calldata sponsorType) external payable nonReentrant {
        require(msg.value > 0, "Must deposit >0");
        
        deposits.push(DepositInfo({
            amount: msg.value,
            sponsorType: sponsorType,
            depositor: msg.sender,
            timestamp: block.timestamp
        }));

        depositorShares[msg.sender] += msg.value;

        // Auto-approve paymasters
        for (uint i = 0; i < 3; i++) {
            if (paymasters[i] != address(0)) {
                // ETH paymaster approval via relayer call
                emit PaymasterApproved(paymasters[i], msg.value);
            }
        }

        emit GasDeposited(msg.sender, msg.value, sponsorType);
    }

    /// @notice Relayer claims gas sponsorship for UserOp
    function claimGasForUserOp(uint256 gasLimit, uint256 gasPrice) external onlyRelayer nonReentrant returns (uint256 sponsored) {
        uint256 cost = gasLimit * gasPrice;
        require(address(this).balance >= cost, "Pool insufficient");

        sponsored = cost;
        payable(GASLESS_RELAYER).transfer(sponsored);
    }

    /// @notice Owner withdraw excess (after relayer fee)
    function withdrawExcess(uint256 amount) external onlyOwner nonReentrant {
        payable(owner()).transfer(amount);
    }

    /// @notice Get pool balance
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Get depositor share %
    function getDepositorShare(address depositor) external view returns (uint256 shareWei) {
        uint256 totalDeposited;
        for (uint i = 0; i < deposits.length; i++) {
            totalDeposited += deposits[i].amount;
        }
        shareWei = totalDeposited > 0 ? (depositorShares[depositor] * 1e18 / totalDeposited) : 0;
    }

    receive() external payable {
        depositGas("direct_deposit");
    }
}

