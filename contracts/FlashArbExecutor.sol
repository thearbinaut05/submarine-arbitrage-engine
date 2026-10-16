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
interface ISwapRouterV3 { struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; } function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256); }
interface ISwapRouterV2 { function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory); }
/**
 * @title FlashArbExecutor
 * @notice Aave V3 flash-loan arbitrage. Funding = flash loan only.
 * @dev Canonical params (single encoding, structured swaps built on-chain):
 * abi.encode(tokenOut, sourceDex, targetDex, sourceKind, targetKind, sourceFee, targetFee, minIntermediate, profitRecipient)
 * kind: 1 = Uniswap-V3-style exactInputSingle, 2 = V2-style swapExactTokensForTokens. Fee ignored for V2.
 * Owner path also accepts profitRecipient omitted via the legacy overload executeFlashLoanTo (owner = recipient).
 */
contract FlashArbExecutor is IFlashLoanSimpleReceiver, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER; IPool public immutable POOL;
    address public uniswapV3Router; address public sushiswapRouter;
    mapping(address=>bool) public authorizedRelayers; mapping(address=>bool) public allowedSwapTargets; bool public paused;
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit, address indexed initiator, address indexed profitRecipient);
    event ArbitrageProfit(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 profit, address indexed recipient);
    event RelayerAuthorized(address indexed r, bool a); event SwapTargetAllowed(address indexed t, bool a); event PausedChanged(bool p);
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _p, address _u, address _s) { ADDRESSES_PROVIDER = IPoolAddressesProvider(_p); POOL = IPool(IPoolAddressesProvider(_p).getPool()); _disableInitializers(); }
    function initialize(address _u, address _s) public initializer { __Ownable_init(msg.sender); __ReentrancyGuard_init(); __UUPSUpgradeable_init(); uniswapV3Router=_u; sushiswapRouter=_s; if(_u!=address(0)) allowedSwapTargets[_u]=true; if(_s!=address(0)) allowedSwapTargets[_s]=true; paused=false; }
    function _authorizeUpgrade(address) internal override onlyOwner {}
    function executeFlashLoan(address asset, uint256 amount, bytes calldata params) external onlyOwner nonReentrant { require(!paused,"paused"); require(asset!=address(0)&&amount>0,"Invalid loan"); POOL.flashLoanSimple(address(this),asset,amount,params,0); }
    function executeFlashLoanGasless(address asset, uint256 amount, bytes calldata params, address profitRecipient) external nonReentrant {
        require(!paused,"paused"); require(authorizedRelayers[msg.sender],"Not authorized relayer"); require(asset!=address(0)&&amount>0,"Invalid loan"); require(profitRecipient!=address(0),"Invalid recipient");
        (,,,,,,,, address enc) = abi.decode(params,(address,address,address,uint8,uint8,uint24,uint24,uint256,address)); require(enc==profitRecipient,"Recipient mismatch");
        POOL.flashLoanSimple(address(this),asset,amount,params,0);
    }
    function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes calldata params) external override returns (bool) {
        require(msg.sender==address(POOL),"Caller must be pool"); require(initiator==address(this),"Initiator must be this");
        (address tokenOut,address src,address tgt,uint8 sk,uint8 tk,uint24 sf,uint24 tf,uint256 minInter,address recipient) = abi.decode(params,(address,address,address,uint8,uint8,uint24,uint24,uint256,address));
        require(tokenOut!=address(0)&&tokenOut!=asset,"Invalid tokenOut"); require(allowedSwapTargets[src],"Source not allowlisted"); require(allowedSwapTargets[tgt],"Target not allowlisted"); require(recipient!=address(0),"Invalid recipient"); require((sk==1||sk==2)&&(tk==1||tk==2),"Invalid swap kind");
        uint256 amountOwed=amount+premium;
        uint256 inter=_swap(src,sk,asset,tokenOut,amount,sf,minInter);
        require(inter>=minInter,"Insufficient output");
        _swap(tgt,tk,tokenOut,asset,inter,tf,amountOwed);
        uint256 bal=IERC20(asset).balanceOf(address(this)); require(bal>=amountOwed,"Cannot repay"); uint256 profit=bal-amountOwed; require(profit>0,"No profit");
        IERC20(asset).forceApprove(address(POOL),amountOwed); if(recipient!=address(this)) IERC20(asset).safeTransfer(recipient,profit);
        emit ArbitrageProfit(asset,tokenOut,amount,inter,profit,recipient); emit FlashLoanExecuted(asset,amount,premium,profit,initiator,recipient); return true;
    }
    function _swap(address router,uint8 kind,address tin,address tout,uint256 amt,uint24 fee,uint256 minOut) internal returns (uint256 out) {
        uint256 before=IERC20(tout).balanceOf(address(this)); IERC20(tin).forceApprove(router,amt);
        if(kind==1){ ISwapRouterV3.ExactInputSingleParams memory p=ISwapRouterV3.ExactInputSingleParams(tin,tout,fee==0?3000:fee,address(this),block.timestamp,amt,minOut,0); ISwapRouterV3(router).exactInputSingle(p); }
        else { address[] memory path=new address[](2); path[0]=tin; path[1]=tout; ISwapRouterV2(router).swapExactTokensForTokens(amt,minOut,path,address(this),block.timestamp); }
        out=IERC20(tout).balanceOf(address(this))-before;
    }
    function withdrawProfit(address t,uint256 a) external onlyOwner { IERC20(t).safeTransfer(owner(),a); }
    function emergencyWithdraw(address t) external onlyOwner { uint256 b=IERC20(t).balanceOf(address(this)); if(b>0) IERC20(t).safeTransfer(owner(),b); }
    function setAuthorizedRelayer(address r,bool a) external onlyOwner { authorizedRelayers[r]=a; emit RelayerAuthorized(r,a); }
    function setAllowedSwapTarget(address t,bool a) external onlyOwner { require(t!=address(0),"Zero"); allowedSwapTargets[t]=a; emit SwapTargetAllowed(t,a); }
    function setPaused(bool p) external onlyOwner { paused=p; emit PausedChanged(p); }
    function updateRouters(address u,address s) external onlyOwner { uniswapV3Router=u; sushiswapRouter=s; if(u!=address(0)) allowedSwapTargets[u]=true; if(s!=address(0)) allowedSwapTargets[s]=true; }
    function ADDRESSES_PROVIDER_IMPL() external view returns (IPoolAddressesProvider) { return ADDRESSES_PROVIDER; }
    function POOL_IMPL() external view returns (IPool) { return POOL; }
    receive() external payable {}
}
