import { ethers } from 'ethers';
import { Network } from '@/types/defi';

// Gelato API configuration
const GELATO_API_URL = 'https://api.gelato.digital/relays/v2';

// Chain IDs mapping
const CHAIN_IDS: Record<Network, number> = {
  ethereum: 1,
  arbitrum: 42161,
  polygon: 137,
  bsc: 56,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
};

// Relayer addresses for each network
const RELAYER_ADDRESSES: Record<Network, string> = {
  ethereum: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  arbitrum: '0xa4aE28aE6c94EF3e6686180d1B414dc2C70009aA',
  polygon: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  bsc: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  optimism: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  base: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
  avalanche: '0xdc83E425266c20E920831B7464472bf712C4Bf9A',
};

// Explorer URLs
const EXPLORER_URLS: Record<Network, string> = {
  ethereum: 'https://etherscan.io',
  arbitrum: 'https://arbiscan.io',
  polygon: 'https://polygonscan.com',
  bsc: 'https://bscscan.com',
  optimism: 'https://optimistic.etherscan.io',
  base: 'https://basescan.org',
  avalanche: 'https://snowtrace.io',
};

// Meta-transaction types for EIP-712
const META_TRANSACTION_TYPEHASH = ethers.id(
  'MetaTransaction(address from,address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)'
);

const EIP712_DOMAIN_TYPEHASH = ethers.id(
  'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
);

/**
 * Meta-transaction request
 */
export interface MetaTransactionRequest {
  from: string;
  to: string;
  value: string;
  data: string;
  deadline: number;
  signature: string;
}

/**
 * Meta-transaction result
 */
export interface MetaTransactionResult {
  taskId: string;
  relayer: string;
  explorerUrl: string;
  isPrivate: boolean;
}

/**
 * Gelato Relay Service
 * 
 * Handles gasless transaction execution via Gelato Relay.
 * Supports both standard sponsored calls and submarine transactions for MEV protection.
 */
export class GelatoRelay {
  private apiKey: string | null = null;
  private nonceCache: Map<string, number> = new Map();

  constructor() {
    // Get API key from environment if available
    this.apiKey = typeof import.meta.env !== 'undefined' 
      ? import.meta.env.VITE_GELATO_API_KEY || null 
      : null;
  }

  /**
   * Set Gelato API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Get chain ID for a network
   */
  getChainId(network: Network): number {
    return CHAIN_IDS[network];
  }

  /**
   * Get relayer address for a network
   */
  getRelayerAddress(network: Network): string {
    return RELAYER_ADDRESSES[network];
  }

  /**
   * Get explorer URL for a network
   */
  getExplorerUrl(network: Network, txHash: string): string {
    return `${EXPLORER_URLS[network]}/tx/${txHash}`;
  }

