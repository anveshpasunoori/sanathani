// Settings: the festivals and poojas the user is reminded of, each with a way to stop.
import { useEffect, useState } from 'react';
import { updateSettings, useStore } from '../data/store';
import { observancesInRange } from '../engine/observances';
import { addDays, todayIn } from '../engine/tz';
import { useText } from '../i18n';
import { festivalName } from '../locales/festivals';
import { FOLLOW_TEXT } from '../locales/reminders';
import { POOJA_PREFIX } from '../reminders/festivals';
import { Card } from './components';

export function FollowList() {
  const { x } = useText(FOLLOW_TEXT);
  const st = useStore((s) => s.settings);
  const follows = st.follows ?? [];
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!follows.length) return;
    let alive = true;
    const today = todayIn(st.place.tz);
    const found: Record<string, string> = {};
    for (const o of observancesInRange(today, addDays(today, 400), st.place, st.tradition)) found[o.id] ??= festivalName(o, st.lang);
    const poojas = follows.filter((f) => f.startsWith(POOJA_PREFIX));
    (poojas.length ? import('../reminders/poojaFollows') : Promise.resolve(null)).then((m) => {
      if (m) for (const f of poojas) found[f] = m.poojaTitle(f.slice(POOJA_PREFIX.length), st);
      if (alive) setNames(found);
    });
    return () => { alive = false; };
  }, [follows.join(), st.lang, st.tradition, st.place]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card title={x('festivalReminders')}>
      {follows.length === 0 ? <p className="small muted" style={{ margin: 0 }}>{x('noFollows')}</p> : (
        <>
          <ul className="list">
            {follows.map((f) => (
              <li key={f} className="row">
                <span className="grow">🔔 {names[f] ?? '…'}</span>
                <button className="btn ghost small" aria-label={x('stopReminding', { name: names[f] ?? f })}
                  onClick={() => updateSettings({ follows: follows.filter((g) => g !== f) })}>✕</button>
              </li>
            ))}
          </ul>
          <p className="tiny muted" style={{ marginBottom: 0 }}>{x('reminderHint')}</p>
        </>
      )}
    </Card>
  );
}
