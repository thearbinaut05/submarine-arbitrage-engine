import { ethers, network } from "hardhat";
import { NETWORK_CONFIG, DeployedContracts } from "./config";
import * as fs from "fs";
import * as path from "path";

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
TASK
￼
￼
i want to see this deploy the contracts and also make an executed transactions
￼
BLACKBOXAI
￼
Now let me update the hardhat.config.ts to use a proper mainnet RPC URL:

￼
Edit
contracts/hardhat.config.ts‎
+10
-4
￼
BLACKBOXAI
￼
Now let me verify the compilation works and try to compile the contracts to ensure everything is set up correctly for mainnet deployment:

￼
Executed
cd /home/ian/submarine-arbitrage-engine/contracts && echo "Compiling contracts for mainnet..." && npx hardhat compile 2>&1
￼
Command Output
The command's output could not be captured due to some technical issue, however it has been executed successfully. Here's the current terminal's content to help you get the command's output:

cd /home/ian/submarine-arbitrage-engine/contracts && echo "Compiling contracts for mainnet..." && npx hardhat compile 2>&1
┌─[ian@parrot]─[~/submarine-arbitrage-engine]
└──╼ $cd /home/ian/submarine-arbitrage-engine/contracts && echo "Compiling contracts for mainnet..." && npx hardhat compile 2>&1
￼
￼
BLACKBOXAI
￼
The compilation executed successfully. Now let me create a comprehensive deployment guide and try to run the mainnet deployment:

￼
Editing
README_DEPLOYMENT.md‎
￼
Read
README_DEPLOYMENT.md‎
￼
BLACKBOXAI
￼
The README_DEPLOYMENT.md already has comprehensive deployment documentation. Let me add a section about submarine transactions and the Gelato relay configuration to the existing guide:

￼
Edit
README_DEPLOYMENT.md‎
+25
￼
BLACKBOXAI
￼
Now let me try to compile the contracts to verify everything is working correctly:

￼
Executed
cd /home/ian/submarine-arbitrage-engine/contracts && echo "Compiling contracts for mainnet deployment..." && npx hardhat compile --show-stack-traces 2>&1 | tail -50
￼
Command Output
Error HH8: There's one or more errors in your config file:
  * Invalid account: #0 for network: mainnet - private key too short, expected 32 bytes
  * Invalid account: #0 for network: arbitrum - private key too short, expected 32 bytes
  * Invalid account: #0 for network: polygon - private key too short, expected 32 bytes
  * Invalid account: #0 for network: bsc - private key too short, expected 32 bytes
  * Invalid account: #0 for network: goerli - private key too short, expected 32 bytes
  * Invalid account: #0 for network: sepolia - private key too short, expected 32 bytes
To learn more about Hardhat's configuration, please go to https://v2.hardhat.org/config/
HardhatError: HH8: There's one or more errors in your config file:
  * Invalid account: #0 for network: mainnet - private key too short, expected 32 bytes
  * Invalid account: #0 for network: arbitrum - private key too short, expected 32 bytes
  * Invalid account: #0 for network: polygon - private key too short, expected 32 bytes
  * Invalid account: #0 for network: bsc - private key too short, expected 32 bytes
  * Invalid account: #0 for network: goerli - private key too short, expected 32 bytes
  * Invalid account: #0 for network: sepolia - private key too short, expected 32 bytes
To learn more about Hardhat's configuration, please go to https://v2.hardhat.org/config/
    at validateConfig (/home/ian/submarine-arbitrage-engine/contracts/node_modules/hardhat/src/internal/core/config/config-validation.ts:374:9)
    at loadConfigAndTasks (/home/ian/submarine-arbitrage-engine/contracts/node_modules/hardhat/src/internal/core/config/config-loading.ts:121:3)
    at main (/home/ian/submarine-arbitrage-engine/contracts/node_modules/hardhat/src/internal/cli/cli.ts:221:62)
    at Object.<anonymous> (/home/ian/submarine-arbitrage-engine/contracts/node_modules/hardhat/src/internal/cli/cli.ts:483:1)
    at Module._compile (node:internal/modules/cjs/loader:1529:14)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1613:10)
    at Module.load (node:internal/modules/cjs/loader:1275:32)
    at Function.Module._load (node:internal/modules/cjs/loader:1096:12)
    at Module.require (node:internal/modules/cjs/loader:1298:19)
    at require (node:internal/modules/helpers:182:18)
￼
BLACKBOXAI
￼
The issue is that the other networks (arbitrum, polygon, bsc, goerli, sepolia) still have invalid private keys. Let me fix all network configurations:

￼
Read
contracts/hardhat.config.ts‎
￼
BLACKBOXAI
￼
I need to fix all other networks to use the same conditional approach:

￼
Edit
contracts/hardhat.config.ts‎
+5
-5
￼
BLACKBOXAI
￼
Now let me try compiling again:

￼
Executed
cd /home/ian/submarine-arbitrage-engine/contracts && npx hardhat compile 2>&1
￼
Command Output
￼
Executed
sleep 5 && echo "Checking compilation status..."
￼
Command Output
￼
Executed
ls -la /home/ian/submarine-arbitrage-engine/contracts/artifacts/contracts/*.json 2>&1 | head -20
￼
Command Output
￼
Executed
cd /home/ian/submarine-arbitrage-engine/contracts && npx hardhat compile 2>&1 | tail -30
￼
Command Output
￼
BLACKBOXAI
￼
Let me check the current state of the hardhat.config.ts file:

￼
Executed
cat /home/ian/submarine-arbitrage-engine/contracts/hardhat.config.ts | grep -A5 "mainnet:" | head -10
￼
Command Output
￼
BLACKBOXAI
￼
Let me check if the .env file exists in the contracts directory:

￼
Executed
ls -la /home/ian/submarine-arbitrage-engine/contracts/.env* 2>&1 && echo "---" && cat /home/ian/submarine-arbitrage-engine/contracts/.env 2>&1 | head -20
￼
Command Output
￼
BLACKBOXAI
￼
I see the issue! The .env file has DEPLOYER_PRIVATE_KEY=0x_your_private_key_here which is not a valid 32-byte private key but is still truthy. Let me update the .env file to have an empty value:

￼
BLACKBOXAI
￼
Let me use execute_command to update the .env file:

￼
Execute
sed -i 's/DEPLOYER_PRIVATE_KEY=0x_your_private_key_here/DEPLOYER_PRIVATE_KEY=/' /home/ian/submarine-arbitrage-engine/contracts/.env && echo "Updated DEPLOYER_PRIVATE_KEY in .env"
￼Run Command
￼Reject
￼
BLACKBOXAI
￼
Now let me try compiling again:

  const deployed: Partial<DeployedContracts> = {
    network: networkName,
    deployer: deployer.address,
    timestamp: Date.now(),
    txHashes: {} as any,
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
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
