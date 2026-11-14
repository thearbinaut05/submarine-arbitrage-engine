import { useCallback, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import type { Network } from '@/types/defi';
import { summarizeLifecycle, type TransactionEvidence } from '@/lib/arbitrage/engine';

export interface AuditRecord {
  id: string;
  createdAt: string;
  kind: 'scan' | 'preflight' | 'safety';
  summary: string;
  referenceId?: string;
  previousHash: string;
  recordHash: string;
}

interface StoredTransaction {
  id: string;
  hash: string | null;
  real_tx_hash?: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  network: Network;
  gas_used: string | null;
  profit: number | null;
  created_at: string;
}

const AUDIT_KEY = 'flasharb_tamper_evident_audit_v1';
const GENESIS = `0x${'0'.repeat(64)}`;

function readAudit(): AuditRecord[] {
  try {
    const value = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function useEvidenceLedger(opportunityCount: number) {
  const [audit, setAudit] = useState<AuditRecord[]>(readAudit);
  const [stored, setStored] = useState<StoredTransaction[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  const appendAudit = useCallback((entry: Pick<AuditRecord, 'kind' | 'summary' | 'referenceId'>) => {
    setAudit((current) => {
      const previousHash = current[0]?.recordHash ?? GENESIS;
      const createdAt = new Date().toISOString();
      const id = crypto.randomUUID();
      const recordHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ ...entry, id, createdAt, previousHash })));
      const next = [{ ...entry, id, createdAt, previousHash, recordHash }, ...current].slice(0, 200);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
      if (cancelled) return;
      if (error) setStorageError('Existing transaction records are unavailable in this session.');
      else setStored((data ?? []) as unknown as StoredTransaction[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const transactions = useMemo<TransactionEvidence[]>(() => stored.map((row) => ({
    state: row.status === 'confirmed' ? 'confirmed' : row.status === 'failed' ? 'reverted' : 'submitted',
    hash: row.real_tx_hash || row.hash,
    blockNumber: null,
    realizedNetProfitBase: null,
  })), [stored]);

  const lifecycle = useMemo(() => ({
    ...summarizeLifecycle([], transactions),
    liveMarketData: opportunityCount * 2,
    simulated: opportunityCount,
  }), [transactions, opportunityCount]);

  return { audit, appendAudit, stored, transactions, lifecycle, storageError };
}
