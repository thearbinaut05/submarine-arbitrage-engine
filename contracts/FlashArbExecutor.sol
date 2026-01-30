// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from "@aave/v3-core/contracts/interfaces/IPoolAddressesProvider.sol";
import {IPool} from "@aave/v3-core/contracts/interfaces/IPool.sol";
import {IFlashLoanSimpleReceiver} from "@aave/v3-core/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title FlashArbExecutor
 * @notice Executes flash loan arbitrage between DEXes with upgradeable proxy support
 * @dev Implements Aave V3 flash loan receiver interface and UUPS upgradeability
 */
contract FlashArbExecutor is IFlashLoanSimpleReceiver, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    
    // DEX Router interfaces
    address public uniswapV3Router;
    address public sushiswapRouter;
    
    // Events
    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 premium,
        uint256 profit,
        address indexed initiator
    );
    
    event ArbitrageProfit(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _addressProvider,
        address _uniswapV3Router,
        address _sushiswapRouter
    ) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(_addressProvider);
        POOL = IPool(IPoolAddressesProvider(_addressProvider).getPool());
        _disableInitializers();
    }

    function initialize(
        address _uniswapV3Router,
        address _sushiswapRouter
    ) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        
        uniswapV3Router = _uniswapV3Router;
        sushiswapRouter = _sushiswapRouter;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Initiates a flash loan for arbitrage
     * @param asset The address of the asset to borrow
     * @param amount The amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner nonReentrant {
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referralCode
        );
    }

    /**
     * @notice Callback function called by Aave after receiving flash loan
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

        // Decode arbitrage parameters
        (
            address tokenOut,
            address sourceDex,
            address targetDex,
            uint256 minAmountOut,
            bytes memory swapDataSource,
            bytes memory swapDataTarget
        ) = abi.decode(params, (address, address, address, uint256, bytes, bytes));

        // Execute arbitrage
        uint256 profit = _executeArbitrage(
            asset,
            tokenOut,
            amount,
            sourceDex,
            targetDex,
            minAmountOut,
            swapDataSource,
            swapDataTarget
        );

        // Repay flash loan
        uint256 amountOwed = amount + premium;
        IERC20(asset).safeApprove(address(POOL), amountOwed);

        emit FlashLoanExecuted(asset, amount, premium, profit, initiator);

        return true;
    }

    /**
     * @notice Executes the arbitrage trade between two DEXes
     */
    function _executeArbitrage(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address sourceDex,
        address targetDex,
        uint256 minAmountOut,
        bytes memory swapDataSource,
        bytes memory swapDataTarget
    ) internal returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));

        // Step 1: Swap tokenIn -> tokenOut on source DEX
        IERC20(tokenIn).safeApprove(sourceDex, amountIn);
        (bool success1, ) = sourceDex.call(swapDataSource);
        require(success1, "Source swap failed");

        uint256 intermediateAmount = IERC20(tokenOut).balanceOf(address(this));
        require(intermediateAmount >= minAmountOut, "Insufficient output");

        // Step 2: Swap tokenOut -> tokenIn on target DEX
        IERC20(tokenOut).safeApprove(targetDex, intermediateAmount);
        (bool success2, ) = targetDex.call(swapDataTarget);
        require(success2, "Target swap failed");

        uint256 balanceAfter = IERC20(tokenIn).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");

        profit = balanceAfter - balanceBefore;

        emit ArbitrageProfit(tokenIn, tokenOut, amountIn, intermediateAmount, profit);
    }

    /**
     * @notice Withdraws accumulated profits
     */
    function withdrawProfit(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /**
     * @notice Emergency withdrawal
     */
    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    /**
     * @notice Updates DEX router addresses
     */
    function updateRouters(
        address _uniswapV3Router,
        address _sushiswapRouter
    ) external onlyOwner {
        uniswapV3Router = _uniswapV3Router;
        sushiswapRouter = _sushiswapRouter;
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

