// Account session and background sync with Supabase. Local data stays the source of truth while
// offline; when signed in, changes are merged with the cloud copy a few seconds after each edit,
// on sign-in, on app start and when the connection returns.
import { App as NativeApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useSyncExternalStore } from 'react';
import { deleteAllData, getState, recompute, setState, subscribe } from '../data/store';
import { mergeStates, sameSynced, toSynced, type SyncedState } from './merge';
import { supabase } from './supabase';

export interface AccountState {
  status: 'disabled' | 'loading' | 'signed-out' | 'signed-in';
  user?: { id: string; email?: string; name?: string };
  sync: 'idle' | 'syncing' | 'error' | 'offline';
  lastSynced?: string;
  error?: string;
}

let account: AccountState = { status: supabase ? 'loading' : 'disabled', sync: 'idle' };
const listeners = new Set<() => void>();
const set = (patch: Partial<AccountState>) => { account = { ...account, ...patch }; listeners.forEach((l) => l()); };

export function useAccount(): AccountState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => account);
}

let applying = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let running: Promise<void> | null = null;

export async function syncNow(): Promise<void> {
  if (!supabase || account.status !== 'signed-in' || !account.user) return;
  if (running) return running;
  if (typeof navigator !== 'undefined' && !navigator.onLine) { set({ sync: 'offline' }); return; }
  const userId = account.user.id;
  running = (async () => {
    set({ sync: 'syncing', error: undefined });
    try {
      const { data, error } = await supabase!.from('user_state').select('state').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      const remote = (data?.state as SyncedState | undefined) ?? null;
      const local = toSynced(getState());
      const merged = mergeStates(local, remote);
      if (!sameSynced(merged, local)) {
        applying = true;
        setState((s) => ({ ...s, events: merged.events, profiles: merged.profiles, settings: merged.settings, settingsUpdatedAt: merged.settingsUpdatedAt, tombstones: merged.tombstones }));
        applying = false;
        recompute();
      }
      if (!remote || !sameSynced(merged, remote)) {
        const { error: upErr } = await supabase!.from('user_state').upsert({ user_id: userId, state: merged, updated_at: new Date().toISOString() });
        if (upErr) throw upErr;
      }
      set({ sync: 'idle', lastSynced: new Date().toISOString() });
    } catch (e) {
      set({ sync: 'error', error: (e as Error).message || 'Sync failed' });
    } finally {
      running = null;
    }
  })();
  return running;
}

function schedule() {
  if (applying || account.status !== 'signed-in') return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, 2500);
}

/** Call once at startup. */
export function startAccount() {
  if (!supabase) return;
  supabase.auth.getSession().then(({ data }) => onSession(data.session?.user));
  supabase.auth.onAuthStateChange((_event, session) => onSession(session?.user));
  if (native) NativeApp.addListener('appUrlOpen', ({ url }) => finishNativeSignIn(url));
  subscribe(schedule);
  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
}

function onSession(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | undefined) {
  const prev = account.user?.id;
  if (!user) { set({ status: 'signed-out', user: undefined, sync: 'idle' }); return; }
  set({ status: 'signed-in', user: { id: user.id, email: user.email, name: (user.user_metadata?.full_name ?? user.user_metadata?.name) as string | undefined } });
  if (prev !== user.id) syncNow();
}

// ---- Auth actions ------------------------------------------------------------------------

// The store apps have no web address to return to, so sign-in opens in the system browser and comes
// back through the app's own link (registered in Info.plist and AndroidManifest.xml).
const native = Capacitor.isNativePlatform();
const NATIVE_CALLBACK = 'com.anveshpasunoori.sanathani://auth-callback';
const redirect = () => native ? NATIVE_CALLBACK : `${location.origin}${location.pathname}`;

async function finishNativeSignIn(url: string) {
  if (!supabase || !url.startsWith(NATIVE_CALLBACK)) return;
  Browser.close().catch(() => { /* already closed (Android closes it itself) */ });
  const code = new URL(url).searchParams.get('code');
  if (code) await supabase.auth.exchangeCodeForSession(code);
}

/** Sends a one-time code (and sign-in link) to the email address. Creates the account on first use. */
export async function sendEmailCode(email: string) {
  if (!supabase) throw new Error('Accounts are not set up yet.');
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect(), shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string) {
  if (!supabase) throw new Error('Accounts are not set up yet.');
  const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error) throw error;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Accounts are not set up yet.');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect(), skipBrowserRedirect: native } });
  if (error) throw error;
  if (native && data.url) await Browser.open({ url: data.url });
}

/** Signs out. Data stays on this device unless `clearDevice` is set. */
export async function signOut(clearDevice = false) {
  if (!supabase) return;
  await syncNow();
  await supabase.auth.signOut();
  if (clearDevice) deleteAllData();
}

/** Deletes the account and its cloud copy (server function in 0002_security.sql). Data on this device is kept. */
export async function deleteAccount() {
  if (!supabase || !account.user) return;
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
