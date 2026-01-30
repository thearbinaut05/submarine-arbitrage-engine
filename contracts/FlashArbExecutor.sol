// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IFlashLoanSimpleReceiver} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title FlashArbExecutor
 * @notice Executes flash loan arbitrage between DEXes with upgradeable proxy support
 * @dev Implements Aave V3 flash loan receiver interface and UUPS upgradeability
 * @dev Supports gasless meta-transactions and auto-profit distribution to user wallets
 */
contract FlashArbExecutor is IFlashLoanSimpleReceiver, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    
    address public uniswapV3Router;
    address public sushiswapRouter;
    
    mapping(address => bool) public authorizedRelayers;
    bool public paused;
    
    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 premium,
        uint256 profit,
        address indexed initiator,
        address indexed profitRecipient
    );
    
    event ArbitrageProfit(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        address indexed recipient
    );
    
    event RelayerAuthorized(address indexed relayer, bool authorized);
    event PausedChanged(bool paused);

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
        paused = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner nonReentrant {
        require(!paused, "Contract is paused");
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0
        );
    }

    function executeFlashLoanGasless(
        address asset,
        uint256 amount,
        bytes calldata params,
        address profitRecipient
    ) external nonReentrant {
        require(!paused, "Contract is paused");
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        require(profitRecipient != address(0), "Invalid profit recipient");

        bytes memory extendedParams = abi.encode(
            abi.decode(params, (address, address, address, uint256, bytes, bytes)),
            profitRecipient
        );

        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            extendedParams,
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Caller must be pool");
        require(initiator == address(this), "Initiator must be this contract");

        address tokenOut;
        address sourceDex;
        address targetDex;
        uint256 minAmountOut;
        bytes memory swapDataSource;
        bytes memory swapDataTarget;
        address profitRecipient;

        try abi.decode(params, (address, address, address, uint256, bytes, bytes, address)) returns (
            address _tokenOut,
            address _sourceDex,
            address _targetDex,
            uint256 _minAmountOut,
            bytes memory _swapDataSource,
            bytes memory _swapDataTarget,
            address _profitRecipient
        ) {
            tokenOut = _tokenOut;
            sourceDex = _sourceDex;
            targetDex = _targetDex;
            minAmountOut = _minAmountOut;
            swapDataSource = _swapDataSource;
            swapDataTarget = _swapDataTarget;
            profitRecipient = _profitRecipient;
        } catch {
            (tokenOut, sourceDex, targetDex, minAmountOut, swapDataSource, swapDataTarget) = abi.decode(
                params, (address, address, address, uint256, bytes, bytes)
            );
            profitRecipient = initiator;
        }

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

        uint256 amountOwed = amount + premium;
        IERC20(asset).safeApprove(address(POOL), amountOwed);

        if (profit > 0 && profitRecipient != address(this)) {
            IERC20(asset).safeTransfer(profitRecipient, profit);
        }

        emit FlashLoanExecuted(asset, amount, premium, profit, initiator, profitRecipient);

        return true;
    }

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

        IERC20(tokenIn).safeApprove(sourceDex, amountIn);
        (bool success1, ) = sourceDex.call(swapDataSource);
        require(success1, "Source swap failed");

        uint256 intermediateAmount = IERC20(tokenOut).balanceOf(address(this));
        require(intermediateAmount >= minAmountOut, "Insufficient output");

        IERC20(tokenOut).safeApprove(targetDex, intermediateAmount);
        (bool success2, ) = targetDex.call(swapDataTarget);
        require(success2, "Target swap failed");

        uint256 balanceAfter = IERC20(tokenIn).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");

        profit = balanceAfter - balanceBefore;

        emit ArbitrageProfit(tokenIn, tokenOut, amountIn, intermediateAmount, profit, msg.sender);
    }

    function withdrawProfit(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    function emergencyWithdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    function setAuthorizedRelayer(address relayer, bool authorized) external onlyOwner {
        authorizedRelayers[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedChanged(_paused);
    }

    function updateRouters(
        address _uniswapV3Router,
        address _sushiswapRouter
    ) external onlyOwner {
        uniswapV3Router = _uniswapV3Router;
        sushiswapRouter = _sushiswapRouter;
    }

    function ADDRESSES_PROVIDER_IMPL() external view returns (IPoolAddressesProvider) {
        return ADDRESSES_PROVIDER;
    }

    function POOL_IMPL() external view returns (IPool) {
        return POOL;
    }

    receive() external payable {}
}

