// This file was originally auto-generated. It has been made fail-safe:
// if the public Supabase env vars are missing at build time, the app must
// render a setup screen instead of throwing during createClient() and
// showing a blank page.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

const looksConfigured = (value: string | undefined) =>
  Boolean(value && value !== 'undefined' && value !== 'null' && value.trim().length > 0);

export const isSupabaseConfigured =
  looksConfigured(SUPABASE_URL) && looksConfigured(SUPABASE_PUBLISHABLE_KEY);

if (!isSupabaseConfigured) {
  console.warn(
    '[FlashArb] Supabase is not configured. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY at build time. Backend features are disabled until then.'
  );
}

// When unconfigured we still export a harmless placeholder client so that
// imports do not crash at module load. The UI gates on isSupabaseConfigured
// before mounting backend-dependent screens.
export const supabase = createClient<Database>(
  isSupabaseConfigured ? SUPABASE_URL! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? SUPABASE_PUBLISHABLE_KEY! : 'placeholder-publishable-key',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
