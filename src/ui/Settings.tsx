import { useEffect, useState } from 'react';
import { deleteAllData, exportBackup, importBackup, updateSettings, useStore } from '../data/store';
import { traditionForLang, TRADITIONS } from '../data/traditions';
import { ENGINE_VERSION } from '../engine/astro';
import { buildIcs } from '../reminders/ics';
import { downloadIcs } from './Calendar';
import { LANGS, useText } from '../i18n';
import { traditionName } from '../locales/festivals';
import { SETTINGS_TEXT } from '../locales/settings';
import { traditionNote } from '../locales/setup';
import { Card } from './components';
import { FollowList } from './FollowList';
import { AccountCard } from './Account';
import { askReminderPermission, nativeReminders, reminderPermission } from './nativeReminders';
import { PlacePicker } from './PlacePicker';


export function SettingsScreen() {
  const s = useStore((x) => x);
  const st = s.settings;
  const [perm, setPerm] = useState<string>(nativeReminders ? 'prompt' : typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  useEffect(() => { if (nativeReminders) reminderPermission().then(setPerm); }, []);
  const allow = async () => setPerm(nativeReminders ? await askReminderPermission() : await Notification.requestPermission());
  const [msg, setMsg] = useState('');
  const { lang, x } = useText(SETTINGS_TEXT);

  const download = (text: string, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <Card title={x('language')}>
        <div className="chips">
          {LANGS.map((l) => (
            <button key={l.id} className="chip" aria-pressed={st.lang === l.id} onClick={() => updateSettings({ lang: l.id, tradition: traditionForLang(l.id, st.tradition) })}>{l.name}</button>
          ))}
        </div>
        <p className="tiny muted">{x('languageNote')}</p>
      </Card>

      <Card title={x('tradition')}>
        <fieldset>
          {TRADITIONS.map((t) => (
            <label key={t.id} className="radio">
              <input type="radio" checked={st.tradition === t.id} onChange={() => updateSettings({ tradition: t.id })} />
              <div><strong>{traditionName(t, lang)}</strong><div className="small muted">{traditionNote(t.id, lang)}</div></div>
            </label>
          ))}
        </fieldset>
        <p className="tiny muted">{x('planned')}</p>
      </Card>

      <Card title={x('location')}>
        <PlacePicker value={st.place} onChange={(place) => updateSettings({ place })} />
        <p className="tiny muted">{x('locationNote')}</p>
      </Card>

      <Card title={x('reminders')}>
        <label className="field">{x('reminderTime')}
          <input type="time" value={st.reminderTime} onChange={(e) => updateSettings({ reminderTime: e.target.value })} style={{ maxWidth: 180 }} />
        </label>
        <div className="row">
          <span className="grow">{x('deviceNotif')} <strong>{x(perm === 'granted' ? 'allowed' : perm === 'denied' ? (nativeReminders ? 'offPhone' : 'blockedBrowser') : perm === 'unsupported' ? 'unsupported' : 'notYet')}</strong></span>
          {(perm === 'default' || perm === 'prompt') && <button className="btn" onClick={allow}>{x('allow')}</button>}
        </div>
        <div className="note info small">{x(nativeReminders ? 'nativeNote' : 'webNote')}</div>
        <button className="btn" disabled={!s.events.length} onClick={() => downloadIcs(buildIcs(s.events, st, 5), 'thithi-family-events.ics')}>{x('exportAll')}</button>
      </Card>

      <FollowList />

      <Card title={x('display')}>
        <div className="row" role="group" aria-label={x('theme')}>
          {(['system', 'light', 'dark'] as const).map((t) => <button key={t} className="chip" aria-pressed={st.theme === t} onClick={() => updateSettings({ theme: t })}>{x(t === 'system' ? 'automatic' : t)}</button>)}
        </div>
        <div className="row" role="group" aria-label={x('textSize')}>
          <button className="chip" aria-pressed={st.textSize === 'normal'} onClick={() => updateSettings({ textSize: 'normal' })}>{x('normalText')}</button>
          <button className="chip" aria-pressed={st.textSize === 'large'} onClick={() => updateSettings({ textSize: 'large' })}>{x('largeText')}</button>
        </div>
      </Card>

      <Card title={x('privacy')}>
        <p className="small">{x('privacyText')}</p>
        <div className="row">
          <button className="btn" onClick={() => download(exportBackup(), `thithi-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')}>{x('backup')}</button>
          <label className="btn">{x('restore')}
            <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { importBackup(await f.text()); setMsg(x('restored')); } catch (err) { setMsg((err as Error).message); }
            }} />
          </label>
          <button className="btn danger" onClick={() => { if (confirm(x('confirmDeleteAll'))) deleteAllData(); }}>{x('deleteAll')}</button>
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
      </Card>

      <AccountCard />

      <Card title={x('about')}>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>{x('about1', { engine: ENGINE_VERSION })}</li>
          {(['about2', 'about3', 'about4', 'about5'] as const).map((k) => <li key={k}>{x(k)}</li>)}
        </ul>
      </Card>

      <button className="btn ghost" onClick={() => updateSettings({ onboarded: false })}>{x('runSetup')}</button>
    </>
  );
}
