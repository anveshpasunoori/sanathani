import { useState } from 'react';
import { useText } from '../i18n';
import { ACCOUNT_TEXT } from '../locales/account';
import { deleteAccount, sendEmailCode, signInWithGoogle, signOut, syncNow, useAccount, verifyEmailCode } from '../sync/sync';
import { Card } from './components';
import { go } from './router';

const ago = (iso: string | undefined, x: (k: 'justNow' | 'minAgo' | 'hAgo', v?: { n: number }) => string) => {
  if (!iso) return '';
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? x('justNow') : m < 60 ? x('minAgo', { n: m }) : x('hAgo', { n: Math.round(m / 60) });
};

/** Email-code and Google sign-in. Shown as its own screen (#login) and inside onboarding. */
export function SignInForm({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const { x } = useText(ACCOUNT_TEXT);
  const acc = useAccount();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (acc.status === 'disabled') {
    return (
      <div className="note info small">
        {x('disabled')}
      </div>
    );
  }
  if (acc.status === 'signed-in') {
    return <div className="note good small">{x('signedInAs')} <strong>{acc.user?.email}</strong></div>;
  }

  const run = async (fn: () => Promise<void>, ok?: string) => {
    setBusy(true); setMsg('');
    try { await fn(); if (ok) setMsg(ok); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="stack">
      <button className="btn google" disabled={busy} onClick={() => run(signInWithGoogle)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>
        {x('google')}
      </button>
      <div className="divider small muted"><span>{x('orEmail')}</span></div>
      {step === 'email' ? (
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await sendEmailCode(email.trim()); setStep('code'); }, x('codeSent')); }}>
          <label className="sr-only" htmlFor="signin-email">{x('email')}</label>
          <input id="signin-email" className="grow" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn primary" disabled={busy || !email.includes('@')}>{x('sendCode')}</button>
        </form>
      ) : (
        <form className="row" onSubmit={(e) => { e.preventDefault(); run(async () => { await verifyEmailCode(email.trim(), code); onDone?.(); }); }}>
          <label className="sr-only" htmlFor="signin-code">{x('code')}</label>
          <input id="signin-code" className="grow" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          <button className="btn primary" disabled={busy || code.length < 6}>{x('signIn')}</button>
          <button type="button" className="btn ghost" onClick={() => { setStep('email'); setCode(''); setMsg(''); }}>{x('changeEmail')}</button>
        </form>
      )}
      {msg && <p className="small muted" role="status">{msg}</p>}
      {!compact && (
        <p className="tiny muted">
          {x('why')}
        </p>
      )}
    </div>
  );
}

export function LoginScreen() {
  const { x } = useText(ACCOUNT_TEXT);
  const acc = useAccount();
  return (
    <>
      <Card className="hero">
        <h2 style={{ margin: 0 }}>{x('signIn')}</h2>
        <p className="muted small" style={{ marginBottom: 0 }}>{x('loginIntro')}</p>
      </Card>
      <Card><SignInForm onDone={() => go({ tab: 'home' })} /></Card>
      {acc.status !== 'signed-in' && <button className="btn ghost" onClick={() => go({ tab: 'home' })}>{x('continueWithout')}</button>}
    </>
  );
}

export function AccountCard() {
  const { x } = useText(ACCOUNT_TEXT);
  const acc = useAccount();
  const [msg, setMsg] = useState('');
  return (
    <Card title={x('accountSync')}>
      {acc.status === 'signed-in' ? (
        <div className="stack">
          <div className="row">
            <div className="avatar" aria-hidden="true">{(acc.user?.name ?? acc.user?.email ?? '?')[0].toUpperCase()}</div>
            <div className="grow">
              <strong>{acc.user?.name ?? acc.user?.email}</strong>
              <div className="small muted">
                {acc.sync === 'syncing' ? x('syncing') : acc.sync === 'offline' ? x('offline') : acc.sync === 'error' ? x('syncProblem', { error: acc.error ?? '' }) : x('synced', { ago: ago(acc.lastSynced, x) })}
              </div>
            </div>
            <button className="btn" onClick={() => syncNow()}>{x('syncNow')}</button>
          </div>
          <div className="row">
            <button className="btn" onClick={() => signOut(false)}>{x('signOut')}</button>
            <button className="btn" onClick={() => { if (confirm(x('confirmClear'))) signOut(true); }}>{x('signOutClear')}</button>
            <button className="btn danger" onClick={async () => {
              if (!confirm(x('confirmDelete'))) return;
              try { await deleteAccount(); setMsg(x('deleted')); } catch (e) { setMsg((e as Error).message); }
            }}>{x('deleteAccount')}</button>
          </div>
          {msg && <p className="small" role="status">{msg}</p>}
          <p className="tiny muted">{x('sharingNext')}</p>
        </div>
      ) : (
        <SignInForm compact />
      )}
    </Card>
  );
}
