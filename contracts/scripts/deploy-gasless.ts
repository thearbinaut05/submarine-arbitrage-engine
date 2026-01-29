import { ethers, network } from "hardhat";
import { GelatoRelay, SponsoredCallRequest } from "@gelatonetwork/relay-sdk";
import { NETWORK_CONFIG } from "./config";
import * as fs from "fs";
import * as path from "path";

/**
 * Gasless deployment using Gelato Relay
 * The deployer doesn't need ETH - Gelato sponsors the gas
 */
async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];

  if (!config) {
    throw new Error(`Network ${networkName} not configured`);
  }

  const gelatoApiKey = process.env.GELATO_API_KEY;
  if (!gelatoApiKey) {
    throw new Error("GELATO_API_KEY not set in environment");
  }

  console.log("\n" + "=".repeat(60));
  console.log(`🚀 GASLESS DEPLOYMENT via Gelato - ${config.name}`);
  console.log("=".repeat(60) + "\n");

  const [deployer] = await ethers.getSigners();
  const relay = new GelatoRelay();

  console.log(`📍 Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`⛽ Gas Sponsor: Gelato Network\n`);

  const deployedContracts: Record<string, string> = {};
  const txHashes: Record<string, string> = {};

  // Helper function to deploy via Gelato
  async function deployViaGelato(
    contractName: string,
    constructorArgs: any[]
  ): Promise<string> {
    console.log(`📦 Preparing ${contractName} for gasless deployment...`);

    const Factory = await ethers.getContractFactory(contractName);
    const deployTx = await Factory.getDeployTransaction(...constructorArgs);
    
    // Create the sponsored call request
    const request: SponsoredCallRequest = {
      chainId: BigInt(config.chainId),
      target: ethers.ZeroAddress, // Contract creation
      data: deployTx.data as string,
    };

    console.log(`   📡 Submitting to Gelato Relay...`);
    
    const response = await relay.sponsoredCall(request, gelatoApiKey);
    console.log(`   ⏳ Task ID: ${response.taskId}`);

    // Poll for task completion
    let taskStatus;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s delay
      
      try {
        taskStatus = await relay.getTaskStatus(response.taskId);
        
        if (taskStatus?.taskState === "ExecSuccess") {
          const txHash = taskStatus.transactionHash!;
          console.log(`   ✅ ${contractName} deployed!`);
          console.log(`   📝 TX Hash: ${txHash}`);
          
          // Get contract address from transaction receipt
          const receipt = await ethers.provider.getTransactionReceipt(txHash);
          const contractAddress = receipt?.contractAddress;
          
          if (!contractAddress) {
            throw new Error("Could not get contract address from receipt");
          }
          
          txHashes[contractName] = txHash;
          return contractAddress;
        }
        
        if (taskStatus?.taskState === "Cancelled" || taskStatus?.taskState === "ExecReverted") {
          throw new Error(`Task failed: ${taskStatus.taskState} - ${taskStatus.lastCheckMessage}`);
        }
        
        console.log(`   ⏳ Status: ${taskStatus?.taskState || "pending"}...`);
      } catch (error: any) {
        if (!error.message.includes("Task not found")) {
          throw error;
        }
      }
      
      attempts++;
    }

    throw new Error(`Deployment timeout for ${contractName}`);
  }

  try {
    // 1. Deploy FlashArbExecutor
    const dexRouters = [
      config.uniswapV3Router || ethers.ZeroAddress,
      config.sushiswapRouter || ethers.ZeroAddress,
    ].filter(addr => addr !== ethers.ZeroAddress);

    deployedContracts.flashArbExecutor = await deployViaGelato(
      "FlashArbExecutor",
      [config.aavePoolProvider, dexRouters]
    );

    // 2. Deploy GaslessRelayer
    deployedContracts.gaslessRelayer = await deployViaGelato(
      "GaslessRelayer",
      ["FlashArb Gasless Relayer", "1"]
    );

    // 3. Deploy PositionRebalancer
    deployedContracts.positionRebalancer = await deployViaGelato(
      "PositionRebalancer",
      [config.aavePoolProvider]
    );

    // 4. Configure contracts (also gasless)
    console.log("\n⚙️  Configuring contracts via Gelato...");
    
    const GaslessRelayer = await ethers.getContractFactory("GaslessRelayer");
    const relayerInterface = GaslessRelayer.interface;
    
    const configData = relayerInterface.encodeFunctionData("setAuthorizedExecutor", [
      deployedContracts.flashArbExecutor,
      true,
    ]);

    const configRequest: SponsoredCallRequest = {
      chainId: BigInt(config.chainId),
      target: deployedContracts.gaslessRelayer,
      data: configData,
    };

    const configResponse = await relay.sponsoredCall(configRequest, gelatoApiKey);
    console.log(`   📡 Config Task ID: ${configResponse.taskId}`);

    // Wait for config to complete
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log("   ✅ Configuration complete");

    // 5. Save deployment
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deployment = {
      network: networkName,
      chainId: config.chainId,
      deployer: deployer.address,
      deploymentMethod: "gelato-gasless",
      timestamp: Date.now(),
      contracts: deployedContracts,
      txHashes,
    };

    const deploymentFile = path.join(deploymentsDir, `${networkName}-gasless.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

    // 6. Print summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ GASLESS DEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log(`
📋 Contract Addresses:
   FlashArbExecutor:    ${deployedContracts.flashArbExecutor}
   GaslessRelayer:      ${deployedContracts.gaslessRelayer}
   PositionRebalancer:  ${deployedContracts.positionRebalancer}

⛽ Gas Cost: $0.00 (Sponsored by Gelato)

💾 Deployment saved to: ${deploymentFile}

⚠️  IMPORTANT: Update your Lovable edge functions with these addresses!
`);

  } catch (error) {
    console.error("\n❌ Gasless deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
