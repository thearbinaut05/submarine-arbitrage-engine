import { ethers, network } from "hardhat";
import { NETWORK_CONFIG, DeployedContracts } from "./config";
import * as fs from "fs";
import * as path from "path";

interface TxHashes {
  flashArbExecutor: string;
  gaslessRelayer: string;
  positionRebalancer: string;
}

async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];

  if (!config) {
    throw new Error(`Network ${networkName} not configured. Available: ${Object.keys(NETWORK_CONFIG).join(", ")}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🚀 FLASHARB DEPLOYMENT - ${config.name}`);
  console.log("=".repeat(60) + "\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`📍 Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.01 ETH");
  }

  const deployed: Partial<DeployedContracts> = {
    network: networkName,
    deployer: deployer.address,
    timestamp: Date.now(),
    txHashes: {} as TxHashes,
  };

  // 1. Deploy FlashArbExecutor
  console.log("📦 Deploying FlashArbExecutor...");
  const FlashArbExecutor = await ethers.getContractFactory("FlashArbExecutor");
  
  const dexRouters = [
    config.uniswapV3Router || ethers.ZeroAddress,
    config.sushiswapRouter || ethers.ZeroAddress,
    config.quickswapRouter || config.pancakeswapRouter || ethers.ZeroAddress,
  ].filter(addr => addr !== ethers.ZeroAddress);

  const flashArbExecutor = await FlashArbExecutor.deploy(
    config.aavePoolProvider,
    dexRouters
  );
  await flashArbExecutor.waitForDeployment();
  
  const flashArbAddress = await flashArbExecutor.getAddress();
  const flashArbTx = flashArbExecutor.deploymentTransaction();
  
  console.log(`   ✅ FlashArbExecutor deployed: ${flashArbAddress}`);
  console.log(`   📝 TX Hash: ${flashArbTx?.hash}\n`);
  
  deployed.flashArbExecutor = flashArbAddress;
  deployed.txHashes!.flashArbExecutor = flashArbTx?.hash || "";

  // 2. Deploy GaslessRelayer
  console.log("📦 Deploying GaslessRelayer...");
  const GaslessRelayer = await ethers.getContractFactory("GaslessRelayer");
  
  const gaslessRelayer = await GaslessRelayer.deploy(
    "FlashArb Gasless Relayer",
    "1"
  );
  await gaslessRelayer.waitForDeployment();
  
  const gaslessAddress = await gaslessRelayer.getAddress();
  const gaslessTx = gaslessRelayer.deploymentTransaction();
  
  console.log(`   ✅ GaslessRelayer deployed: ${gaslessAddress}`);
  console.log(`   📝 TX Hash: ${gaslessTx?.hash}\n`);
  
  deployed.gaslessRelayer = gaslessAddress;
  deployed.txHashes!.gaslessRelayer = gaslessTx?.hash || "";

  // 3. Deploy PositionRebalancer
  console.log("📦 Deploying PositionRebalancer...");
  const PositionRebalancer = await ethers.getContractFactory("PositionRebalancer");
  
  const positionRebalancer = await PositionRebalancer.deploy(
    config.aavePoolProvider
  );
  await positionRebalancer.waitForDeployment();
  
  const rebalancerAddress = await positionRebalancer.getAddress();
  const rebalancerTx = positionRebalancer.deploymentTransaction();
  
  console.log(`   ✅ PositionRebalancer deployed: ${rebalancerAddress}`);
  console.log(`   📝 TX Hash: ${rebalancerTx?.hash}\n`);
  
  deployed.positionRebalancer = rebalancerAddress;
  deployed.txHashes!.positionRebalancer = rebalancerTx?.hash || "";

  // 4. Configure contracts
  console.log("⚙️  Configuring contracts...");
  
  // Authorize FlashArbExecutor in GaslessRelayer
  const authTx = await gaslessRelayer.setAuthorizedExecutor(flashArbAddress, true);
  await authTx.wait();
  console.log("   ✅ FlashArbExecutor authorized in GaslessRelayer");

  // 5. Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployed, null, 2));
  console.log(`\n💾 Deployment saved to: ${deploymentFile}`);

  // 6. Print summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`
📋 Contract Addresses:
   FlashArbExecutor:    ${deployed.flashArbExecutor}
   GaslessRelayer:      ${deployed.gaslessRelayer}
   PositionRebalancer:  ${deployed.positionRebalancer}

🔗 Verify contracts with:
   npm run verify -- --network ${networkName}

⚠️  IMPORTANT: Update your Lovable edge functions with these addresses!
`);

  return deployed;
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  });

