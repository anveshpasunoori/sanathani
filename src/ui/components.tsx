import { useEffect, useState, type ReactNode } from 'react';
import type { Answer } from '../assistant/answer';
import { creditLine, DEITY_IMAGES, type DeityImageId } from '../data/deityImages';
import { shareText } from '../data/shopping';
import { updateSettings, useStore } from '../data/store';
import type { FamilyEvent } from '../data/types';
import type { Lang } from '../engine/names';
import { LOCALE, translate, useText } from '../i18n';
import { CATEGORY, DATE_WORDS } from '../locales/common';
import { POOJA_TEXT } from '../locales/pooja';
import { FOLLOW_TEXT } from '../locales/reminders';
import { askReminderPermission, nativeReminders } from './nativeReminders';
import { parseCivil, type CivilDate } from '../engine/tz';
import { go } from './router';

export function Icon({ name }: { name: 'home' | 'calendar' | 'events' | 'pooja' | 'songs' | 'astro' | 'ask' | 'settings' }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
      {name === 'home' && <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>}
      {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15" r="2" /></>}
      {name === 'events' && <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16 14.2c2.9.3 5 2.6 5 5.8" /></>}
      {name === 'pooja' && <><path d="M4 15c0 3 3.6 5 8 5s8-2 8-5H4z" /><path d="M12 4c-1.6 2-2.4 3.5-2.4 5a2.4 2.4 0 004.8 0c0-1.5-.8-3-2.4-5z" /><path d="M12 11.5V15" /></>}
      {name === 'songs' && <><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>}
      {name === 'astro' && <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.2l1.4 2.9 3.2.4-2.3 2.2.6 3.1-2.9-1.5-2.9 1.5.6-3.1-2.3-2.2 3.2-.4z" /></>}
      {name === 'ask' && <><path d="M4 5h16v11H9l-5 4z" /><path d="M9.5 9.2a2.5 2.5 0 114 2c-.9.5-1.5 1-1.5 2" /><path d="M12 14.6v.1" /></>}
      {name === 'settings' && <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></>}
    </svg>
  );
}

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && <div className="card-head">{title && <h2>{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export function DateBox({ date }: { date: CivilDate }) {
  const lang = useStore((s) => s.settings.lang);
  const { m, d } = parseCivil(date);
  const mon = new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString(LOCALE[lang], { month: 'short', timeZone: 'UTC' }).replace(/[.॰]/g, '');
  return <div className="datebox" aria-hidden="true"><div className="d">{d}</div><div className="m">{mon}</div></div>;
}

export function Avatar({ e }: { e: FamilyEvent }) {
  if (e.photo) return <img className="avatar" src={e.photo} alt="" />;
  const initials = e.personName.replace(/^Sample:\s*/, '').split(/\s+/).filter((w) => /^\p{L}/u.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return <div className="avatar" aria-hidden="true">{initials}</div>;
}

export const CATEGORY_LABEL = CATEGORY.en;
export const categoryLabel = (c: FamilyEvent['category'], lang: Lang) => CATEGORY[lang][c];

export function AnswerView({ a, onDraft, onEvent }: { a: Answer; onDraft?: () => void; onEvent?: (id: string) => void }) {
  return (
    <div className="bubble bot">
      <h3>{a.title}</h3>
      {a.lines.map((l, i) => <p key={i}>{l}</p>)}
      {a.sections?.map((s) => (
        <div key={s.heading} className="stack">
          <strong>{s.heading}</strong>
          <ul>{s.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
        </div>
      ))}
      {a.caution && <div className="note warn small">{a.caution}</div>}
      {(a.draft || (a.eventIds && a.eventIds.length > 0)) && (
        <div className="row">
          {a.draft && onDraft && <button className="btn primary" onClick={onDraft}>Review &amp; save event</button>}
          {a.eventIds?.slice(0, 3).map((id) => onEvent && <button key={id} className="btn" onClick={() => onEvent(id)}>Open event</button>)}
        </div>
      )}
      {a.source && <p className="source">{a.source}</p>}
    </div>
  );
}

export function relativeDay(from: CivilDate, to: CivilDate, lang: Lang): string {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  if (days === 0) return translate(lang, 'today');
  if (days === 1) return translate(lang, 'tomorrow');
  return translate(lang, 'inDays', { n: days });
}

/** Deity picture; with `credit`, the source and licence are shown under it (required for CC BY-SA). */
export function DeityPic({ id, className = '', credit = false }: { id: DeityImageId; className?: string; credit?: boolean }) {
  const img = DEITY_IMAGES[id];
  const pic = <img src={img.src} alt={img.title} loading="lazy" decoding="async" className={`deity-pic ${className}`} style={{ objectPosition: img.focus }} />;
  if (!credit || img.license === 'own') return pic;
  return (
    <figure className="deity-figure">
      {pic}
      <figcaption className="tiny muted"><a href={img.url} target="_blank" rel="noreferrer">{creditLine(img)}</a></figcaption>
    </figure>
  );
}

/** Switch between the two halves of the Pooja tab. */
export function DevotionSwitch({ current }: { current: 'pooja' | 'songs' }) {
  const { x } = useText(POOJA_TEXT);
  return (
    <div className="segmented" style={{ marginBottom: 12 }}>
      <button aria-pressed={current === 'pooja'} onClick={() => go({ tab: 'pooja' })}>{x('poojasStotrams')}</button>
      <button aria-pressed={current === 'songs'} onClick={() => go({ tab: 'songs' })}>{x('devotionalSongs')}</button>
    </div>
  );
}

/** January…December in the language's own words. */
const monthNames = (lang: Lang) => Array.from({ length: 12 }, (_, i) =>
  new Date(Date.UTC(2000, i, 1)).toLocaleDateString(LOCALE[lang], { month: 'long', timeZone: 'UTC' }));

/**
 * Day / Month / Year dropdowns. Much quicker than a calendar picker for dates decades ago (births,
 * passings), and day-first with month names, so 03/04 can never be misread. Emits YYYY-MM-DD once
 * all three are chosen, '' until then, and spells the chosen date out underneath.
 */
export function DateFields({ label, hint, value, onChange, lang, fromYear = 1900 }: {
  label: string; hint?: string; value: string; onChange: (iso: string) => void; lang: Lang; fromYear?: number;
}) {
  const w = DATE_WORDS[lang];
  const parts = (v: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v); return m ? { y: +m[1], m: +m[2], d: +m[3] } : { y: 0, m: 0, d: 0 }; };
  const [sel, setSel] = useState(() => parts(value));
  useEffect(() => { if (value) setSel(parts(value)); }, [value]);

  const thisYear = new Date().getFullYear();
  const daysIn = sel.y && sel.m ? new Date(Date.UTC(sel.y, sel.m, 0)).getUTCDate() : 31;
  const pick = (next: Partial<typeof sel>) => {
    const s = { ...sel, ...next };
    if (s.d > (s.y && s.m ? new Date(Date.UTC(s.y, s.m, 0)).getUTCDate() : 31)) s.d = 0;
    setSel(s);
    onChange(s.y && s.m && s.d ? `${s.y}-${String(s.m).padStart(2, '0')}-${String(s.d).padStart(2, '0')}` : '');
  };
  const spelled = sel.y && sel.m && sel.d
    ? new Date(Date.UTC(sel.y, sel.m - 1, sel.d)).toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : '';

  return (
    <div className="field" role="group" aria-label={label}>
      {label}
      {hint && <span className="hint">{hint}</span>}
      <div className="date-fields">
        <select aria-label={w.day} value={sel.d || ''} onChange={(e) => pick({ d: +e.target.value })}>
          <option value="">{w.day}</option>
          {Array.from({ length: daysIn }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        <select aria-label={w.month} value={sel.m || ''} onChange={(e) => pick({ m: +e.target.value })}>
          <option value="">{w.month}</option>
          {monthNames(lang).map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
        </select>
        <select aria-label={w.year} value={sel.y || ''} onChange={(e) => pick({ y: +e.target.value })}>
          <option value="">{w.year}</option>
          {Array.from({ length: thisYear - fromYear + 1 }, (_, i) => thisYear - i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {spelled && <span className="hint date-spelled">✓ {spelled}</span>}
    </div>
  );
}

/** 🔔 Remind me / Reminder on, for a festival id or 'pooja:<id>': a reminder the day before. */
// One shared empty list: a selector returning a fresh `[]` each time makes useSyncExternalStore
// see a "new" value on every render and loop until React aborts (blank page).
const NO_FOLLOWS: string[] = [];

export function FollowButton({ follow }: { follow: string }) {
  const { x } = useText(FOLLOW_TEXT);
  const follows = useStore((s) => s.settings.follows ?? NO_FOLLOWS);
  const on = follows.includes(follow);
  const toggle = () => {
    updateSettings({ follows: on ? follows.filter((f) => f !== follow) : [...follows, follow] });
    if (on) return;
    if (nativeReminders) askReminderPermission().catch(() => {});
    else if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  };
  return (
    <button className="chip follow" aria-pressed={on} title={x('reminderHint')} onClick={(e) => { e.stopPropagation(); toggle(); }}>
      {x(on ? 'reminderOn' : 'remindMe')}
    </button>
  );
}

/**
 * 📤 Share: sends the given lines (plus a one-line footer naming the app) through the phone's share
 * sheet — WhatsApp for most families — or copies them where sharing isn't available.
 */
export function ShareButton({ title, lines }: { title: string; lines: string[] }) {
  const { x } = useText(FOLLOW_TEXT);
  const [state, setState] = useState<'shared' | 'copied' | 'failed'>();
  const share = async () => setState(await shareText(title, [...lines, '', x('sharedFrom')].join('\n')));
  return (
    <>
      <button className="chip" onClick={(e) => { e.stopPropagation(); share(); }}>{x('share')}</button>
      {state === 'copied' && <span className="small muted" role="status">{x('shareCopied')}</span>}
    </>
  );
}
