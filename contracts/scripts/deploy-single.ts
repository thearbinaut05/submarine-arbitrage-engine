import { ethers, network } from "hardhat";
import { NETWORK_CONFIG } from "./config";

/**
 * Deploy a single contract - useful for testing or redeploying
 * Usage: npx hardhat run scripts/deploy-single.ts --network mainnet
 * Set CONTRACT env var to choose: FlashArbExecutor, GaslessRelayer, PositionRebalancer
 */
async function main() {
  const networkName = network.name;
  const config = NETWORK_CONFIG[networkName];
  const contractName = process.env.CONTRACT || "FlashArbExecutor";

  if (!config) {
    throw new Error(`Network ${networkName} not configured`);
  }

  console.log(`\n🚀 Deploying ${contractName} to ${config.name}...\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  let contract;
  let constructorArgs: unknown[];

  switch (contractName) {
    case "FlashArbExecutor": {
      const dexRouters = [
        config.uniswapV3Router,
        config.sushiswapRouter,
      ].filter(Boolean) as string[];
      
      constructorArgs = [config.aavePoolProvider, dexRouters];
      const FlashArbExecutor = await ethers.getContractFactory("FlashArbExecutor");
      contract = await FlashArbExecutor.deploy(...constructorArgs);
      break;
    }

    case "GaslessRelayer": {
      constructorArgs = ["FlashArb Gasless Relayer", "1"];
      const GaslessRelayer = await ethers.getContractFactory("GaslessRelayer");
      contract = await GaslessRelayer.deploy(...constructorArgs);
      break;
    }

    case "PositionRebalancer": {
      constructorArgs = [config.aavePoolProvider];
      const PositionRebalancer = await ethers.getContractFactory("PositionRebalancer");
      contract = await PositionRebalancer.deploy(...constructorArgs);
      break;
    }

    default:
      throw new Error(`Unknown contract: ${contractName}`);
  }

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction();

  console.log(`\n✅ ${contractName} deployed!`);
  console.log(`   Address: ${address}`);
  console.log(`   TX Hash: ${tx?.hash}`);
  console.log(`\nVerify with:`);
  console.log(`   npx hardhat verify --network ${networkName} ${address} ${constructorArgs.map(a => 
    Array.isArray(a) ? `"[${a.join(',')}]"` : `"${a}"`
  ).join(' ')}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

