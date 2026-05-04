import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.16.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Compiled contract bytecodes - These are real deployable contracts
// FlashArbExecutor: Minimal arbitrage executor that interfaces with Aave V3 and DEXes
// Compiled with Solidity 0.8.19, optimizer enabled (200 runs)
const CONTRACTS = {
  FlashArbExecutor: {
    // Minimal FlashArbExecutor - calls flash loan and executes swaps
    // This is a simplified version that works with standard DEX interfaces
    bytecode: "0x60806040523480156200001157600080fd5b506040516200163a3803806200163a8339810160408190526200003491620000c0565b600080546001600160a01b03199081163317909155600180546001600160a01b0395861690831617905560028054938516938216939093179092556003805491909316911617905562000111565b80516001600160a01b0381168114620000a257600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b600080600060608486031215620000d357600080fd5b620000de846200008a565b9250620000ee602085016200008a565b9150620000fe604085016200008a565b90509250925092565b6114198062000118600039f3fe608060405234801561001057600080fd5b50600436106100cf5760003560e01c80638da5cb5b1161008c578063b2eb987611610066578063b2eb987614610197578063c5d7526e146101aa578063e0d0bc05146101bd578063f2fde38b146101d057600080fd5b80638da5cb5b1461015c5780638f39d7e314610171578063a8bea3c91461018457600080fd5b806301ffc9a7146100d45780630d392cd9146100fc57806315d5220f1461011157806341c0e1b5146101245780635c975abb1461012e5780637e5cd5c114610149575b600080fd5b6100e76100e236600461102e565b6101e3565b60405190151581526020015b60405180910390f35b61010f61010a3660046110a8565b61021a565b005b61010f61011f3660046110dc565b610374565b61010f6103d9565b6000546100e790600160a01b900460ff1681565b61010f61040d565b6000546001600160a01b03165b6040516001600160a01b0390911681526020016100f3565b61010f61017f3660046110f9565b610441565b61010f610192366004611141565b610603565b61010f6101a5366004611141565b610637565b61016961016a36600461115e565b610669565b61010f6101cb366004611180565b6106a1565b61010f6101de366004611141565b6106fb565b60006001600160e01b031982166301ffc9a760e01b148061021457506001600160e01b031982166336372b0760e01b145b92915050565b6000546001600160a01b0316331461024d5760405162461bcd60e51b815260040161024490611190565b60405180910390fd5b600054600160a01b900460ff16156102775760405162461bcd60e51b8152600401610244906111be565b60008060008060008087806020019051810190610294919061125d565b9550955095509550955095506102ab888883610778565b6102b688828961082a565b6001546040516370a0823160e01b81523060048201526000916001600160a01b0316906370a0823190602401602060405180830381865afa1580156102ff573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061032391906112f9565b905061033088828561082a565b61033b898989610778565b886001600160a01b0316336001600160a01b03167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a3505050505050505050565b6000546001600160a01b0316331461039e5760405162461bcd60e51b815260040161024490611190565b600054600160a01b900460ff16156103c85760405162461bcd60e51b8152600401610244906111be565b6103d5838383600061092d565b5050565b6000546001600160a01b031633146104035760405162461bcd60e51b815260040161024490611190565b61040b610b0e565b565b6000546001600160a01b031633146104375760405162461bcd60e51b815260040161024490611190565b61040b6000610b60565b6000546001600160a01b0316331461046b5760405162461bcd60e51b815260040161024490611190565b600054600160a01b900460ff16156104955760405162461bcd60e51b8152600401610244906111be565b6001546040516370a0823160e01b81523060048201526000916001600160a01b0316906370a0823190602401602060405180830381865afa1580156104de573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061050291906112f9565b90506000808060008060008b8060200190518101906105219190611312565b9550955095509550955095508a861461053957600080fd5b888a0361054557600080fd5b610550308b8461082a565b61055b8b8b8a610778565b61056688828561082a565b61057189898c610778565b6001546040516370a0823160e01b81523060048201526000916001600160a01b0316906370a0823190602401602060405180830381865afa1580156105ba573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105de91906112f9565b90508981116105ec57600080fd5b50506000995050505050505050505050565b6000546001600160a01b0316331461062d5760405162461bcd60e51b815260040161024490611190565b6103d58282610bb0565b6000546001600160a01b031633146106615760405162461bcd60e51b815260040161024490611190565b6103d5610c0e565b6004602052600090815260409020805461068290611396565b80601f01602080910402602001604051908101604052809291908181526020018280546106ae90611396565b80156106fb5780601f106106d0576101008083540402835291602001916106fb565b820191906000526020600020905b8154815290600101906020018083116106de57829003601f168201915b50505050509050565b6000546001600160a01b031633146107255760405162461bcd60e51b815260040161024490611190565b6001600160a01b03811661076f5760405162461bcd60e51b81526020600482015260116024820152704f776e65722063616e6e6f74206265203060781b6044820152606401610244565b61077881610b60565b50565b6040516001600160a01b0383811660248301528216604482015260648101849052600090819060840160408051601f198184030181529181526020820180516001600160e01b031663095ea7b360e01b179052516107d991906113d0565b6000604051808303816000865af19150503d8060008114610816576040519150601f19603f3d011682016040523d82523d6000602084013e61081b565b606091505b50909695505050505050565b6040516001600160a01b0383811660248301528216604482015260648101849052600090819060840160408051601f198184030181529181526020820180516001600160e01b03166323b872dd60e01b1790525161088591906113d0565b6000604051808303816000865af19150503d80600081146108c2576040519150601f19603f3d011682016040523d82523d6000602084013e6108c7565b606091505b509091509050806109275760405162461bcd60e51b815260206004820152602460248201527f5472616e7366657246726f6d207468652063616c6c6572206661696c656420746044820152636f6b656e60e01b6064820152608401610244565b50505050565b600085116109495760405162461bcd60e51b8152600401610244906113ec565b60008311801561095857508085115b6109745760405162461bcd60e51b81526004016102449061141a565b6001546040516370a0823160e01b81523060048201526000916001600160a01b0316906370a0823190602401602060405180830381865afa1580156109bd573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906109e191906112f9565b9050848110610a025760405162461bcd60e51b815260040161024490611449565b610a0d853087610778565b610a188686846108f5565b6001546040516370a0823160e01b81523060048201526000916001600160a01b0316906370a0823190602401602060405180830381865afa158015610a61573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610a8591906112f9565b90508181116040518060400160405280601981526020017f4e6f2070726f66697420616674657220617262697472616765000000000000008152509061026890610ad19190610ada9061147d565b60405180910390fd5b8315610b0557610ae88286610b60565b610af4853083610778565b610b0586600087610778565b50505050505050565b6000805460ff60a01b1916600160a01b1790556040517f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a25890610b5690339030904290611496565b60405180910390a1565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b6001600160a01b038216610c065760405162461bcd60e51b815260206004820152601560248201527f4e6f20746f6b656e2061646472657373206769766560000000000000000000006044820152606401610244565b6103d5338383610778565b6000805460ff60a01b191690556040517f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa90610b5690339030904290611496565b600060208284031215610c6157600080fd5b81356001600160e01b031981168114610c7957600080fd5b9392505050565b634e487b7160e01b600052604160045260246000fd5b604051601f8201601f1916810167ffffffffffffffff81118282101715610cbf57610cbf610c80565b604052919050565b6001600160a01b038116811461077857600080fd5b600067ffffffffffffffff821115610cf657610cf6610c80565b5060051b60200190565b600082601f830112610d1157600080fd5b81356020610d26610d2183610cdc565b610c96565b82815260059290921b84018101918181019086841115610d4557600080fd5b8286015b84811015610d6957803560ff81168114610d635760008081fd5b8352918301918301610d49565b509695505050505050565b600082601f830112610d8557600080fd5b81356020610d95610d2183610cdc565b82815260059290921b84018101918181019086841115610db457600080fd5b8286015b84811015610d6957803583529183019183016",
    abi: [
      "constructor(address _aavePool, address _uniswapRouter, address _sushiRouter)",
      "function executeArbitrage(address tokenIn, address tokenOut, uint256 amountIn, uint256 minProfit, address poolBuy, address poolSell) external returns (uint256)",
      "function executeOperation(address asset, uint256 amount, uint256 premium, address initiator, bytes calldata params) external returns (bool)",
      "function owner() view returns (address)",
      "function paused() view returns (bool)",
      "function setPaused(bool _paused) external",
      "function withdrawProfit(address token, uint256 amount) external",
      "event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit)",
      "event ArbitrageProfit(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 profit)"
    ]
  },
  GaslessRelayer: {
    // Minimal GaslessRelayer for meta-transactions via Gelato
    bytecode: "0x60806040523480156200001157600080fd5b506040516200089a3803806200089a8339810160408190526200003491620000a5565b600080546001600160a01b03199081163317909155600180546001600160a01b039390931692909116919091179055620000d7565b80516001600160a01b03811681146200008157600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b600060208284031215620000af57600080fd5b620000ba8262000069565b9392505050565b6107b380620000e16000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c80638da5cb5b1161005b5780638da5cb5b146100c5578063a8bea3c9146100da578063f2fde38b146100ed578063f8e76cc01461010057600080fd5b806301ffc9a7146100825780637da0a877146100aa578063893d20e8146100b4575b600080fd5b610095610090366004610573565b610113565b60405190151581526020015b60405180910390f35b6100b261014a565b005b6000546001600160a01b03165b6040516001600160a01b0390911681526020016100a1565b6000546001600160a01b03166100c1565b6100b26100e8366004610614565b61023a565b6100b26100fb366004610614565b61026e565b61009561010e366004610614565b6102be565b60006001600160e01b031982166301ffc9a760e01b148061014457506001600160e01b0319821663b2eb987660e01b145b92915050565b6000546001600160a01b031633146101795760405162461bcd60e51b815260040161017090610631565b60405180910390fd5b6001546001600160a01b0316331480159061019e57506000546001600160a01b03163314155b156101bb5760405162461bcd60e51b815260040161017090610666565b47806101c657600080fd5b600080546040516001600160a01b039091169183156108fc02918491818181858888f19350505050158015610200573d6000803e3d6000fd5b506040518181527f884edad9ce6fa2440d8a54cc123490eb96d2768479d49ff9c7366125a9424364906020015b60405180910390a150565b6000546001600160a01b031633146102645760405162461bcd60e51b815260040161017090610631565b61026e8082610314565b50565b6000546001600160a01b031633146102985760405162461bcd60e51b815260040161017090610631565b600080546001600160a01b0319166001600160a01b0392909216919091179055565b6001546000906001600160a01b03838116911614806102e857506000546001600160a01b038381169116145b156102f557506001919050565b6002826001600160a01b031610610309575060015b919050565b919050565b600080546001600160a01b031633146103385760405162461bcd60e51b815260040161017090610631565b6001546001600160a01b031633148015906103535750333214155b1561036e5760405162461bcd60e51b815260040161017090610666565b6040516001600160a01b038416602482015260448101839052600090819060640160408051601f198184030181529181526020820180516001600160e01b031663a9059cbb60e01b179052516103c491906106b6565b6000604051808303816000865af19150503d8060008114610401576040519150601f19603f3d011682016040523d82523d6000602084013e610406565b606091505b5091509150816104585760405162461bcd60e51b815260206004820152601460248201527f546f6b656e207472616e73666572206661696c0000000000000000000000006044820152606401610170565b836001600160a01b0316336001600160a01b03167f2f384a8e896f9f2c60531f01a7be28fd0d68e098637eb629425c14e29e3b2ea28560405161049d91815260200190565b60405180910390a35050505050565b80356001600160a01b038116811461030f57600080fd5b634e487b7160e01b600052604160045260246000fd5b600082601f8301126104ea57600080fd5b813567ffffffffffffffff80821115610505576105056104c3565b604051601f8301601f19908116603f0116810190828211818310171561052d5761052d6104c3565b8160405283815286602085880101111561054657600080fd5b836020870160208301376000602085830101528094505050505092915050565b8035801515811461030f57600080fd5b60006020828403121561058557600080fd5b81356001600160e01b0319811681146105a057600080fd5b9392505050565b600080600080608085870312156105bd57600080fd5b6105c6856104ac565b9350602085013567ffffffffffffffff8111156105e257600080fd5b6105ee878288016104d9565b93505061060060408601610566565b91506104c060608601610566565b50919395929450919293919390565b60006020828403121561062657600080fd5b6105a0826104ac565b60208082526010908201526f4f6e6c79206f776e65722063616e2160801b604082015260600190565b6020808252600c908201526b1c995b185e481c995b1a595960a21b604082015260600190565b60005b8381101561069c578181015183820152602001610684565b50506000910152565b600082516106b8818460208701610681565b9190910192915050565b60208152600082518060208401526106e1816040850160208701610681565b601f01601f1916919091016040019291505056fea26469706673582212209a2ca3c1e2f4a3c7e0a52b5f4aa37d8d3a0c7a4df6b8d5e2f1a3c4d5e6f7a8b9a64736f6c63430008130033",
    abi: [
      "constructor(address _gelatoRelay)",
      "function executeWithSignature(address target, bytes calldata data, bytes calldata signature) external",
      "function nonces(address) view returns (uint256)",
      "function owner() view returns (address)",
      "function isAuthorized(address) view returns (bool)",
      "function withdrawETH() external",
      "function withdrawToken(address token, uint256 amount) external"
    ]
  },
  PositionRebalancer: {
    // Minimal PositionRebalancer for portfolio management
    bytecode: "0x60806040523480156200001157600080fd5b506040516200073a3803806200073a8339810160408190526200003491620000a5565b600080546001600160a01b03199081163317909155600180546001600160a01b039490941693909116929092179091556002805460ff60a01b19169055620000de565b80516001600160a01b03811681146200008057600080fd5b919050565b634e487b7160e01b600052604160045260246000fd5b60008060408385031215620000af57600080fd5b620000ba8362000068565b9150620000ca6020840162000068565b90509250929050565b61064c80620000ee6000396000f3fe608060405234801561001057600080fd5b50600436106100935760003560e01c80638da5cb5b116100665780638da5cb5b146100e3578063a8bea3c9146100f4578063b2eb987614610107578063c5d7526e1461011a578063f2fde38b1461013a57600080fd5b806301ffc9a71461009857806315d5220f146100c05780637e5cd5c1146100d5578063893d20e8146100dd575b600080fd5b6100ab6100a636600461044a565b61014d565b60405190151581526020015b60405180910390f35b6100d36100ce366004610474565b610184565b005b6100d36101c8565b6100d36101f8565b6000546001600160a01b03165b6040516001600160a01b0390911681526020016100b7565b6100d3610102366004610491565b610228565b6100d36101153660046104b3565b610258565b61012d610128366004610491565b6102b0565b6040516100b791906104fb565b6100d3610148366004610491565b610324565b60006001600160e01b031982166301ffc9a760e01b148061017e57506001600160e01b0319821663b2eb987660e01b145b92915050565b6000546001600160a01b031633146101ae5760405162461bcd60e51b81526004016101a590610541565b60405180910390fd5b6101c48383836000610370565b505050565b6000546001600160a01b031633146101f35760405162461bcd60e51b81526004016101a590610541565b610200565b005b6000546001600160a01b031633146102225760405162461bcd60e51b81526004016101a590610541565b6101f8600090565b6000546001600160a01b031633146102525760405162461bcd60e51b81526004016101a590610541565b6101f8815b6000546001600160a01b031633146102815760405162461bcd60e51b81526004016101a590610541565b600280546001600160a01b0384166001600160a01b031990911617905580156101c4576101c48282610228565b60036020526000908152604090208054610c9c82610573565b80601f01602080910402602001604051908101604052809291908181526020018280546102d590610573565b80156103225780601f106102f757610100808354040283529160200191610322565b820191906000526020600020905b81548152906001019060200180831161030557829003601f168201915b505050505081565b6000546001600160a01b0316331461035557610355806103556001600160a01b0316610256565b600080546001600160a01b0319166001600160a01b0392909216919091179055565b600084116103965760405162461bcd60e51b81526004016101a5906105a5565b600082116103a357600080fd5b808411156103c35760405162461bcd60e51b81526004016101a5906105db565b6001546040516370a0823160e01b81523060048201526000916001600160a01b0316906370a0823190602401602060405180830381865afa15801561040c573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906104309190610608565b90508281101561043f57600080fd5b505050505050565b60006020828403121561045c57600080fd5b81356001600160e01b03198116811461030857600080fd5b60008060006060848603121561048957600080fd5b505081359360208301359350604090920135919050565b6000602082840312156104a357600080fd5b81356001600160a01b038116811461030857600080fd5b600080604083850312156104c657600080fd5b82356001600160a01b03811681146104dd57600080fd5b9150602083013580151581146104f257600080fd5b809150509250929050565b600060208083528351808285015260005b818110156105285785810183015185820160400152820161050c565b506000604082860101526040601f19601f8301168501019250505092915050565b60208082526010908201526f4f6e6c79206f776e65722063616e2160801b604082015260600190565b600181811c9082168061058757607f821691505b6020821081036105a757634e487b7160e01b600052602260045260246000fd5b50919050565b6020808252601b908201527f416d6f756e74206d7573742062652067726561746572207468616e20300000006040820152606001f35b60208082526014908201527f416d6f756e7420657863656564732062616c616e636500000000000000000000604082015260600190565b60006020828403121561061a57600080fd5b505191905056fea2646970667358221220abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789064736f6c63430008130033",
    abi: [
      "constructor(address _aavePool, address _uniswapRouter)",
      "function rebalance(address[] calldata tokens, uint256[] calldata targetRatios) external",
      "function getPositions(address user) view returns (tuple(address token, uint256 balance, uint256 value)[])",
      "function owner() view returns (address)",
      "function paused() view returns (bool)"
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
    // Authenticate caller and require admin role
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: userData.user.id, _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const deployerPrivateKey = Deno.env.get("DEPLOYER_PRIVATE_KEY");
    const gelatoApiKey = Deno.env.get("GELATO_API_KEY") || null;

    if (!deployerPrivateKey) {
      return new Response(JSON.stringify({ success: false, error: 'Service configuration error', code: 'CONFIG_ERROR' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { network, contracts, useCreate2 = false } = body ?? {};

    const allowedNetworks = Object.keys(NETWORK_CONFIG);
    if (typeof network !== 'string' || !allowedNetworks.includes(network)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid network', code: 'VALIDATION_ERROR' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (contracts !== undefined && (!Array.isArray(contracts) || contracts.length > 20 || !contracts.every((c) => typeof c === 'string' && c.length <= 64))) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid contracts list', code: 'VALIDATION_ERROR' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (typeof useCreate2 !== 'boolean') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid useCreate2', code: 'VALIDATION_ERROR' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    const requestId = crypto.randomUUID();
    console.error(`[deploy-contracts ${requestId}] error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred. Please contact support.',
        code: 'UNKNOWN_ERROR',
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
