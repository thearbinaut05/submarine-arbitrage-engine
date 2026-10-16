import { ethers, network, upgrades } from "hardhat";
import { NETWORK_CONFIG, DeployedContracts } from "./config";
import * as fs from "fs"; import * as path from "path";
async function main(){
 const cfg=NETWORK_CONFIG[network.name]; if(!cfg) throw new Error(`No config for ${network.name}`); if(cfg.supported===false) throw new Error(`${cfg.name} is unsupported for Aave executor`);
 const [deployer]=await ethers.getSigners(); const bal=await ethers.provider.getBalance(deployer.address);
 console.log(`Network ${cfg.name} (${cfg.chainId}) deployer ${deployer.address} balance ${ethers.formatEther(bal)}`);
 if(bal<ethers.parseEther("0.02")) throw new Error("Need >=0.02 native token for deployment gas");
 const routers=[cfg.uniswapV3Router,cfg.sushiswapRouter||cfg.quickswapRouter||cfg.aerodromeRouter].filter(Boolean) as string[];
 const deployed:DeployedContracts={network:network.name,deployer:deployer.address,timestamp:Date.now(),txHashes:{},flashArbExecutor:"",gaslessRelayer:"",positionRebalancer:"",gasPoolSponsor:"",constructorArgs:{}};
 // GasPoolSponsor (proxy, relayer patched after GaslessRelayer deploy via initialize order: deploy with placeholder then owner must call setGasPoolSponsor flow below)
 const GasPool=await ethers.getContractFactory("GasPoolSponsor");
 const paymasters=(cfg.paymasters&&cfg.paymasters.length===3?cfg.paymasters:[ethers.ZeroAddress,ethers.ZeroAddress,ethers.ZeroAddress]) as [string,string,string];
 // GaslessRelayer first with zero gasPool, then GasPool with relayer, then setGasPoolSponsor
 const Relayer=await ethers.getContractFactory("GaslessRelayer");
 const relayer:any=await upgrades.deployProxy(Relayer,[cfg.gelatoRelay,ethers.ZeroAddress],{kind:"uups",initializer:"initialize"}); await relayer.waitForDeployment(); deployed.gaslessRelayer=await relayer.getAddress(); deployed.txHashes.gaslessRelayer=relayer.deploymentTransaction()?.hash||"";
 const gasPool:any=await upgrades.deployProxy(GasPool,[deployed.gaslessRelayer,paymasters],{kind:"uups",initializer:"initialize"}); await gasPool.waitForDeployment(); deployed.gasPoolSponsor=await gasPool.getAddress(); deployed.txHashes.gasPoolSponsor=gasPool.deploymentTransaction()?.hash||"";
 await (await relayer.setGasPoolSponsor(deployed.gasPoolSponsor)).wait();
 // PositionRebalancer: NON-upgradeable in current source (constructor only) - deploy directly, NOT via proxy
 const Rebalancer=await ethers.getContractFactory("PositionRebalancer"); const rebalancer=await Rebalancer.deploy(cfg.aavePoolProvider); await rebalancer.waitForDeployment(); deployed.positionRebalancer=await rebalancer.getAddress(); deployed.txHashes.positionRebalancer=rebalancer.deploymentTransaction()?.hash||"";
 // FlashArbExecutor UUPS: constructor(provider, uni, sushi) + initialize(uni, sushi)
 const Executor=await ethers.getContractFactory("FlashArbExecutor"); const r0=routers[0]||ethers.ZeroAddress; const r1=routers[1]||ethers.ZeroAddress;
 const executor:any=await upgrades.deployProxy(Executor,[r0,r1],{kind:"uups",initializer:"initialize",constructorArgs:[cfg.aavePoolProvider,r0,r1]}); await executor.waitForDeployment(); deployed.flashArbExecutor=await executor.getAddress(); deployed.txHashes.flashArbExecutor=executor.deploymentTransaction()?.hash||"";
 deployed.constructorArgs={FlashArbExecutor:[cfg.aavePoolProvider,r0,r1],GaslessRelayer:[cfg.gelatoRelay],PositionRebalancer:[cfg.aavePoolProvider]};
 // Authorise service relayer if env set (owner does this separately if preferred)
 const svc=process.env.SERVICE_RELAYER_ADDRESS; if(svc){ await (await executor.setAuthorizedRelayer(svc,true)).wait(); console.log(`Authorized relayer ${svc}`); }
 for(const r of routers){ await (await executor.setAllowedSwapTarget(r,true)).wait(); }
 const dir=path.join(__dirname,"../deployments"); fs.mkdirSync(dir,{recursive:true}); const f=path.join(dir,`${network.name}.json`); fs.writeFileSync(f,JSON.stringify(deployed,null,2));
 console.log(`Saved ${f}`); console.log(deployed);
 console.log("NEXT: set FLASH_ARB_EXECUTOR secret in Supabase, authorize SERVICE_RELAYER_ADDRESS, fund deployer/service wallet for gas, first tiny test.");
}
main().catch(e=>{console.error(e);process.exit(1)});
