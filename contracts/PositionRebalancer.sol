// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from "@aave/v3-core/contracts/interfaces/IPool.sol";
import {IPoolAddressesProvider} from "@aave/v3-core/contracts/interfaces/IPoolAddressesProvider.sol";
import {IFlashLoanSimpleReceiver} from "@aave/v3-core/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PositionRebalancer
 * @notice Rebalances leveraged positions across lending protocols using flash loans
 * @dev Supports Aave V3 for flash loans and position management
 */
contract PositionRebalancer is IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    address public owner;

    // Action types for rebalancing
    uint8 public constant ACTION_DEPOSIT = 1;
    uint8 public constant ACTION_WITHDRAW = 2;
    uint8 public constant ACTION_BORROW = 3;
    uint8 public constant ACTION_REPAY = 4;

    struct RebalanceAction {
        uint8 actionType;
        address asset;
        uint256 amount;
        uint256 interestRateMode; // 1 = Stable, 2 = Variable
    }

    // Events
    event PositionRebalanced(
        address indexed user,
        address indexed asset,
        uint256 flashLoanAmount,
        uint256 actionsExecuted
    );

    event ActionExecuted(
        uint8 actionType,
        address asset,
        uint256 amount,
        bool success
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _addressProvider) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(_addressProvider);
        POOL = IPool(IPoolAddressesProvider(_addressProvider).getPool());
        owner = msg.sender;
    }

    /**
     * @notice Initiates a flash loan rebalancing operation
     * @param asset The asset to flash loan
     * @param amount The flash loan amount
     * @param actions Encoded rebalancing actions
     */
    function rebalanceWithFlashLoan(
        address asset,
        uint256 amount,
        RebalanceAction[] calldata actions
    ) external {
        bytes memory params = abi.encode(msg.sender, actions);
        
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0
        );
    }

    /**
     * @notice Callback from Aave flash loan
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Caller must be pool");
        require(initiator == address(this), "Initiator must be this contract");

        (address user, RebalanceAction[] memory actions) = abi.decode(
            params,
            (address, RebalanceAction[])
        );

        // Execute all rebalancing actions
        uint256 actionsExecuted = 0;
        for (uint256 i = 0; i < actions.length; i++) {
            bool success = _executeAction(actions[i], user);
            if (success) actionsExecuted++;
        }

        // Repay flash loan
        uint256 amountOwed = amount + premium;
        IERC20(asset).safeApprove(address(POOL), amountOwed);

        emit PositionRebalanced(user, asset, amount, actionsExecuted);

        return true;
    }

    /**
     * @notice Executes a single rebalancing action
     */
    function _executeAction(
        RebalanceAction memory action,
        address user
    ) internal returns (bool success) {
        try this._executeActionInternal(action, user) {
            success = true;
        } catch {
            success = false;
        }

        emit ActionExecuted(action.actionType, action.asset, action.amount, success);
    }

    /**
     * @notice Internal action execution (external for try/catch)
     */
    function _executeActionInternal(
        RebalanceAction memory action,
        address user
    ) external {
        require(msg.sender == address(this), "Only internal");

        if (action.actionType == ACTION_DEPOSIT) {
            IERC20(action.asset).safeApprove(address(POOL), action.amount);
            POOL.supply(action.asset, action.amount, user, 0);
        } 
        else if (action.actionType == ACTION_WITHDRAW) {
            POOL.withdraw(action.asset, action.amount, user);
        }
        else if (action.actionType == ACTION_BORROW) {
            POOL.borrow(action.asset, action.amount, action.interestRateMode, 0, user);
        }
        else if (action.actionType == ACTION_REPAY) {
            IERC20(action.asset).safeApprove(address(POOL), action.amount);
            POOL.repay(action.asset, action.amount, action.interestRateMode, user);
        }
    }

    /**
     * @notice Calculates the health factor after proposed rebalancing
     * @param user The user address
     * @return healthFactor The calculated health factor (18 decimals)
     */
    function calculateHealthFactor(address user) external view returns (uint256) {
        (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            ,
            uint256 currentLiquidationThreshold,
            ,
        ) = POOL.getUserAccountData(user);

        if (totalDebtBase == 0) {
            return type(uint256).max;
        }

        return (totalCollateralBase * currentLiquidationThreshold) / totalDebtBase / 100;
    }

    /**
     * @notice Gets user account data from Aave
     */
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        return POOL.getUserAccountData(user);
    }

    /**
     * @notice Emergency withdrawal
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner, balance);
        }
    }

    /**
     * @notice Required by IFlashLoanSimpleReceiver interface
     */
    function ADDRESSES_PROVIDER_IMPL() external view returns (IPoolAddressesProvider) {
        return ADDRESSES_PROVIDER;
    }

    /**
     * @notice Required by IFlashLoanSimpleReceiver interface
     */
    function POOL_IMPL() external view returns (IPool) {
        return POOL;
    }

    receive() external payable {}
}
