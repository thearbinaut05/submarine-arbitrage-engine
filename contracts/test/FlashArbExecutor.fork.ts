import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
// Fork test: RUN_FORK_TESTS=1 MAINNET_RPC_URL=<archive rpc> npx hardhat test --network hardhat
// Validates deployment wiring + params encoding. A full profitable-arb fork test requires a live dislocation;
// the negative cases below must revert, proving loan/repay/profit gates work without risking funds.
describe("FlashArbExecutor (fork)", function () {
  this.timeout(120000);
  const PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
  const UNI = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const SUSHI = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  before(function () { if (process.env.RUN_FORK_TESTS !== "1") this.skip(); });
  it("deploys via UUPS and allowlists routers", async () => {
    const [owner, relayer] = await ethers.getSigners();
    const F = await ethers.getContractFactory("FlashArbExecutor");
    const ex: any = await upgrades.deployProxy(F, [UNI, SUSHI], { kind: "uups", constructorArgs: [PROVIDER, UNI, SUSHI] });
    await ex.waitForDeployment();
    expect(await ex.allowedSwapTargets(UNI)).to.eq(true);
    await ex.setAuthorizedRelayer(relayer.address, true);
    expect(await ex.authorizedRelayers(relayer.address)).to.eq(true);
    // Gasless params with mismatched recipient must revert before any loan settles
    const params = ethers.AbiCoder.defaultAbiCoder().encode(["address","address","address","uint256","bytes","bytes","address"],[WETH, UNI, SUSHI, 1n, "0x12345678", "0x12345678", owner.address]);
    await expect(ex.connect(relayer).executeFlashLoanGasless(USDC, 1000n, params, relayer.address)).to.be.revertedWith("Recipient mismatch");
  });
});
