// Supabase client. Accounts and cloud sync turn on when the project's URL and public anon key are
// provided at build time (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, see .env.example). Without
// them the app runs fully on-device, exactly as before.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } })
  : null;

export const cloudEnabled = !!supabase;
