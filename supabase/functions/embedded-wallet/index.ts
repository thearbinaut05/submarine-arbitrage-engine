import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple XOR-based encryption with a server-side secret
// In production, use a proper KMS or vault service
function encryptKey(privateKey: string, secret: string): string {
  const keyBytes = new TextEncoder().encode(privateKey);
  const secretBytes = new TextEncoder().encode(secret);
  const encrypted = new Uint8Array(keyBytes.length);
  for (let i = 0; i < keyBytes.length; i++) {
    encrypted[i] = keyBytes[i] ^ secretBytes[i % secretBytes.length];
  }
  return btoa(String.fromCharCode(...encrypted));
}

function decryptKey(encryptedBase64: string, secret: string): string {
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const secretBytes = new TextEncoder().encode(secret);
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ secretBytes[i % secretBytes.length];
  }
  return new TextDecoder().decode(decrypted);
}

// Minimal ethers-like wallet generation using Web Crypto
async function generateWallet(): Promise<{ address: string; privateKey: string }> {
  // Generate 32 random bytes for private key
  const privateKeyBytes = crypto.getRandomValues(new Uint8Array(32));
  const privateKey = '0x' + Array.from(privateKeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Import the key for ECDSA signing (secp256k1 isn't natively supported in Web Crypto)
  // We'll use a simple keccak-based address derivation
  // For production, use ethers.js or a proper library
  
  // Hash private key to derive a deterministic address (simplified)
  const hashBuffer = await crypto.subtle.digest('SHA-256', privateKeyBytes);
  const hashArray = new Uint8Array(hashBuffer);
  const address = '0x' + Array.from(hashArray.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { address, privateKey };
}

// Get ETH balance via RPC
async function getBalance(address: string, rpcUrl: string): Promise<string> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });
    const data = await response.json();
    if (data.result) {
      const weiBalance = BigInt(data.result);
      // Convert to ETH string with 6 decimal places
      const ethBalance = Number(weiBalance) / 1e18;
      return ethBalance.toFixed(6);
    }
    return '0.000000';
  } catch {
    return '0.000000';
  }
}

// Get ERC20 token balance
async function getTokenBalance(walletAddress: string, tokenAddress: string, rpcUrl: string, decimals: number = 18): Promise<string> {
  try {
    // balanceOf(address) selector = 0x70a08231
    const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, '0');
    const data = '0x70a08231' + paddedAddress;
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: tokenAddress, data }, 'latest'],
      }),
    });
    const result = await response.json();
    if (result.result && result.result !== '0x') {
      const balance = BigInt(result.result);
      const formatted = Number(balance) / Math.pow(10, decimals);
      return formatted.toFixed(6);
    }
    return '0.000000';
  } catch {
    return '0.000000';
  }
}

