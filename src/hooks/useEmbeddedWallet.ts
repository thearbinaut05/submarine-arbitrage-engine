import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface EmbeddedWallet {
  address: string;
  network: string;
  label: string;
  balance: string;
  is_active: boolean;
  created_at: string;
}

export function useEmbeddedWallet() {
  const [wallets, setWallets] = useState<EmbeddedWallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  const fetchWallets = useCallback(async () => {
    const token = await getAuthToken();
    if (!token || !SUPABASE_URL) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/embedded-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'get-all' }),
      });

      const data = await response.json();
      if (data.success && data.wallets) {
        setWallets(data.wallets);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallets');
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken]);

  const createWallet = useCallback(async (network: string = 'ethereum') => {
    const token = await getAuthToken();
    if (!token || !SUPABASE_URL) {
      setError('Not authenticated');
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/embedded-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'create', network }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchWallets();
        return data.address;
      }
      throw new Error(data.error || 'Failed to create wallet');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, fetchWallets]);

  const exportPrivateKey = useCallback(async (network: string = 'ethereum') => {
    const token = await getAuthToken();
    if (!token || !SUPABASE_URL) return null;

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/embedded-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'get-private-key', network }),
      });

      const data = await response.json();
      return data.success ? data.privateKey : null;
    } catch {
      return null;
    }
  }, [getAuthToken]);

  const withdrawFunds = useCallback(async (toAddress: string, amount: string, network: string = 'ethereum') => {
    const token = await getAuthToken();
    if (!token || !SUPABASE_URL) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/embedded-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'withdraw', toAddress, amount, network }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchWallets(); // Refresh balances
      }
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Withdraw failed' };
    }
  }, [getAuthToken, fetchWallets]);

  // Get the profit address (connected wallet or embedded)
  const getProfitAddress = useCallback(async (connectedWallet: string | null, network: string = 'ethereum') => {
    if (connectedWallet && connectedWallet !== '0x0000000000000000000000000000000000000001') {
      return { address: connectedWallet, source: 'connected' as const };
    }

    // Use embedded wallet
    const existing = wallets.find(w => w.network === network);
    if (existing) {
      return { address: existing.address, source: 'embedded' as const };
    }

    // Auto-create
    const address = await createWallet(network);
    if (address) {
      return { address, source: 'embedded-auto-created' as const };
    }

    return null;
  }, [wallets, createWallet]);

  // Fetch wallets on mount if authenticated
  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return {
    wallets,
    isLoading,
    error,
    fetchWallets,
    createWallet,
    exportPrivateKey,
    getProfitAddress,
  };
}
