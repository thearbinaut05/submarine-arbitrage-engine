import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];
const config: HardhatUserConfig = {
  solidity: { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 } } },
  paths: { sources: "./", tests: "./test", cache: "./cache", artifacts: "./artifacts" },
  networks: {
    hardhat: { forking: { url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com", blockNumber: 19000000 }, chainId: 31337 },
    mainnet: { url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com", accounts, chainId: 1 },
    arbitrum: { url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc", accounts, chainId: 42161 },
    polygon: { url: process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com", accounts, chainId: 137 },
    base: { url: process.env.BASE_RPC_URL || "https://mainnet.base.org", accounts, chainId: 8453 },
    optimism: { url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io", accounts, chainId: 10 },
    sepolia: { url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org", accounts, chainId: 11155111 },
  },
  etherscan: { apiKey: { mainnet: process.env.ETHERSCAN_API_KEY || "", arbitrumOne: process.env.ARBISCAN_API_KEY || "", polygon: process.env.POLYGONSCAN_API_KEY || "", base: process.env.BASESCAN_API_KEY || "", optimisticEthereum: process.env.OPTIMISM_API_KEY || "" } },
};
export default config;
