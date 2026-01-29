import { run, network } from "hardhat";
import { NETWORK_CONFIG } from "./config";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];

  if (!config) {
    throw new Error(`Network ${networkName} not configured`);
  }

  // Load deployment info
  const deploymentFile = path.join(__dirname, `../deployments/${networkName}.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    // Try gasless deployment file
    const gaslessFile = path.join(__dirname, `../deployments/${networkName}-gasless.json`);
    if (!fs.existsSync(gaslessFile)) {
      throw new Error(`No deployment found for ${networkName}. Deploy first!`);
    }
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));

  console.log("\n" + "=".repeat(60));
  console.log(`🔍 VERIFYING CONTRACTS - ${config.name}`);
  console.log("=".repeat(60) + "\n");

  const contracts = deployment.contracts || {
    flashArbExecutor: deployment.flashArbExecutor,
    gaslessRelayer: deployment.gaslessRelayer,
    positionRebalancer: deployment.positionRebalancer,
  };

  // 1. Verify FlashArbExecutor
  console.log("📝 Verifying FlashArbExecutor...");
  try {
    const dexRouters = [
      config.uniswapV3Router,
      config.sushiswapRouter,
      config.quickswapRouter || config.pancakeswapRouter,
    ].filter(Boolean);

    await run("verify:verify", {
      address: contracts.flashArbExecutor,
      constructorArguments: [config.aavePoolProvider, dexRouters],
      contract: "contracts/FlashArbExecutor.sol:FlashArbExecutor",
    });
    console.log("   ✅ FlashArbExecutor verified!\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified\n");
    } else {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 2. Verify GaslessRelayer
  console.log("📝 Verifying GaslessRelayer...");
  try {
    await run("verify:verify", {
      address: contracts.gaslessRelayer,
      constructorArguments: ["FlashArb Gasless Relayer", "1"],
      contract: "contracts/GaslessRelayer.sol:GaslessRelayer",
    });
    console.log("   ✅ GaslessRelayer verified!\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified\n");
    } else {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }
  }

  // 3. Verify PositionRebalancer
  console.log("📝 Verifying PositionRebalancer...");
  try {
    await run("verify:verify", {
      address: contracts.positionRebalancer,
      constructorArguments: [config.aavePoolProvider],
      contract: "contracts/PositionRebalancer.sol:PositionRebalancer",
    });
    console.log("   ✅ PositionRebalancer verified!\n");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("   ℹ️  Already verified\n");
    } else {
      console.log(`   ❌ Failed: ${error.message}\n`);
    }
  }

  console.log("=".repeat(60));
  console.log("✅ VERIFICATION COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