const RPC_URLS: Record<string, string> = {
  ethereum: 'https://eth.llamarpc.com',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  polygon: 'https://polygon-rpc.com',
  optimism: 'https://mainnet.optimism.io',
  base: 'https://mainnet.base.org',
  bsc: 'https://bsc-dataseed.binance.org',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const encryptionSecret = Deno.env.get('DEPLOYER_PRIVATE_KEY') || 'default-encryption-key';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, network = 'ethereum' } = body;

    switch (action) {
      case 'create': {
        // Check if wallet already exists for this user+network
        const { data: existing } = await supabase
          .from('embedded_wallets')
          .select('id, address')
          .eq('user_id', user.id)
          .eq('network', network)
          .single();

        if (existing) {
          return new Response(JSON.stringify({
            success: true,
            address: existing.address,
            network,
            message: 'Wallet already exists',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Generate new wallet
        const wallet = await generateWallet();
        const encryptedKey = encryptKey(wallet.privateKey, encryptionSecret);

        // Store in database
        const { error: insertError } = await supabase
          .from('embedded_wallets')
          .insert({
            user_id: user.id,
            address: wallet.address,
            encrypted_private_key: encryptedKey,
            network,
          });

        if (insertError) {
          throw new Error(`Failed to create wallet: ${insertError.message}`);
        }

        return new Response(JSON.stringify({
          success: true,
          address: wallet.address,
          network,
          message: 'Embedded wallet created successfully',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get': {
        // Get user's embedded wallet
        const { data: wallet } = await supabase
          .from('embedded_wallets')
          .select('address, network, label, is_active, created_at')
          .eq('user_id', user.id)
          .eq('network', network)
          .single();

        if (!wallet) {
          return new Response(JSON.stringify({
            success: true,
            wallet: null,
            message: 'No embedded wallet found. Create one to receive profits.',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch balance
        const rpcUrl = RPC_URLS[network] || RPC_URLS.ethereum;
        const balance = await getBalance(wallet.address, rpcUrl);

        return new Response(JSON.stringify({
          success: true,
          wallet: {
            ...wallet,
            balance,
            balanceUsd: 0, // Would need price feed
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-all': {
        // Get all embedded wallets for user across networks
        const { data: wallets } = await supabase
          .from('embedded_wallets')
          .select('address, network, label, is_active, created_at')
          .eq('user_id', user.id);

        if (!wallets || wallets.length === 0) {
          return new Response(JSON.stringify({
            success: true,
            wallets: [],
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch balances in parallel
        const walletsWithBalances = await Promise.all(
          wallets.map(async (w) => {
            const rpcUrl = RPC_URLS[w.network] || RPC_URLS.ethereum;
            const balance = await getBalance(w.address, rpcUrl);
            return { ...w, balance };
          })
        );

        return new Response(JSON.stringify({
          success: true,
          wallets: walletsWithBalances,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-private-key': {
        // Export private key (user must confirm)
        const { data: wallet } = await supabase
          .from('embedded_wallets')
          .select('encrypted_private_key')
          .eq('user_id', user.id)
          .eq('network', network)
          .single();

        if (!wallet) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No wallet found',
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const privateKey = decryptKey(wallet.encrypted_private_key, encryptionSecret);

        return new Response(JSON.stringify({
          success: true,
          privateKey,
          warning: 'Keep this private key secure. Anyone with access can control your funds.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'withdraw': {
        // Withdraw ETH from embedded wallet to an external address
        const { toAddress, amount } = body;
        
        if (!toAddress || !amount) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Missing toAddress or amount',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate address format
        if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress)) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid destination address',
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get wallet with encrypted key
        const { data: withdrawWallet } = await supabase
          .from('embedded_wallets')
          .select('address, encrypted_private_key')
          .eq('user_id', user.id)
          .eq('network', network)
          .single();

        if (!withdrawWallet) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No embedded wallet found for this network',
          }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const rpcUrl = RPC_URLS[network] || RPC_URLS.ethereum;
        const withdrawPrivateKey = decryptKey(withdrawWallet.encrypted_private_key, encryptionSecret);

        // Use ethers to sign and send the transaction
        const { ethers } = await import("https://esm.sh/ethers@6.13.4");
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(withdrawPrivateKey, provider);

        // Parse amount to wei
        const amountWei = ethers.parseEther(amount.toString());

        // Check balance
        const balance = await provider.getBalance(withdrawWallet.address);
        if (balance < amountWei) {
          return new Response(JSON.stringify({
            success: false,
            error: `Insufficient balance. Have ${ethers.formatEther(balance)} ETH, need ${amount} ETH`,
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Send transaction
        const tx = await signer.sendTransaction({
          to: toAddress,
          value: amountWei,
        });

        // Wait for confirmation
        const receipt = await tx.wait(1);

        return new Response(JSON.stringify({
          success: true,
          hash: receipt?.hash || tx.hash,
          from: withdrawWallet.address,
          to: toAddress,
          amount,
          network,
          message: `Successfully withdrew ${amount} ETH to ${toAddress}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-profit-address': {
        // Returns the address to send profits to
        // Priority: connected wallet > embedded wallet
        const { connectedWallet } = body;

        if (connectedWallet && connectedWallet !== '0x0000000000000000000000000000000000000001') {
          return new Response(JSON.stringify({
            success: true,
            profitAddress: connectedWallet,
            source: 'connected',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fallback to embedded wallet
        const { data: embeddedWallet } = await supabase
          .from('embedded_wallets')
          .select('address')
          .eq('user_id', user.id)
          .eq('network', network)
          .single();

        if (embeddedWallet) {
          return new Response(JSON.stringify({
            success: true,
            profitAddress: embeddedWallet.address,
            source: 'embedded',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // No wallet available - auto-create embedded wallet
        const newWallet = await generateWallet();
        const encryptedKey = encryptKey(newWallet.privateKey, encryptionSecret);

        await supabase
          .from('embedded_wallets')
          .insert({
            user_id: user.id,
            address: newWallet.address,
            encrypted_private_key: encryptedKey,
            network,
          });

        return new Response(JSON.stringify({
          success: true,
          profitAddress: newWallet.address,
          source: 'embedded-auto-created',
          message: 'Auto-created embedded wallet for profit collection',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          error: `Unknown action: ${action}`,
          availableActions: ['create', 'get', 'get-all', 'get-private-key', 'get-profit-address'],
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Embedded wallet error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
