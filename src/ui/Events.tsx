import { useMemo } from 'react';
import type { EventDraft } from '../assistant/parse';
import { nextOccurrence, occurrencesBetween } from '../data/occurrences';
import { deleteEvent, saveEvent, useStore } from '../data/store';
import { sampleEvents } from '../data/sample';
import { tradition } from '../data/traditions';
import { LOCALE, useText } from '../i18n';
import { RULE, relationLabel } from '../locales/common';
import { EVENT_FORM_TEXT } from '../locales/eventForm';
import { EVENTS_TEXT } from '../locales/events';
import { traditionName } from '../locales/festivals';
import { describeLunar } from '../engine/recurrence';
import { describeSolar } from '../engine/solarRecurrence';
import { addDays, formatCivil, todayIn } from '../engine/tz';
import { buildIcs } from '../reminders/ics';
import { fireTime, reminderKey } from '../reminders/schedule';
import { downloadIcs } from './Calendar';
import { Avatar, Card, categoryLabel, DateBox, relativeDay, ShareButton } from './components';
import { EventForm } from './EventForm';
import { go } from './router';

export function EventsScreen({ id, edit, draft }: { id?: string; edit?: boolean; draft?: string }) {
  const events = useStore((s) => s.events);
  const { x } = useText(EVENTS_TEXT);
  if (id === 'new') {
    let d: EventDraft | undefined;
    try { d = draft ? JSON.parse(draft) : undefined; } catch { d = undefined; }
    return <EventForm key={draft ?? 'new'} draft={d} />;
  }
  const e = id ? events.find((x) => x.id === id) : undefined;
  if (id && !e) return <Card title={x('notFound')}><button className="btn" onClick={() => go({ tab: 'events' })}>{x('backToEvents')}</button></Card>;
  if (e && edit) return <EventForm key={e.id} existing={e} />;
  if (e) return <EventDetail id={e.id} />;
  return <EventList />;
}

