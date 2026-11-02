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

/** Whether the project has Google sign-in switched on (Authentication → Providers). Asked once;
 *  until it answers, or if it can't be reached, the Google button stays hidden. */
export const googleEnabled: Promise<boolean> = url && key
  ? fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    .then((r) => r.json()).then((s: { external?: { google?: boolean } }) => !!s.external?.google).catch(() => false)
  : Promise.resolve(false);