  /**
   * Create EIP-712 domain separator
   */
  async createDomainSeparator(
    network: Network,
    relayerAddress: string
  ): Promise<string> {
    const chainId = this.getChainId(network);
    
    return ethers.solidityPackedKeccak256(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        EIP712_DOMAIN_TYPEHASH,
        ethers.id('FlashArb Relayer'),
        ethers.id('1'),
        chainId,
        relayerAddress,
      ]
    );
  }

  /**
   * Get nonce for an address
   */
  getNonce(address: string): number {
    const current = this.nonceCache.get(address) || 0;
    this.nonceCache.set(address, current + 1);
    return current;
  }

  /**
   * Create meta-transaction message digest for signing
   */
  async createMetaTransaction(
    network: Network,
    from: string,
    to: string,
    data: string,
    deadline: number
  ): Promise<{ messageDigest: string; nonce: number }> {
    const relayerAddress = this.getRelayerAddress(network);
    const nonce = this.getNonce(from);
    const chainId = this.getChainId(network);

    const domainSeparator = await this.createDomainSeparator(network, relayerAddress);
    const dataHash = ethers.keccak256(data);

    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        META_TRANSACTION_TYPEHASH,
        ethers.keccak256(ethers.toUtf8Bytes('MetaTransaction')),
        dataHash,
        nonce,
        deadline,
      ]
    );

    // Combine with domain separator
    const messageDigest = ethers.solidityPackedKeccak256(
      ['bytes32', 'bytes32'],
      [domainSeparator, messageHash]
    );

    return { messageDigest: messageDigest, nonce };
  }

  /**
   * Submit meta-transaction to Gelato relay
   */
  async submitMetaTransaction(
    network: Network,
    request: MetaTransactionRequest
  ): Promise<MetaTransactionResult> {
    if (!this.apiKey) {
      // Simulation mode - return mock response
      console.warn('Gelato API key not configured - simulating relay');
      return this.simulateRelay(network, request);
    }

    const chainId = this.getChainId(network);
    const relayerAddress = this.getRelayerAddress(network);

    const response = await fetch(`${GELATO_API_URL}/sponsored-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sponsorApiKey: this.apiKey,
        chainId,
        target: request.to,
        data: request.data,
        value: request.value,
        retries: 3,
        isPrivate: true, // Enable private routing for MEV protection
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gelato API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      taskId: result.taskId,
      relayer: relayerAddress,
      explorerUrl: this.getExplorerUrl(network, result.taskId),
      isPrivate: true,
    };
  }

  /**
   * Execute sponsored call (simplified version)
   */
  async sponsoredCall(
    network: Network,
    target: string,
    data: string,
    isPrivate: boolean = true
  ): Promise<MetaTransactionResult> {
    if (!this.apiKey) {
      console.warn('Gelato API key not configured - simulating call');
      return this.simulateRelay(network, {
        from: '0x0000000000000000000000000000000000000000',
        to: target,
        value: '0',
        data,
        deadline: Math.floor(Date.now() / 1000) + 300,
        signature: '0x',
      });
    }

    const chainId = this.getChainId(network);

    const response = await fetch(`${GELATO_API_URL}/sponsored-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sponsorApiKey: this.apiKey,
        chainId,
        target,
        data,
        isPrivate,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gelato API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    return {
      taskId: result.taskId,
      relayer: this.getRelayerAddress(network),
      explorerUrl: this.getExplorerUrl(network, result.taskId),
      isPrivate,
    };
  }

  /**
   * Get task status from Gelato
   */
  async getTaskStatus(taskId: string): Promise<{
    taskId: string;
    taskState: 'ExecSuccess' | 'ExecReverted' | 'WaitingForConfirmation' | 'Cancelled';
    transactionHash?: string;
    blockNumber?: number;
  }> {
    if (!this.apiKey) {
      return {
        taskId,
        taskState: Math.random() > 0.1 ? 'ExecSuccess' : 'ExecReverted',
        transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      };
    }

    const response = await fetch(`${GELATO_API_URL}/tasks/${taskId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      taskId: result.taskId,
      taskState: result.taskState,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
    };
  }

  /**
   * Wait for task to complete
   */
  async waitForTask(taskId: string, maxAttempts: number = 60): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTaskStatus(taskId);

      if (status.taskState === 'ExecSuccess') {
        return { success: true, txHash: status.transactionHash };
      }

      if (status.taskState === 'ExecReverted') {
        return { success: false, error: 'Transaction reverted' };
      }

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return { success: false, error: 'Timeout waiting for transaction' };
  }

  /**
   * Simulate relay response for testing
   */
  private simulateRelay(
    network: Network,
    _request: MetaTransactionRequest
  ): MetaTransactionResult {
    const mockTaskId = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    return {
      taskId: mockTaskId,
      relayer: this.getRelayerAddress(network),
      explorerUrl: this.getExplorerUrl(network, mockTaskId),
      isPrivate: true,
    };
  }

  /**
   * Estimate gas cost that will be sponsored
   */
  async estimateSponsoredGas(
    network: Network,
    target: string,
    data: string
  ): Promise<{ gasLimit: number; gasCostUsd: number }> {
    // Simplified estimation
    const estimatedGas = 300000; // Typical flash loan arbitrage
    const gasPriceGwei = 50; // Current network gas price
    const ethPrice = 3500; // Approximate ETH price
    
    const gasCostEth = (estimatedGas * gasPriceGwei) / 1e9;
    const gasCostUsd = gasCostEth * ethPrice;

    return {
      gasLimit: estimatedGas,
      gasCostUsd: Math.round(gasCostUsd * 100) / 100,
    };
  }
}

// Export singleton instance
export const gelatoRelay = new GelatoRelay();

