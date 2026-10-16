// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IFlashLoanSimpleReceiver} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
contract PositionRebalancer is IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;
    address public owner;
    uint8 public constant ACTION_DEPOSIT = 1;
    uint8 public constant ACTION_WITHDRAW = 2;
    uint8 public constant ACTION_BORROW = 3;
    uint8 public constant ACTION_REPAY = 4;
    struct RebalanceAction { uint8 actionType; address asset; uint256 amount; uint256 interestRateMode; }
    event PositionRebalanced(address indexed user, address indexed asset, uint256 flashLoanAmount, uint256 actionsExecuted);
    event ActionExecuted(uint8 actionType, address asset, uint256 amount, bool success);
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    constructor(address _addressProvider) { ADDRESSES_PROVIDER = IPoolAddressesProvider(_addressProvider); POOL = IPool(IPoolAddressesProvider(_addressProvider).getPool()); owner = msg.sender; }
    function rebalanceWithFlashLoan(address asset, uint256 amount, RebalanceAction[] calldata actions) external { POOL.flashLoanSimple(address(this), asset, amount, abi.encode(msg.sender, actions), 0); }
    function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes calldata params) external override returns (bool) {
        require(msg.sender == address(POOL), "Caller must be pool"); require(initiator == address(this), "Initiator must be this contract");
        (address user, RebalanceAction[] memory actions) = abi.decode(params, (address, RebalanceAction[]));
        uint256 n; for (uint256 i=0;i<actions.length;i++) if (_executeAction(actions[i], user)) n++;
        IERC20(asset).forceApprove(address(POOL), amount + premium); emit PositionRebalanced(user, asset, amount, n); return true;
    }
    function _executeAction(RebalanceAction memory a, address user) internal returns (bool s) { try this._executeActionInternal(a, user) { s=true; } catch { s=false; } emit ActionExecuted(a.actionType, a.asset, a.amount, s); }
    function _executeActionInternal(RebalanceAction memory a, address user) external {
        require(msg.sender == address(this), "Only internal");
        if (a.actionType==ACTION_DEPOSIT) { IERC20(a.asset).forceApprove(address(POOL), a.amount); POOL.supply(a.asset, a.amount, user, 0); }
        else if (a.actionType==ACTION_WITHDRAW) POOL.withdraw(a.asset, a.amount, user);
        else if (a.actionType==ACTION_BORROW) POOL.borrow(a.asset, a.amount, a.interestRateMode, 0, user);
        else if (a.actionType==ACTION_REPAY) { IERC20(a.asset).forceApprove(address(POOL), a.amount); POOL.repay(a.asset, a.amount, a.interestRateMode, user); }
    }
    function calculateHealthFactor(address user) external view returns (uint256) { (uint256 c, uint256 d,, uint256 lt,,) = POOL.getUserAccountData(user); if (d==0) return type(uint256).max; return (c*lt)/d/100; }
    function getUserAccountData(address user) external view returns (uint256,uint256,uint256,uint256,uint256,uint256) { return POOL.getUserAccountData(user); }
    function emergencyWithdraw(address token) external onlyOwner { uint256 b=IERC20(token).balanceOf(address(this)); if(b>0) IERC20(token).safeTransfer(owner,b); }
    function ADDRESSES_PROVIDER_IMPL() external view returns (IPoolAddressesProvider) { return ADDRESSES_PROVIDER; }
    function POOL_IMPL() external view returns (IPool) { return POOL; }
    receive() external payable {}
}
