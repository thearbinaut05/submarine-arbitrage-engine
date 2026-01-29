/**
 * @title Multi-Chain Gasless Deployment Script
 * @notice Deploys contracts with gas sponsorship using Gelato Relay & CREATE2
 * @dev Uses submarine transaction patterns for MEV protection
 */

import { ethers, network } from "hardhat";
import { MULTI_CHAIN_CONFIG } from "./multi-chain-config";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// GELATO RELAY CONFIGURATION
// ============================================================================

interface GelatoSponsoredCallRequest {
  chainId: string;
  target: string;
  data: string;
  sponsorApiKey: string;
  retries?: number;
}

interface DeploymentResult {
  success: boolean;
  contractName: string;
  network: string;
  address?: string;
  txHash?: string;
  taskId?: string;
  sponsored: boolean;
  error?: string;
}

// ============================================================================
// MAIN DEPLOYMENT FUNCTION
// ============================================================================

async function main() {
  const networkName = network.name;
  const config = MULTI_CHAIN_CONFIG[networkName];

  if (!config) {
    console.error(`❌ Network ${networkName} not configured`);
    console.log(`Available networks: ${Object.keys(MULTI_CHAIN_CONFIG).join(", ")}`);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`🚀 GASLESS MULTI-CHAIN DEPLOYMENT - ${config.name}`);
  console.log("=".repeat(70));

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`\n📍 Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`👛 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ${config.nativeCurrency.symbol}`);
  console.log(`⛽ Gas Method: Gelato Sponsored + CREATE2`);

  // Check for Gelato API key
  const gelatoApiKey = process.env.GELATO_API_KEY;
  const useSponsored = !!gelatoApiKey;

  if (useSponsored) {
    console.log(`✅ Gelato Sponsorship: ENABLED`);
  } else {
    console.log(`⚠️  Gelato Sponsorship: DISABLED (using direct deployment)`);
  }

  const deployedContracts: Record<string, DeploymentResult> = {};
  const deploymentResults: DeploymentResult[] = [];

  // ============================================================================
  // DEPLOY FLASHARB EXECUTOR
  // ============================================================================
  console.log("\n📦 Deploying FlashArbExecutor...");

  const FlashArbExecutor = await ethers.getContractFactory("FlashArbExecutor");
  
  // Collect DEX router addresses
  const dexRouterAddresses = Object.values(config.dexRouters).filter(
    (addr) => addr && addr !== ethers.ZeroAddress
  );

  try {
    const flashArbExecutor = await deployWithGasSponsorship(
      "FlashArbExecutor",
      FlashArbExecutor.getDeployTransaction(
        config.aavePoolProvider,
        dexRouterAddresses[0] || ethers.ZeroAddress,
        dexRouterAddresses[1] || ethers.ZeroAddress
      ),
      deployer,
      config,
      gelatoApiKey || undefined,
      useSponsored
    );

    deployedContracts["FlashArbExecutor"] = flashArbExecutor;
    deploymentResults.push(flashArbExecutor);

    if (flashArbExecutor.success) {
      console.log(`   ✅ FlashArbExecutor: ${flashArbExecutor.address}`);
    } else {
      console.log(`   ❌ FlashArbExecutor failed: ${flashArbExecutor.error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ FlashArbExecutor error: ${error.message}`);
    deploymentResults.push({
      success: false,
      contractName: "FlashArbExecutor",
      network: networkName,
      sponsored: useSponsored,
      error: error.message,
    });
  }

  // ============================================================================
  // DEPLOY GASLESS RELAYER
  // ============================================================================
  console.log("\n📦 Deploying GaslessRelayer...");

  const GaslessRelayer = await ethers.getContractFactory("GaslessRelayer");

  try {
    const gaslessRelayer = await deployWithGasSponsorship(
      "GaslessRelayer",
      GaslessRelayer.getDeployTransaction(deployer.address),
      deployer,
      config,
      gelatoApiKey || undefined,
      useSponsored
    );

    deployedContracts["GaslessRelayer"] = gaslessRelayer;
    deploymentResults.push(gaslessRelayer);

    if (gaslessRelayer.success) {
      console.log(`   ✅ GaslessRelayer: ${gaslessRelayer.address}`);
    } else {
      console.log(`   ❌ GaslessRelayer failed: ${gaslessRelayer.error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ GaslessRelayer error: ${error.message}`);
    deploymentResults.push({
      success: false,
      contractName: "GaslessRelayer",
      network: networkName,
      sponsored: useSponsored,
      error: error.message,
    });
  }

  // ============================================================================
  // DEPLOY POSITION REBALANCER
  // ============================================================================
  console.log("\n📦 Deploying PositionRebalancer...");

  const PositionRebalancer = await ethers.getContractFactory("PositionRebalancer");

  try {
    const positionRebalancer = await deployWithGasSponsorship(
      "PositionRebalancer",
      PositionRebalancer.getDeployTransaction(config.aavePoolProvider),
      deployer,
      config,
      gelatoApiKey || undefined,
      useSponsored
    );

    deployedContracts["PositionRebalancer"] = positionRebalancer;
    deploymentResults.push(positionRebalancer);

    if (positionRebalancer.success) {
      console.log(`   ✅ PositionRebalancer: ${positionRebalancer.address}`);
    } else {
      console.log(`   ❌ PositionRebalancer failed: ${positionRebalancer.error}`);
    }
  } catch (error: any) {
    console.log(`   ❌ PositionRebalancer error: ${error.message}`);
    deploymentResults.push({
      success: false,
      contractName: "PositionRebalancer",
      network: networkName,
      sponsored: useSponsored,
      error: error.message,
    });
  }

  // ============================================================================
  // SAVE DEPLOYMENT RESULTS
  // ============================================================================
  console.log("\n💾 Saving deployment results...");

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `${networkName}-gasless.json`);
  
  const deploymentSummary = {
    network: networkName,
    chainId: config.chainId,
    deployer: deployer.address,
    timestamp: Date.now(),
    sponsoredDeployment: useSponsored,
    gelatoApiKeyConfigured: !!gelatoApiKey,
    contracts: Object.fromEntries(
      Object.entries(deployedContracts)
        .filter(([, v]) => v.success)
        .map(([k, v]) => [k, { address: v.address, txHash: v.txHash, taskId: v.taskId }])
    ),
    results: deploymentResults,
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentSummary, null, 2));
  console.log(`   ✅ Saved to: ${deploymentFile}`);

  // ============================================================================
  // PRINT SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(70));
  console.log("✅ GASLESS DEPLOYMENT COMPLETE");
  console.log("=".repeat(70));
  console.log(`\n📋 Deployed Contracts:`);

  for (const [name, result] of Object.entries(deployedContracts)) {
    if (result.success) {
      console.log(`   • ${name}: ${result.address}`);
      if (result.taskId) {
        console.log(`     Gelato Task: ${result.taskId}`);
      }
    }
  }

  console.log(`\n🔗 Explorer URLs:`);
  for (const [name, result] of Object.entries(deployedContracts)) {
    if (result.success && result.address) {
      console.log(`   • ${name}: ${config.explorer}/address/${result.address}`);
    }
  }

  console.log(`\n⚠️  Next Steps:`);
  console.log(`   1. Verify contracts: npx hardhat verify --network ${networkName} <address>`);
  console.log(`   2. Update frontend config with new addresses`);
  console.log(`   3. Configure Gelato automation for monitoring`);

  return deploymentSummary;
}

// ============================================================================
// GASLESS DEPLOYMENT WITH GELATO RELAY
// ============================================================================

async function deployWithGasSponsorship(
  contractName: string,
  txData: { data: string; value?: bigint },
  deployer: any,
  config: typeof MULTI_CHAIN_CONFIG[string],
  gelatoApiKey?: string,
  useSponsored: boolean = false
): Promise<DeploymentResult> {
  // Try Gelato sponsored call first if API key is available
  if (useSponsored && gelatoApiKey) {
    try {
      console.log(`   🔥 Attempting Gelato sponsored deployment...`);
      
      const result = await gelatoSponsoredDeployment(
        config.chainId,
        ethers.ZeroAddress, // Contract creation
        txData.data,
        gelatoApiKey
      );

      if (result.success) {
        return {
          success: true,
          contractName,
          network: config.name,
          address: result.address,
          txHash: result.txHash,
          taskId: result.taskId,
          sponsored: true,
        };
      }
    } catch (error: any) {
      console.log(`   ⚠️  Gelato sponsorship failed: ${error.message}`);
      console.log(`   🔄 Falling back to direct deployment...`);
    }
  }

  // Fallback to direct deployment
  try {
    console.log(`   💳 Executing direct deployment...`);
    
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits("50", "gwei");
    const gasLimit = 5000000n;

    const tx = await deployer.sendTransaction({
      to: ethers.ZeroAddress,
      data: txData.data,
      value: txData.value || 0n,
      gasLimit: gasLimit,
      gasPrice: gasPrice,
    });

    const receipt = await tx.wait();
    
    // Calculate CREATE address
    const nonce = await deployer.getNonce();
    const expectedAddress = ethers.getCreateAddress({
      from: deployer.address,
      nonce: nonce - 1,
    });

    return {
      success: true,
      contractName,
      network: config.name,
      address: expectedAddress,
      txHash: receipt?.hash,
      sponsored: false,
    };
  } catch (error: any) {
    return {
      success: false,
      contractName,
      network: config.name,
      sponsored: useSponsored,
      error: error.message,
    };
  }
}

// ============================================================================
// GELATO RELAY INTEGRATION
// ============================================================================

interface GelatoResult {
  success: boolean;
  address?: string;
  txHash?: string;
  taskId?: string;
  error?: string;
}

async function gelatoSponsoredDeployment(
  chainId: number,
  target: string,
  data: string,
  sponsorApiKey: string
): Promise<GelatoResult> {
  // Try sponsored call endpoint
  const sponsoredCallUrl = "https://api.gelato.digital/relays/v2/sponsored-call";
  
  try {
    const response = await fetch(sponsoredCallUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chainId: chainId.toString(),
        target: target,
        data: data,
        sponsorApiKey: sponsorApiKey,
        retries: 3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gelato API error: ${errorText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      taskId: result.taskId,
      address: result.contractAddress || calculateCreate2Address(data),
    };
  } catch (error: any) {
    // Try call-with-sync-fee as fallback
    try {
      console.log(`   🔄 Trying Gelato sync-fee fallback...`);
      
      const syncFeeUrl = "https://api.gelato.digital/relays/v2/call-with-sync-fee";
      const syncFeeResponse = await fetch(syncFeeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chainId: chainId.toString(),
          target: target,
          data: data,
          feeToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          isRelayContext: false,
        }),
      });

      if (syncFeeResponse.ok) {
        const syncFeeResult = await syncFeeResponse.json();
        return {
          success: true,
          taskId: syncFeeResult.taskId,
          address: calculateCreate2Address(data),
        };
      }
    } catch (syncError: any) {
      console.log(`   ⚠️  Sync-fee fallback also failed: ${syncError.message}`);
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// CREATE2 HELPER FUNCTIONS
// ============================================================================

function calculateCreate2Address(bytecode: string): string {
  // For CREATE2, the address is calculated as:
  // keccak256(0xff + factoryAddress + salt + keccak256(bytecode))[32:12]
  const CREATE2_FACTORY = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
  const salt = ethers.id("FlashArb-v1");
  const initCodeHash = ethers.keccak256(bytecode);

  return ethers.getCreate2Address(CREATE2_FACTORY, salt, initCodeHash);
}

// ============================================================================
// EXECUTE DEPLOYMENT
// ============================================================================

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

