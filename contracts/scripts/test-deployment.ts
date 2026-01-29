import { ethers, network } from "hardhat";
import { NETWORK_CONFIG } from "./config";
import * as fs from "fs";
import * as path from "path";

/**
 * Test deployed contracts by calling read functions
 */
async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];

  if (!config) {
    throw new Error(`Network ${networkName} not configured`);
  }

  // Load deployment
  let deploymentFile = path.join(__dirname, `../deployments/${networkName}.json`);
  if (!fs.existsSync(deploymentFile)) {
    deploymentFile = path.join(__dirname, `../deployments/${networkName}-gasless.json`);
  }
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`No deployment found for ${networkName}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contracts = deployment.contracts || deployment;

  console.log("\n" + "=".repeat(60));
  console.log(`🧪 TESTING DEPLOYMENT - ${config.name}`);
  console.log("=".repeat(60) + "\n");

  const [tester] = await ethers.getSigners();
  console.log(`Tester: ${tester.address}\n`);

  // Test FlashArbExecutor
  console.log("📦 Testing FlashArbExecutor...");
  const FlashArbExecutor = await ethers.getContractFactory("FlashArbExecutor");
  const flashArb = FlashArbExecutor.attach(contracts.flashArbExecutor);
  
  try {
    const owner = await flashArb.owner();
    const paused = await flashArb.paused();
    console.log(`   Owner: ${owner}`);
    console.log(`   Paused: ${paused}`);
    console.log("   ✅ FlashArbExecutor responding\n");
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test GaslessRelayer
  console.log("📦 Testing GaslessRelayer...");
  const GaslessRelayer = await ethers.getContractFactory("GaslessRelayer");
  const relayer = GaslessRelayer.attach(contracts.gaslessRelayer);
  
  try {
    const nonce = await relayer.nonces(tester.address);
    const DOMAIN_SEPARATOR = await relayer.DOMAIN_SEPARATOR();
    console.log(`   Nonce for ${tester.address}: ${nonce}`);
    console.log(`   DOMAIN_SEPARATOR: ${DOMAIN_SEPARATOR.slice(0, 20)}...`);
    console.log("   ✅ GaslessRelayer responding\n");
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test PositionRebalancer
  console.log("📦 Testing PositionRebalancer...");
  const PositionRebalancer = await ethers.getContractFactory("PositionRebalancer");
  const rebalancer = PositionRebalancer.attach(contracts.positionRebalancer);
  
  try {
    const owner = await rebalancer.owner();
    console.log(`   Owner: ${owner}`);
    console.log("   ✅ PositionRebalancer responding\n");
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  console.log("=".repeat(60));
  console.log("✅ DEPLOYMENT TEST COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
