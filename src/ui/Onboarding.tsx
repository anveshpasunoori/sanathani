import { useEffect, useState } from 'react';
import { LANGS, useText } from '../i18n';
import { saveEvent, updateSettings, useStore } from '../data/store';
import { sampleEvents } from '../data/sample';
import { traditionForLang, TRADITIONS } from '../data/traditions';
import { traditionName } from '../locales/festivals';
import { SETUP_TEXT, traditionNote } from '../locales/setup';
import { cloudEnabled } from '../sync/supabase';
import { SignInForm } from './Account';
import { askReminderPermission, nativeReminders, reminderPermission } from './nativeReminders';
import { PlacePicker } from './PlacePicker';
import { go } from './router';

export function Onboarding() {
  const st = useStore((s) => s.settings);
  const hasEvents = useStore((s) => s.events.length > 0);
  const [step, setStep] = useState(0);
  const [perm, setPerm] = useState<string>(nativeReminders ? 'prompt' : typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  useEffect(() => { if (nativeReminders) reminderPermission().then(setPerm); }, []);
  const allow = async () => setPerm(nativeReminders ? await askReminderPermission() : await Notification.requestPermission());
  const { lang, x } = useText(SETUP_TEXT);
  const finish = (then?: () => void) => { updateSettings({ onboarded: true }); then?.(); };

  const steps = [
    <>
      <h1>{x('welcome')} 🙏</h1>
      <p>{x('intro')}</p>
      <h2>{x('chooseLang')}</h2>
      <div className="stack">
        {LANGS.map((l) => <button key={l.id} className="chip" aria-pressed={st.lang === l.id} onClick={() => updateSettings({ lang: l.id, tradition: traditionForLang(l.id, st.tradition) })}>{l.name}</button>)}
      </div>
      {cloudEnabled && (
        <details className="onboard-signin">
          <summary>{x('haveAccount')}</summary>
          <SignInForm compact onDone={() => finish(() => go({ tab: 'home' }))} />
        </details>
      )}
    </>,
    <>
      <h2>{x('traditionTitle')}</h2>
      <p className="muted small">{x('traditionHint')}</p>
      <fieldset>
        {TRADITIONS.map((t) => (
          <label key={t.id} className="radio"><input type="radio" checked={st.tradition === t.id} onChange={() => updateSettings({ tradition: t.id })} />
            <div><strong>{traditionName(t, lang)}</strong>{lang !== 'en' && t.id === traditionForLang(lang, st.tradition) && <> <span className="badge">{x('suggested')}</span></>}<div className="small muted">{traditionNote(t.id, lang)}</div></div></label>
        ))}
      </fieldset>
    </>,
    <>
      <h2>{x('whereTitle')}</h2>
      <p className="muted small">{x('whereHint')}</p>
      <PlacePicker value={st.place} onChange={(place) => updateSettings({ place })} />
    </>,
    <>
      <h2>{x('remindTitle')}</h2>
      <label className="field">{x('reminderTime')}
        <input type="time" value={st.reminderTime} onChange={(e) => updateSettings({ reminderTime: e.target.value })} style={{ maxWidth: 180 }} />
      </label>
      <p className="muted small">{x('remindHint')}</p>
      {(perm === 'default' || perm === 'prompt') && <button className="btn saffron" onClick={allow}>🔔 {x('allowNotif')}</button>}
      {perm === 'granted' && <p className="note good small">{x('notifAllowed')}</p>}
      {perm === 'denied' && <p className="note warn small">{x('notifBlocked')}</p>}
    </>,
    <>
      <h2>{x('firstTitle')}</h2>
      <p className="muted small">{x('firstHint')}</p>
      <div className="stack">
        <button className="btn primary block" onClick={() => finish(() => go({ tab: 'events', id: 'new' }))}>{x('addEvent')}</button>
        <button className="btn block" onClick={() => finish(() => { if (!hasEvents) sampleEvents(st).forEach(saveEvent); go({ tab: 'events' }); })}>{x('showSamples')}</button>
        <button className="btn ghost block" onClick={() => finish(() => go({ tab: 'home' }))}>{x('skipForNow')}</button>
      </div>
    </>,
  ];

  return (
    <div className="onboard">
      <div className="steps" aria-label={x('stepOf', { n: step + 1, total: steps.length })}>{steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      <section className="card">{steps[step]}</section>
      {step < steps.length - 1 && (
        <div className="row">
          {step > 0 && <button className="btn" onClick={() => setStep(step - 1)}>{x('back')}</button>}
          <button className="btn primary grow" onClick={() => setStep(step + 1)}>{x('next')}</button>
          {step > 0 && <button className="btn ghost" onClick={() => setStep(step + 1)}>{x('skip')}</button>}
        </div>
      )}
    </div>
  );
}
