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
 * @notice Aave V3 flash-loan arbitrage executor (UUPS proxy).
 * @dev Funding: Aave flash loan only. Canonical params encoding (do NOT nest-encode):
 *      abi.encode(tokenOut, sourceDex, targetDex, minAmountOut, swapDataSource, swapDataTarget, profitRecipient)
 *      Owner path also accepts the 6-field form without profitRecipient (defaults to owner).
 *      Swap calldata is executed verbatim; sourceDex/targetDex MUST be allowlisted routers.
 */
contract FlashArbExecutor is IFlashLoanSimpleReceiver, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    address public uniswapV3Router;
    address public sushiswapRouter;
    mapping(address => bool) public authorizedRelayers;
    mapping(address => bool) public allowedSwapTargets;
    bool public paused;

    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit, address indexed initiator, address indexed profitRecipient);
    event ArbitrageProfit(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, address indexed recipient);
    event RelayerAuthorized(address indexed relayer, bool authorized);
    event SwapTargetAllowed(address indexed target, bool allowed);
    event PausedChanged(bool paused);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _addressProvider, address _uniswapV3Router, address _sushiswapRouter) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(_addressProvider);
        POOL = IPool(IPoolAddressesProvider(_addressProvider).getPool());
        _disableInitializers();
    }

    function initialize(address _uniswapV3Router, address _sushiswapRouter) public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        uniswapV3Router = _uniswapV3Router;
        sushiswapRouter = _sushiswapRouter;
        if (_uniswapV3Router != address(0)) allowedSwapTargets[_uniswapV3Router] = true;
        if (_sushiswapRouter != address(0)) allowedSwapTargets[_sushiswapRouter] = true;
        paused = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external onlyOwner nonReentrant {
        require(!paused, "Contract is paused");
        require(asset != address(0) && amount > 0, "Invalid loan");
        POOL.flashLoanSimple(address(this), asset, amount, params, 0);
    }

    function executeFlashLoanGasless(address asset, uint256 amount, bytes calldata params, address profitRecipient) external nonReentrant {
        require(!paused, "Contract is paused");
        require(authorizedRelayers[msg.sender], "Not authorized relayer");
        require(asset != address(0) && amount > 0, "Invalid loan");
        require(profitRecipient != address(0), "Invalid profit recipient");
        (,,,,,, address encodedRecipient) = abi.decode(params, (address, address, address, uint256, bytes, bytes, address));
        require(encodedRecipient == profitRecipient, "Recipient mismatch");
        POOL.flashLoanSimple(address(this), asset, amount, params, 0);
    }

    function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes calldata params) external override returns (bool) {
        require(msg.sender == address(POOL), "Caller must be pool");
        require(initiator == address(this), "Initiator must be this contract");
        address tokenOut; address sourceDex; address targetDex; uint256 minAmountOut;
        bytes memory swapDataSource; bytes memory swapDataTarget; address profitRecipient;
        try abi.decode(params, (address, address, address, uint256, bytes, bytes, address)) returns (address a, address b, address c, uint256 d, bytes memory e, bytes memory f, address g) {
            tokenOut = a; sourceDex = b; targetDex = c; minAmountOut = d; swapDataSource = e; swapDataTarget = f; profitRecipient = g;
        } catch {
            (tokenOut, sourceDex, targetDex, minAmountOut, swapDataSource, swapDataTarget) = abi.decode(params, (address, address, address, uint256, bytes, bytes));
            profitRecipient = owner();
        }
        require(tokenOut != address(0) && tokenOut != asset, "Invalid tokenOut");
        require(allowedSwapTargets[sourceDex], "Source DEX not allowlisted");
        require(allowedSwapTargets[targetDex], "Target DEX not allowlisted");
        require(minAmountOut > 0, "minAmountOut required");
        require(swapDataSource.length >= 4 && swapDataTarget.length >= 4, "Invalid swap calldata");
        require(profitRecipient != address(0), "Invalid profit recipient");
        uint256 amountOwed = amount + premium;
        uint256 intermediate = _executeArbitrage(asset, tokenOut, amount, sourceDex, targetDex, minAmountOut, swapDataSource, swapDataTarget);
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        require(balanceAfter >= amountOwed, "Cannot repay flash loan");
        uint256 profit = balanceAfter - amountOwed;
        require(profit > 0, "No profit after premium");
        IERC20(asset).forceApprove(address(POOL), amountOwed);
        if (profitRecipient != address(this)) IERC20(asset).safeTransfer(profitRecipient, profit);
        emit ArbitrageProfit(asset, tokenOut, amount, intermediate, profit, profitRecipient);
        emit FlashLoanExecuted(asset, amount, premium, profit, initiator, profitRecipient);
        return true;
    }

    function _executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn, address sourceDex, address targetDex, uint256 minAmountOut, bytes memory swapDataSource, bytes memory swapDataTarget) internal returns (uint256 intermediateAmount) {
        IERC20(tokenIn).forceApprove(sourceDex, amountIn);
        (bool s1, bytes memory r1) = sourceDex.call(swapDataSource);
        if (!s1) { assembly { revert(add(r1, 32), mload(r1)) } }
        intermediateAmount = IERC20(tokenOut).balanceOf(address(this));
        require(intermediateAmount >= minAmountOut, "Insufficient output");
        IERC20(tokenOut).forceApprove(targetDex, intermediateAmount);
        (bool s2, bytes memory r2) = targetDex.call(swapDataTarget);
        if (!s2) { assembly { revert(add(r2, 32), mload(r2)) } }
    }

    function withdrawProfit(address token, uint256 amount) external onlyOwner { IERC20(token).safeTransfer(owner(), amount); }
    function emergencyWithdraw(address token) external onlyOwner { uint256 b = IERC20(token).balanceOf(address(this)); if (b > 0) IERC20(token).safeTransfer(owner(), b); }
    function setAuthorizedRelayer(address relayer, bool authorized) external onlyOwner { authorizedRelayers[relayer] = authorized; emit RelayerAuthorized(relayer, authorized); }
    function setAllowedSwapTarget(address target, bool allowed) external onlyOwner { require(target != address(0), "Zero target"); allowedSwapTargets[target] = allowed; emit SwapTargetAllowed(target, allowed); }
    function setPaused(bool _paused) external onlyOwner { paused = _paused; emit PausedChanged(_paused); }
    function updateRouters(address _uniswapV3Router, address _sushiswapRouter) external onlyOwner {
        uniswapV3Router = _uniswapV3Router; sushiswapRouter = _sushiswapRouter;
        if (_uniswapV3Router != address(0)) allowedSwapTargets[_uniswapV3Router] = true;
        if (_sushiswapRouter != address(0)) allowedSwapTargets[_sushiswapRouter] = true;
    }
    function ADDRESSES_PROVIDER_IMPL() external view returns (IPoolAddressesProvider) { return ADDRESSES_PROVIDER; }
    function POOL_IMPL() external view returns (IPool) { return POOL; }
    receive() external payable {}
}
