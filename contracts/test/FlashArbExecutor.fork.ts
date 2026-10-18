import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

// Gasless FlashArbExecutor fork test - runs ONLY when RUN_FORK_TESTS=1 and a fork RPC is configured.
// Verifies: (1) unauthorised caller cannot call executeFlashLoanGasless,
// (2) profitRecipient mismatch reverts, (3) authorised service relayer path is the only gasless entry.
// It does NOT execute a live mainnet trade; on a fork it only checks access control + revert behaviour
// with a tiny amount and expects a revert when no profitable route is supplied (safe).
describe("FlashArbExecutor gasless (fork)", function () {
  it("enforces authorised relayer + recipient check", async function () {
    if (process.env.RUN_FORK_TESTS !== "1") this.skip();
    const [owner, serviceRelayer, user] = await ethers.getSigners();
    const aaveProvider = process.env.AAVE_POOL_ADDRESSES_PROVIDER;
    const uniRouter = process.env.UNISWAP_V3_ROUTER;
    if (!aaveProvider || !uniRouter) this.skip();
    const Executor = await ethers.getContractFactory("FlashArbExecutor");
    const executor: any = await upgrades.deployProxy(Executor, [uniRouter, ethers.ZeroAddress], {
      kind: "uups", initializer: "initialize", constructorArgs: [aaveProvider, uniRouter, ethers.ZeroAddress],
    });
    await executor.waitForDeployment();
    const USDC = process.env.FORK_USDC;
    if (!USDC) this.skip();
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address","address","address","uint8","uint8","uint24","uint24","uint256","address"],
      [process.env.FORK_WETH || USDC, uniRouter, uniRouter, 1, 1, 3000, 3000, 0, user.address]
    );
    await expect(executor.connect(user).executeFlashLoanGasless(USDC, 1000n, params, user.address))
      .to.be.revertedWith("Not authorized relayer");
    await (await executor.setAuthorizedRelayer(serviceRelayer.address, true)).wait();
    await (await executor.setAllowedSwapTarget(uniRouter, true)).wait();
    await expect(executor.connect(serviceRelayer).executeFlashLoanGasless(USDC, 1000n, params, owner.address))
      .to.be.revertedWith("Recipient mismatch");
    await expect(executor.connect(serviceRelayer).executeFlashLoanGasless(USDC, 1000n, params, user.address))
      .to.be.reverted;
  });
});
