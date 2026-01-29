import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.16.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified contract bytecodes for deployment
// These are placeholder bytecodes - in production, use compiled contract bytecodes
const CONTRACTS = {
  FlashArbExecutor: {
    // Minimal proxy pattern for gas efficiency
    bytecode: "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe",
    abi: [
      "constructor(address _aavePool, address _uniswapRouter, address _sushiRouter)",
      "function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn, bytes calldata route) external returns (uint256)",
      "function owner() view returns (address)"
    ]
  },
  GaslessRelayer: {
    bytecode: "0x608060405234801561001057600080fd5b50610100806100206000396000f3fe",
    abi: [
      "constructor(address _gelatoRelay)",
      "function executeWithSignature(address target, bytes calldata data, bytes calldata signature) external",
      "function nonces(address) view returns (uint256)"
    ]
  },
  PositionRebalancer: {
    bytecode: "0x608060405234801561001057600080fd5b50610120806100206000396000f3fe",
    abi: [
      "constructor(address _aavePool, address _uniswapRouter)",
      "function rebalance(address[] calldata tokens, uint256[] calldata targetRatios) external",
      "function getPositions(address user) view returns (tuple(address token, uint256 balance, uint256 value)[])"
    ]
  }
};

// Network configurations
const NETWORK_CONFIG: Record<string, {
  chainId: number;
  rpcUrl: string;
  aavePool: string;
  uniswapRouter: string;
  sushiRouter: string;
  gelatoRelay: string;
  explorerUrl: string;
}> = {
  mainnet: {
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    aavePool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://etherscan.io",
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://arbiscan.io",
  },
  polygon: {
    chainId: 137,
    rpcUrl: "https://polygon-rpc.com",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://polygonscan.com",
  },
  bsc: {
    chainId: 56,
    rpcUrl: "https://bsc-dataseed.binance.org",
    aavePool: "0x0000000000000000000000000000000000000000",
    uniswapRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://bscscan.com",
  },
};

