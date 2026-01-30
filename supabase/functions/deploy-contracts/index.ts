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

// Token configurations per network
const TOKENS: Record<string, Record<string, string>> = {
  mainnet: {
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EescdeCB5BE1023a",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    AAVE: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  },
  arbitrum: {
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "USDC.e": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    WBTC: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    ARB: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    GMX: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
    LINK: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
  },
  polygon: {
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    "USDC.e": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    AAVE: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
    LINK: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
  },
  bsc: {
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    DAI: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
    BTCB: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    XVS: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
  },
  optimism: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    "USDC.e": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    WBTC: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
    OP: "0x4200000000000000000000000000000000000042",
    LINK: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6",
  },
  base: {
    WETH: "0x4200000000000000000000000000000000000006",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    USDbC: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    cbETH: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
  },
  avalanche: {
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    "USDC.e": "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    "USDT.e": "0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
    DAI: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    "WBTC.e": "0x50b7545627a5162F82A992c33b87aDc75187B218",
    "WETH.e": "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    JOE: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
  },
};

// Network configurations with RPC endpoints
const NETWORK_CONFIG: Record<string, {
  chainId: number;
  rpcUrl: string;
  aavePool: string;
  uniswapRouter: string;
  sushiRouter: string;
  gelatoRelay: string;
  explorerUrl: string;
  nativeToken: string;
  defaultGasPrice?: bigint;
}> = {
  mainnet: {
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    aavePool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiRouter: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://etherscan.io",
    nativeToken: "ETH",
    defaultGasPrice: 20000000000n, // 20 gwei
  },
  arbitrum: {
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://arbiscan.io",
    nativeToken: "ETH",
    defaultGasPrice: 100000000n, // 0.1 gwei
  },
  polygon: {
    chainId: 137,
    rpcUrl: "https://polygon-bor-rpc.publicnode.com",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://polygonscan.com",
    nativeToken: "MATIC",
    defaultGasPrice: 50000000000n, // 50 gwei
  },
  bsc: {
    chainId: 56,
    rpcUrl: "https://bsc-rpc.publicnode.com",
    aavePool: "0x0000000000000000000000000000000000000000",
    uniswapRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // PancakeSwap
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://bscscan.com",
    nativeToken: "BNB",
    defaultGasPrice: 3000000000n, // 3 gwei
  },
  optimism: {
    chainId: 10,
    rpcUrl: "https://optimism-rpc.publicnode.com",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    sushiRouter: "0x0000000000000000000000000000000000000000",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://optimistic.etherscan.io",
    nativeToken: "ETH",
    defaultGasPrice: 1000000n, // 0.001 gwei
  },
  base: {
    chainId: 8453,
    rpcUrl: "https://base-rpc.publicnode.com",
    aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    uniswapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481", // UniswapV3 on Base
    sushiRouter: "0x0000000000000000000000000000000000000000",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://basescan.org",
    nativeToken: "ETH",
    defaultGasPrice: 1000000n, // 0.001 gwei
  },
  avalanche: {
    chainId: 43114,
    rpcUrl: "https://avalanche-c-chain-rpc.publicnode.com",
    aavePool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    uniswapRouter: "0x0000000000000000000000000000000000000000",
    sushiRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    gelatoRelay: "0xaBcC9b596420A9E9172FD5938620E265a0f9Df92",
    explorerUrl: "https://snowtrace.io",
    nativeToken: "AVAX",
    defaultGasPrice: 25000000000n, // 25 nAVAX
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
  chainId: number,
  defaultGasPrice?: bigint
): Promise<{ address: string; txHash?: string; taskId?: string; sponsored: boolean }> {
  
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedArgs = constructorTypes.length > 0 
    ? abiCoder.encode(constructorTypes, constructorArgs)
    : "0x";
  
  const deployData = bytecode + encodedArgs.slice(2);
  
  // Calculate the expected address
  const nonce = await provider.getTransactionCount(wallet.address);
  const expectedAddress = ethers.getCreateAddress({ from: wallet.address, nonce });
  
  // Get current gas prices with fallback
  let gasPrice = defaultGasPrice || 1000000000n;
  try {
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice) {
      gasPrice = feeData.gasPrice;
    }
  } catch (err) {
    console.log("Failed to get gas price, using default:", err);
  }
  
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
    
    // Helper to delay between deployments to avoid rate limits
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < contractsToDeploy.length; i++) {
      const contractName = contractsToDeploy[i];
      
      // Add delay between contracts to avoid Gelato rate limits (skip first)
      if (i > 0 && gelatoApiKey) {
        console.log("Waiting 15 seconds to avoid rate limits...");
        await delay(15000);
      }
      
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
            config.chainId,
            config.defaultGasPrice
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

    // Get tokens for this network
    const networkTokens = TOKENS[network] || {};

    return new Response(
      JSON.stringify({
        success: true,
        network,
        chainId: config.chainId,
        nativeToken: config.nativeToken,
        deployer: wallet.address,
        balance: balanceEth,
        contracts: deployedContracts,
        tokens: networkTokens,
        configUpdate,
        gelatoSponsored: !!gelatoApiKey,
        message: gelatoApiKey 
          ? "Deployment submitted via Gelato Relay. Check task IDs for status."
          : balance === 0n 
            ? "Wallet has no funds. Please fund the deployer wallet or add GELATO_API_KEY for sponsored deployment."
            : "Deployment complete.",
        timestamp: new Date().toISOString(),
        supportedNetworks: Object.keys(NETWORK_CONFIG),
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