function EventList() {
  const { t, x, lang } = useText(EVENTS_TEXT);
  const s = useStore((x) => x);
  const today = todayIn(s.settings.place.tz);
  const rows = useMemo(() => s.events
    .map((e) => ({ e, o: nextOccurrence(e, s.settings, today) }))
    .sort((a, b) => (a.o?.date ?? '9999').localeCompare(b.o?.date ?? '9999')), [s.events, s.settings, today]);

  return (
    <>
      <button className="btn primary block" style={{ minHeight: 56, fontSize: '1.05rem' }} onClick={() => go({ tab: 'events', id: 'new' })}>+ {t('addEvent')}</button>
      <Card title={t('familyEvents')}>
        {rows.length === 0 ? (
          <div className="stack">
            <p className="muted">{t('noEvents')} {x('emptyHint')}</p>
            <button className="btn" onClick={() => sampleEvents(s.settings).forEach(saveEvent)}>{x('showSamples')}</button>
          </div>
        ) : (
          <ul className="list">
            {rows.map(({ e, o }) => (
              <li key={e.id}>
                <button className="item" onClick={() => go({ tab: 'events', id: e.id })}>
                  {o ? <DateBox date={o.date} /> : <div className="datebox"><div className="m">—</div></div>}
                  <Avatar e={e} />
                  <div className="grow">
                    <div><strong>{e.personName}</strong>{' '}
                      {e.isSample && <span className="badge sample">{t('sample')}</span>}{' '}
                      {e.recurrence === 'thithi' && <span className="badge lunar">{t('thithi')}</span>}{e.recurrence === 'solar' && <span className="badge lunar">{t(e.solar?.by === 'star' ? 'nakshatra' : 'thithi')}</span>}{' '}
                      {e.privacy === 'private' && <span className="badge private">{x('private')}</span>}
                    </div>
                    <div className="small muted">
                      {e.title ?? categoryLabel(e.category, lang)}
                      {e.lunar && e.recurrence === 'thithi' ? ` · ${describeLunar(e.lunar, lang)}` : e.solar && e.recurrence === 'solar' ? ` · ${describeSolar(e.solar, lang)}` : ''}
                      {o ? ` · ${relativeDay(today, o.date, lang)}` : ''}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function EventDetail({ id }: { id: string }) {
  const { t, x, lang } = useText(EVENTS_TEXT);
  const { x: f } = useText(EVENT_FORM_TEXT);
  const loc = LOCALE[lang];
  const s = useStore((st) => st);
  const e = s.events.find((ev) => ev.id === id)!;
  const today = todayIn(s.settings.place.tz);
  const occ = useMemo(() => occurrencesBetween(e, s.settings, today, addDays(today, 365 * 5)), [e, s.settings, today]);
  const next = occ[0];
  const pending = next ? e.reminders.map((r) => ({ r, at: fireTime(next.date, r, s.settings.place.tz), delivered: s.delivered[reminderKey(e.id, next.date, r.id)] })) : [];
  const tz = s.settings.place.tz;
  const fmt = (d: Date) => new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);

  return (
    <>
      <div className="row"><button className="btn ghost" onClick={() => go({ tab: 'events' })}>{x('allEvents')}</button></div>
      <Card>
        <div className="row">
          <Avatar e={e} />
          <div className="grow">
            <h1 style={{ fontSize: '1.3rem' }}>{e.personName}</h1>
            <div className="muted">{e.title ?? categoryLabel(e.category, lang)} · {relationLabel(e.relationship, lang)}</div>
          </div>
        </div>
        {e.isSample && <div className="note warn small">{x('sampleNote')}</div>}
        {next ? (
          <div className="note good">
            <div className="small muted">{x('nextObs')} · {relativeDay(today, next.date, lang)}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: '1.3rem', fontWeight: 700 }}>{formatCivil(next.date, loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="small">{next.reason}</div>
            {next.caution && <div className="small" style={{ marginTop: 6 }}>⚠ {next.caution}</div>}
          </div>
        ) : <p className="muted">{x('noUpcoming')}</p>}
        <dl className="kv">
          <dt>{x('original')}</dt><dd>{[formatCivil(e.originalDate, loc), e.originalTime, e.originalPlace?.name].filter(Boolean).join(', ')}</dd>
          <dt>{x('repeats')}</dt><dd>{e.recurrence === 'thithi' ? x('byThithi', { lunar: e.lunar ? describeLunar(e.lunar, lang) : '?' }) : e.recurrence === 'solar' ? x('bySolar', { solar: e.solar ? describeSolar(e.solar, lang) : '?' }) : x(e.recurrence === 'gregorian' ? 'sameDate' : 'noRepeat')}</dd>
          {e.recurrence === 'thithi' && <><dt>{x('rule')}</dt><dd>{x('ruleText', { rule: RULE[lang][e.rule], adhika: x(e.adhikaPolicy === 'nija' ? 'nijaYears' : 'bothYears') })}</dd></>}
          {e.recurrence === 'solar' && <><dt>{x('rule')}</dt><dd>{RULE[lang][e.rule]}</dd></>}
          {e.recurrence === 'thithi' && <><dt>{x('source')}</dt><dd>{x(e.lunarSource === 'user' ? 'byYou' : 'calculated')}</dd></>}
          <dt>{x('tradition')}</dt><dd>{traditionName(tradition(e.tradition), lang)}</dd>
          {e.rituals && <><dt>{x('rituals')}</dt><dd>{e.rituals}</dd></>}
          {e.notes && <><dt>{x('notes')}</dt><dd>{e.notes}</dd></>}
          <dt>{x('privacy')}</dt><dd>{x(e.privacy === 'private' ? 'privateOnly' : 'shared')}</dd>
        </dl>
        {(e.category === 'death' || e.category === 'shraddha') && <p className="small muted">{x('shraddhaNote')}</p>}
      </Card>

      <Card title={x('reminders')}>
        {pending.length === 0 ? <p className="muted">{x('noReminders')}</p> : (
          <ul className="list">
            {pending.map(({ r, at, delivered }) => (
              <li key={r.id} className="item" style={{ cursor: 'default' }}>
                <span className="grow">{r.daysBefore === 0 ? f('onDay') : r.daysBefore === 1 ? f('dayBefore') : f('daysBefore', { n: r.daysBefore })} · {fmt(at)}</span>
                <span className={`badge ${delivered ? '' : 'lunar'}`}>{x(delivered ? 'delivered' : at < new Date() ? 'missed' : 'scheduled')}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="tiny muted">{x('remindersNote')}</p>
      </Card>

      <Card title={x('comingYears')}>
        <ul className="list">
          {occ.slice(0, 6).map((o) => (
            <li key={o.date} className="item" style={{ cursor: 'default', alignItems: 'flex-start' }}>
              <DateBox date={o.date} />
              <div className="grow"><strong>{formatCivil(o.date, loc)}</strong><div className="small muted">{o.reason}</div>{o.caution && <div className="small">⚠ {o.caution}</div>}</div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="row">
        <button className="btn primary grow" onClick={() => go({ tab: 'events', id: e.id, edit: true })}>{t('edit')}</button>
        <button className="btn" onClick={() => downloadIcs(buildIcs([e], s.settings, 5), `${e.personName.replace(/\W+/g, '-')}.ics`)}>{x('addToCal')}</button>
        {next && (
          <ShareButton title={e.personName} lines={[
            `${e.category === 'death' || e.category === 'shraddha' ? '🙏' : e.category === 'birthday' ? '🎂' : '🪔'} ${e.personName} — ${e.title ?? categoryLabel(e.category, lang)}`,
            `📅 ${formatCivil(next.date, loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
            ...(e.recurrence === 'thithi' && e.lunar ? [`🌙 ${describeLunar(e.lunar, lang)}`] : e.recurrence === 'solar' && e.solar ? [`🌙 ${describeSolar(e.solar, lang)}`] : []),
          ]} />
        )}
        <button className="btn danger" onClick={() => { if (confirm(x('confirmDelete', { name: e.personName }))) { deleteEvent(e.id); go({ tab: 'events' }); } }}>{t('delete')}</button>
      </div>
    </>
  );
}