// Gelato Relay 1Balance API for sponsored transactions
// This uses Gelato's 1Balance feature where you pre-fund a balance that pays for gas
async function sponsoredCallWithGelato(
  gelatoApiKey: string,
  chainId: number,
  target: string,
  data: string,
  userAddress: string
): Promise<{ taskId: string }> {
  const response = await fetch("https://api.gelato.digital/relays/v2/sponsored-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainId: chainId.toString(),
      target,
      data,
      sponsorApiKey: gelatoApiKey,
      retries: 3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gelato relay error: ${errorText}`);
  }

  return await response.json();
}

// Deploy using CREATE2 via a factory for deterministic addresses
async function deployViaCreate2Factory(
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet,
  bytecode: string,
  salt: string,
  gelatoApiKey: string | null,
  chainId: number
): Promise<{ address: string; txHash?: string; taskId?: string; sponsored: boolean }> {
  
  // Deterministic Deployment Proxy (EIP-2470) - same on all EVM chains
  const CREATE2_FACTORY = "0x4e59b44847b379578588920cA78FbF26c0B4956C";
  
  // Calculate the CREATE2 address
  const initCodeHash = ethers.keccak256(bytecode);
  const saltBytes32 = ethers.zeroPadValue(ethers.toBeHex(salt), 32);
  
  const create2Address = ethers.getCreate2Address(
    CREATE2_FACTORY,
    saltBytes32,
    initCodeHash
  );
  
  // Check if already deployed
  const existingCode = await provider.getCode(create2Address);
  if (existingCode !== "0x") {
    console.log(`Contract already deployed at ${create2Address}`);
    return {
      address: create2Address,
      sponsored: false,
    };
  }

  // Prepare deployment data for CREATE2 factory
  const deployData = ethers.concat([saltBytes32, bytecode]);
  
  if (gelatoApiKey) {
    try {
      // Try Gelato sponsored call
      const result = await sponsoredCallWithGelato(
        gelatoApiKey,
        chainId,
        CREATE2_FACTORY,
        deployData,
        wallet.address
      );
      
      return {
        address: create2Address,
        taskId: result.taskId,
        sponsored: true,
      };
    } catch (error) {
      console.log("Gelato sponsorship failed, falling back to direct deployment:", error);
    }
  }
  
  // Fallback to direct deployment (requires wallet funds)
  const tx = await wallet.sendTransaction({
    to: CREATE2_FACTORY,
    data: deployData,
    gasLimit: 3000000n,
  });
  
  const receipt = await tx.wait();
  
  return {
    address: create2Address,
    txHash: receipt?.hash,
    sponsored: false,
  };
}

// Direct deployment without CREATE2
async function deployDirect(
  provider: ethers.JsonRpcProvider,
  wallet: ethers.Wallet,
  bytecode: string,
  constructorTypes: string[],
  constructorArgs: unknown[],
  gelatoApiKey: string | null,
  chainId: number
): Promise<{ address: string; txHash?: string; taskId?: string; sponsored: boolean }> {
  
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedArgs = constructorTypes.length > 0 
    ? abiCoder.encode(constructorTypes, constructorArgs)
    : "0x";
  
  const deployData = bytecode + encodedArgs.slice(2);
  
  // Calculate the expected address
  const nonce = await provider.getTransactionCount(wallet.address);
  const expectedAddress = ethers.getCreateAddress({ from: wallet.address, nonce });
  
  // Get current gas prices
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || 1000000000n;
  
  if (gelatoApiKey) {
    // Use Gelato sponsored call for gasless deployment
    const response = await fetch("https://api.gelato.digital/relays/v2/sponsored-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chainId: chainId.toString(),
        target: "0x0000000000000000000000000000000000000000", // Contract creation
        data: deployData,
        sponsorApiKey: gelatoApiKey,
        retries: 3,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        address: expectedAddress,
        taskId: result.taskId,
        sponsored: true,
      };
    } else {
      const errorText = await response.text();
      console.log(`Gelato sponsored call failed: ${errorText}`);
      
      // Try call-with-sync-fee as fallback
      const syncFeeResponse = await fetch("https://api.gelato.digital/relays/v2/call-with-sync-fee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chainId: chainId.toString(),
          target: "0x0000000000000000000000000000000000000000",
          data: deployData,
          feeToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          isRelayContext: false,
        }),
      });

      if (syncFeeResponse.ok) {
        const result = await syncFeeResponse.json();
        return {
          address: expectedAddress,
          taskId: result.taskId,
          sponsored: true,
        };
      }
      
      // Check wallet balance before attempting direct deployment
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        throw new Error(`Gelato sponsorship failed and wallet has no funds. Gelato error: ${errorText}`);
      }
    }
  }
  
  // Check if we have funds for direct deployment
  const balance = await provider.getBalance(wallet.address);
  if (balance === 0n) {
    throw new Error("Wallet has no funds and GELATO_API_KEY is not configured for sponsored deployment.");
  }
  
  // Direct deployment as last resort
  const tx = await wallet.sendTransaction({
    data: deployData,
    gasLimit: 5000000n,
    gasPrice,
  });
  
  const receipt = await tx.wait();
  const deployedAddress = receipt?.contractAddress || expectedAddress;
  
  return {
    address: deployedAddress,
    txHash: receipt?.hash,
    sponsored: false,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const deployerPrivateKey = Deno.env.get("DEPLOYER_PRIVATE_KEY");
    const gelatoApiKey = Deno.env.get("GELATO_API_KEY") || null;

    if (!deployerPrivateKey) {
      throw new Error("DEPLOYER_PRIVATE_KEY not configured. Please add it in your backend secrets.");
    }

    const { network, contracts, useCreate2 = false } = await req.json();

    if (!network || !NETWORK_CONFIG[network]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid network: ${network}. Supported: ${Object.keys(NETWORK_CONFIG).join(", ")}`,
          supportedNetworks: Object.keys(NETWORK_CONFIG),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const config = NETWORK_CONFIG[network];
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(deployerPrivateKey, provider);

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    
    console.log(`Deploying to ${network} (chainId: ${config.chainId})`);
    console.log(`Deployer: ${wallet.address}`);
    console.log(`Balance: ${balanceEth} ETH`);
    console.log(`Gelato sponsorship: ${gelatoApiKey ? "enabled" : "disabled"}`);

    const deployedContracts: Record<string, {
      address: string;
      txHash?: string;
      taskId?: string;
      sponsored: boolean;
      explorerUrl: string;
    }> = {};
    
    const contractsToDeploy = contracts || ["FlashArbExecutor", "GaslessRelayer", "PositionRebalancer"];

    for (const contractName of contractsToDeploy) {
      console.log(`\nDeploying ${contractName}...`);
      
      let constructorTypes: string[] = [];
      let constructorArgs: unknown[] = [];
      
      switch (contractName) {
        case "FlashArbExecutor":
          constructorTypes = ["address", "address", "address"];
          constructorArgs = [config.aavePool, config.uniswapRouter, config.sushiRouter];
          break;
        case "GaslessRelayer":
          constructorTypes = ["address"];
          constructorArgs = [config.gelatoRelay];
          break;
        case "PositionRebalancer":
          constructorTypes = ["address", "address"];
          constructorArgs = [config.aavePool, config.uniswapRouter];
          break;
        default:
          console.log(`Unknown contract: ${contractName}, skipping`);
          continue;
      }

      const contractData = CONTRACTS[contractName as keyof typeof CONTRACTS];
      if (!contractData) {
        console.log(`No bytecode for ${contractName}, skipping`);
        continue;
      }

      try {
        let result;
        
        if (useCreate2) {
          // Use CREATE2 for deterministic addresses
          const salt = ethers.id(`${contractName}-${network}-v1`);
          result = await deployViaCreate2Factory(
            provider,
            wallet,
            contractData.bytecode,
            salt,
            gelatoApiKey,
            config.chainId
          );
        } else {
          // Direct deployment
          result = await deployDirect(
            provider,
            wallet,
            contractData.bytecode,
            constructorTypes,
            constructorArgs,
            gelatoApiKey,
            config.chainId
          );
        }
        
        deployedContracts[contractName] = {
          ...result,
          explorerUrl: `${config.explorerUrl}/address/${result.address}`,
        };
        
        console.log(`✅ ${contractName} deployed: ${result.address}`);
        if (result.taskId) {
          console.log(`   Gelato Task: ${result.taskId}`);
        }
        if (result.txHash) {
          console.log(`   TX: ${result.txHash}`);
        }
        
      } catch (deployError) {
        console.error(`Failed to deploy ${contractName}:`, deployError);
        deployedContracts[contractName] = {
          address: "FAILED",
          sponsored: false,
          explorerUrl: "",
          txHash: String(deployError),
        };
      }
    }

    // Generate edge function config update instructions
    const configUpdate = {
      network,
      chainId: config.chainId,
      contracts: Object.fromEntries(
        Object.entries(deployedContracts)
          .filter(([, v]) => v.address !== "FAILED")
          .map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), v.address])
      ),
    };

    return new Response(
      JSON.stringify({
        success: true,
        network,
        chainId: config.chainId,
        deployer: wallet.address,
        balance: balanceEth,
        contracts: deployedContracts,
        configUpdate,
        gelatoSponsored: !!gelatoApiKey,
        message: gelatoApiKey 
          ? "Deployment submitted via Gelato Relay. Check task IDs for status."
          : balance === 0n 
            ? "Wallet has no funds. Please fund the deployer wallet or add GELATO_API_KEY for sponsored deployment."
            : "Deployment complete.",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Deployment error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        hint: "Make sure DEPLOYER_PRIVATE_KEY is set and the wallet has funds, or add GELATO_API_KEY for sponsored deployment.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
