import { ethers } from 'hardhat'
import { config as hardhatConfig } from '../contracts/hardhat.config'
import fs from 'fs'

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Deploying with:', deployer.address)

  // Existing relayer (update after deploy)
  const GASLESS_RELAYER = '0xYourGaslessRelayerAddress' // From previous deployment
  const PAYMASTERS = [
    '0xdCBE0C1A00e4Cf24AE77c52125e6e6b4F7C6Db4e',
    '0x888888888888Ec68A58AB8094Cc1AD20Ba3D2402',
    '0x7D3201fa7a85c0A5f9fA1c0C6b9D0B784368d2ac'
  ]

  const GasPoolSponsor = await ethers.getContractFactory('GasPoolSponsor')
  const gasPool = await GasPoolSponsor.deploy()
  await gasPool.waitForDeployment()

  const gasPoolAddress = await gasPool.getAddress()
  console.log('GasPoolSponsor deployed to:', gasPoolAddress)

  // Update check-gas-pool function with address
  console.log('Update supabase/functions/check-gas-pool/index.ts with GAS_POOL_CONTRACT = "' + gasPoolAddress + '"')

  // Verify
  if (hardhatConfig.networks.hardhat.chainId === 31337) {
    console.log('Local deploy - skip verify')
  } else {
    console.log('Run npx hardhat verify --network mainnet', gasPoolAddress, GASLESS_RELAYER, JSON.stringify(PAYMASTERS))
  }

  // Save deployment
  fs.writeFileSync('./deployments/gas-pool.json', JSON.stringify({ gasPoolSponsor: gasPoolAddress }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

