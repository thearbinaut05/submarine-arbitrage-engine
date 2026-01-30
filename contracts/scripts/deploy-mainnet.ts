/**
 * Mainnet Deployment Script for FlashArb Arbitrage Engine
 * 
 * Deploys upgradeable UUPS contracts to Ethereum mainnet with
 * gasless transaction support via Gelato Sponsor Relay.
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-mainnet.ts --network mainnet
 * 
 * Environment Variables Required in .env.mainnet:
 *   DEPLOYER_PRIVATE_KEY - Private key for deployment wallet
 *   MAINNET_RPC_URL - Ethereum mainnet RPC URL
 *   GELATO_API_KEY - Gelato Relay API key (for reference)
 *   ETHERSCAN_API_KEY - Etherscan API key for verification
 */

import { ethers, network, upgrades } from "hardhat";
import { NETWORK_CONFIG, DeployedContracts } from "./config";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
// Check if .env.mainnet exists, otherwise use default .env
const envPath = fs.existsSync(path.join(__dirname, "../../.env.mainnet")) 
  ? path.join(__dirname, "../../.env.mainnet") 
  : path.join(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

async function main() {
  const networkName = network.name;
  
  if (networkName !== "mainnet") {
    console.log(`⚠️  Warning: You are deploying to "${networkName}", not "mainnet"!`);
    console.log("   Use --network mainnet to deploy to Ethereum mainnet.\n");
  }

  const config = NETWORK_CONFIG[networkName];
  if (!config) {
    throw new Error(`Network ${networkName} not configured in config.ts`);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`🚀 FLASHARB MAINNET DEPLOYMENT`);
  console.log(`📍 Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log("=".repeat(70) + "\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Check minimum balance
  const minBalance = ethers.parseEther("0.5");
  if (balance < minBalance) {
    console.log(`⚠️  Warning: Low balance! Recommended: 0.5 ETH, Current: ${ethers.formatEther(balance)} ETH`);
  }

  const deployed: DeployedContracts = {
    network: networkName,
    deployer: deployer.address,
    timestamp: Date.now(),
    txHashes: {
      flashArbExecutor: "",
      gaslessRelayer: "",
      positionRebalancer: "",
    },
    flashArbExecutor: "",
    gaslessRelayer: "",
    positionRebalancer: "",
  };

  // =============================================================================
  // STEP 1: Deploy PositionRebalancer (UUPS Proxy)
  // =============================================================================
  console.log("📦 Step 1/3: Deploying PositionRebalancer (UUPS Proxy)...");
  const PositionRebalancer = await ethers.getContractFactory("PositionRebalancer");
  
  const positionRebalancer = await upgrades.deployProxy(
    PositionRebalancer,
    [config.aavePoolProvider],
    { initializer: "initialize", kind: "uups" }
  );
  await positionRebalancer.waitForDeployment();
  
  const rebalancerAddress = await positionRebalancer.getAddress();
  const rebalancerTx = positionRebalancer.deploymentTransaction();
  
  console.log(`   ✅ PositionRebalancer: ${rebalancerAddress}`);
  if (rebalancerTx?.hash) {
    console.log(`   📝 TX: https://etherscan.io/tx/${rebalancerTx.hash}`);
  }
  
  deployed.positionRebalancer = rebalancerAddress;
  deployed.txHashes.positionRebalancer = rebalancerTx?.hash || "";

  // =============================================================================
  // STEP 2: Deploy GaslessRelayer (UUPS Proxy)
  // =============================================================================
  console.log("\n📦 Step 2/3: Deploying GaslessRelayer (UUPS Proxy)...");
  const GaslessRelayer = await ethers.getContractFactory("GaslessRelayer");
  
  const gelatoSponsor = config.gelatoRelay;
  
  const gaslessRelayer = await upgrades.deployProxy(
    GaslessRelayer,
    [gelatoSponsor],
    { initializer: "initialize", kind: "uups" }
  );
  await gaslessRelayer.waitForDeployment();
  
  const gaslessAddress = await gaslessRelayer.getAddress();
  const gaslessTx = gaslessRelayer.deploymentTransaction();
  
  console.log(`   ✅ GaslessRelayer: ${gaslessAddress}`);
  console.log(`   🔗 Gas Sponsor (Gelato): ${gelatoSponsor}`);
  if (gaslessTx?.hash) {
    console.log(`   📝 TX: https://etherscan.io/tx/${gaslessTx.hash}`);
  }
  
  deployed.gaslessRelayer = gaslessAddress;
  deployed.txHashes.gaslessRelayer = gaslessTx?.hash || "";

  // =============================================================================
  // STEP 3: Deploy FlashArbExecutor (UUPS Proxy)
  // =============================================================================
  console.log("\n📦 Step 3/3: Deploying FlashArbExecutor (UUPS Proxy)...");
  const FlashArbExecutor = await ethers.getContractFactory("FlashArbExecutor");
  
  // Collect DEX router addresses
  const dexRouters: string[] = [];
  if (config.uniswapV3Router) dexRouters.push(config.uniswapV3Router);
  if (config.sushiswapRouter) dexRouters.push(config.sushiswapRouter);
  
  const flashArbExecutor = await upgrades.deployProxy(
    FlashArbExecutor,
    [
      config.aavePoolProvider,
      dexRouters[0] || ethers.ZeroAddress,
      dexRouters[1] || ethers.ZeroAddress
    ],
    { initializer: "initialize", kind: "uups" }
  );
  await flashArbExecutor.waitForDeployment();
  
  const flashArbAddress = await flashArbExecutor.getAddress();
  const flashArbTx = flashArbExecutor.deploymentTransaction();
  
  console.log(`   ✅ FlashArbExecutor: ${flashArbAddress}`);
  console.log(`   📊 Aave Pool Provider: ${config.aavePoolProvider}`);
  if (dexRouters.length > 0) {
    console.log(`   📊 DEX Routers: ${dexRouters.join(", ")}`);
  }
  if (flashArbTx?.hash) {
    console.log(`   📝 TX: https://etherscan.io/tx/${flashArbTx.hash}`);
  }
  
  deployed.flashArbExecutor = flashArbAddress;
  deployed.txHashes.flashArbExecutor = flashArbTx?.hash || "";

  // =============================================================================
  // STEP 4: Configure Contracts
  // =============================================================================
  console.log("\n⚙️  Post-Deployment Configuration...");

  // 4.1 Authorize FlashArbExecutor in GaslessRelayer
  console.log("   🔐 Authorizing FlashArbExecutor in GaslessRelayer...");
  const authTx = await gaslessRelayer.setAuthorizedExecutor(flashArbAddress, true);
  await authTx.wait();
  console.log("      ✅ FlashArbExecutor authorized");

  // 4.2 Add more DEX routers if available
  if (dexRouters.length > 2) {
    console.log("   🔄 Additional DEX routers detected, updating...");
    const routerTx = await flashArbExecutor.updateRouters(dexRouters[0], dexRouters[1]);
    await routerTx.wait();
    console.log("      ✅ DEX routers updated");
  }

  // =============================================================================
  // SAVE DEPLOYMENT INFO
  // =============================================================================
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deployed, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  // =============================================================================
  // GENERATE ENVIRONMENT FILE FOR FRONTEND
  // =============================================================================
  const frontendEnvContent = `# Frontend Environment Variables
# Generated from mainnet deployment on ${new Date().toISOString()}

VITE_FLASH_ARB_ADDRESS=${deployed.flashArbExecutor}
VITE_GASLESS_RELAYER_ADDRESS=${deployed.gaslessRelayer}
VITE_POSITION_REBALANCER_ADDRESS=${deployed.positionRebalancer}

# Network Configuration
VITE_NETWORK_NAME=${config.name}
VITE_CHAIN_ID=${config.chainId}
VITE_RPC_URL=${process.env.MAINNET_RPC_URL || config.gelatoRelay}

# Aave V3 Pool
VITE_AAVE_POOL=${config.aavePoolProvider}

# DEX Routers
VITE_UNISWAP_V3_ROUTER=${config.uniswapV3Router || ''}
VITE_SUSHISWAP_ROUTER=${config.sushiswapRouter || ''}

# Gelato Relay (for gasless transactions)
VITE_GELATO_RELAYER=${config.gelatoRelay}
`;

  const frontendEnvFile = path.join(deploymentsDir, "frontend.env");
  fs.writeFileSync(frontendEnvFile, frontendEnvContent);
  console.log(`💾 Frontend env saved to: ${frontendEnvFile}`);

  // =============================================================================
  // PRINT SUMMARY
  // =============================================================================
  console.log("\n" + "=".repeat(70));
  console.log("✅ MAINNET DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log(`
📋 Contract Addresses:
   ├─ PositionRebalancer:  ${deployed.positionRebalancer}
   ├─ GaslessRelayer:      ${deployed.gaslessRelayer}
   └─ FlashArbExecutor:    ${deployed.flashArbExecutor}

🔗 Etherscan Links:
   ├─ PositionRebalancer:  https://etherscan.io/address/${deployed.positionRebalancer}
   ├─ GaslessRelayer:      https://etherscan.io/address/${deployed.gaslessRelayer}
   └─ FlashArbExecutor:    https://etherscan.io/address/${deployed.flashArbExecutor}

📝 Next Steps:

1. Verify contracts on Etherscan:
   npx hardhat verify --network mainnet \\
     --constructor-args <args> \\
     ${deployed.flashArbExecutor}
   
   Or use the automated verification:
   npx hardhat verify --network mainnet --contract-name FlashArbExecutor \\
     "${config.aavePoolProvider}" "${dexRouters[0]}" "${dexRouters[1]}"

2. Update frontend environment by copying:
   ${frontendEnvFile}
   
   Or set these environment variables:
   export VITE_FLASH_ARB_ADDRESS=${deployed.flashArbExecutor}
   export VITE_GASLESS_RELAYER_ADDRESS=${deployed.gaslessRelayer}
   export VITE_POSITION_REBALANCER_ADDRESS=${deployed.positionRebalancer}

3. Update Supabase edge functions with new contract addresses

4. Fund the GaslessRelayer contract with ETH for gas sponsorship:
   cast send ${deployed.gaslessRelayer} --value 1ether --from ${deployer.address}

5. Test with a small arbitrage opportunity

⚠️  IMPORTANT: Keep your private keys safe and never commit them to version control!
`);

  return deployed;
}

// Execute deployment
main()
  .then((deployed) => {
    console.log("\n🎉 Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

