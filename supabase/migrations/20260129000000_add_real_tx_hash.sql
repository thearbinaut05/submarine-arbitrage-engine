-- Migration: Add real blockchain transaction hash tracking
-- This enables tracking of actual on-chain transactions from Gelato Relay

-- Add real_tx_hash column to transactions table
ALTER TABLE public.transactions ADD COLUMN real_tx_hash TEXT;

-- Create index for faster lookups by real_tx_hash
CREATE INDEX idx_transactions_real_tx_hash ON public.transactions(real_tx_hash);

-- Update comment on hash column to clarify it's the Gelato task ID
COMMENT ON COLUMN public.transactions.hash IS 'Gelato task ID (not the blockchain transaction hash)';
COMMENT ON COLUMN public.transactions.real_tx_hash IS 'Actual blockchain transaction hash once confirmed on-chain';

-- Create a function to update transaction status when Gelato webhook fires
CREATE OR REPLACE FUNCTION public.update_transaction_from_gelato(
  p_task_id TEXT,
  p_real_tx_hash TEXT,
  p_status transaction_status
)
RETURNS void AS $$
BEGIN
  UPDATE public.transactions
  SET 
    real_tx_hash = p_real_tx_hash,
    status = p_status,
    updated_at = now()
  WHERE hash = p_task_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.update_transaction_from_gelato TO authenticated, service_role;

