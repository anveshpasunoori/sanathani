import { useMemo, useState } from 'react';
import type { EventDraft } from '../assistant/parse';
import { occurrencesBetween } from '../data/occurrences';
import { saveEvent, uid, useStore } from '../data/store';
import { eventSolarSystem, TRADITIONS } from '../data/traditions';
import type { EventCategory, FamilyEvent, Recurrence, Reminder, TraditionId } from '../data/types';
import { monthName, nakshatraName, tithiFullName, type Lang } from '../engine/names';
import { describeLunar, resolveLunarDate, type LunarDate, type ObservanceRule } from '../engine/recurrence';
import { nakshatraIndexAt, sunTimes } from '../engine/panchang';
import { solarDate, solarMonthName } from '../engine/solar';
import { describeSolar, type SolarAnchor } from '../engine/solarRecurrence';
import { addDays, formatCivil, parseCivil, todayIn, zonedToUtc } from '../engine/tz';
import { LOCALE, useText } from '../i18n';
import { CATEGORY, RELATIONS, relationLabel, RULE } from '../locales/common';
import { EVENT_FORM_TEXT } from '../locales/eventForm';
import { traditionName } from '../locales/festivals';
import { DateFields } from './components';
import { askReminderPermission, nativeReminders } from './nativeReminders';
import { PlacePicker } from './PlacePicker';
import { go } from './router';

const QUICK: EventCategory[] = ['birthday', 'marriage', 'death', 'shraddha', 'engagement', 'housewarming', 'naming', 'religious', 'custom'];
/** "07:00" → "7:00 AM", in the language's own way of writing times. */
const clock = (hhmm: string, lang: Lang) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(LOCALE[lang], { hour: 'numeric', minute: '2-digit' });
};
// The four most families start with; the rest sit behind "Other…".
const COMMON = QUICK.slice(0, 4);

const defaultRule = (c: EventCategory): ObservanceRule => (c === 'death' || c === 'shraddha' ? 'aparahna' : 'sunrise');

/**
 * How a new event repeats by default. Kerala keeps birthdays and Shraddham by nakshatra in the
 * Malayalam month; Tamil families keep the Shraddham by thithi in the Tamil month and birthdays by star.
 */
function defaultRepeat(c: EventCategory, t: TraditionId): { recurrence: Recurrence; by: SolarAnchor['by'] } {
  const system = eventSolarSystem(t);
  const passing = c === 'death' || c === 'shraddha';
  if (system === 'malayalam' && (passing || c === 'birthday')) return { recurrence: 'solar', by: 'star' };
  if (system === 'tamil' && (passing || c === 'birthday')) return { recurrence: 'solar', by: passing ? 'thithi' : 'star' };
  return { recurrence: 'thithi', by: 'star' };
}

async function resizePhoto(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const size = 192;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const s = Math.min(img.width, img.height);
  ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function EventForm({ existing, draft }: { existing?: FamilyEvent; draft?: EventDraft }) {
  const { x, t, lang } = useText(EVENT_FORM_TEXT);
  const defaultTitle = (c: EventCategory) => (c === 'death' || c === 'shraddha' ? x('annualShraddha') : CATEGORY[lang][c]);
  const settings = useStore((s) => s.settings);
  const today = todayIn(settings.place.tz);
  const [category, setCategory] = useState<EventCategory>(existing?.category ?? draft?.category ?? 'birthday');
  const [allTypes, setAllTypes] = useState(false);
  const [personName, setPersonName] = useState(existing?.personName ?? draft?.personName ?? '');
  const [relationship, setRelationship] = useState(existing?.relationship ?? draft?.relationship ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [originalDate, setOriginalDate] = useState(existing?.originalDate ?? draft?.originalDate ?? '');
  const [originalTime, setOriginalTime] = useState(existing?.originalTime ?? '');
  const [place, setPlace] = useState(existing?.originalPlace ?? settings.place);
  const initial = defaultRepeat(existing?.category ?? draft?.category ?? 'birthday', settings.tradition);
  const [recurrence, setRecurrence] = useState<Recurrence>(existing?.recurrence ?? draft?.recurrence ?? initial.recurrence);
  const [solarBy, setSolarBy] = useState<SolarAnchor['by']>(existing?.solar?.by ?? initial.by);
  const [solarMonth, setSolarMonth] = useState<number | null>(existing?.solar?.month ?? null);
  const [star, setStar] = useState<number | null>(existing?.solar?.nakshatra ?? null);
  const [repeat, setRepeat] = useState<NonNullable<SolarAnchor['repeat']>>(existing?.solar?.repeat ?? 'first');
  const [manual, setManual] = useState<LunarDate | null>(existing?.lunarSource === 'user' ? existing.lunar ?? null : null);
  const [choice, setChoice] = useState<number | null>(null);
  const [rule, setRule] = useState<ObservanceRule>(existing?.rule ?? defaultRule(existing?.category ?? draft?.category ?? 'birthday'));
  const [adhikaPolicy, setAdhikaPolicy] = useState(existing?.adhikaPolicy ?? 'nija');
  const [tradition, setTradition] = useState(existing?.tradition ?? settings.tradition);
  const [nakshatraIndex, setNakshatraIndex] = useState<number | undefined>(existing?.nakshatraIndex);
  const [reminders, setReminders] = useState<Reminder[]>(existing?.reminders ?? (
    draft?.reminders.length
      ? draft.reminders.map((r) => ({ id: uid(), daysBefore: r.daysBefore, time: r.time ?? settings.reminderTime, channels: ['push'] }))
      : [{ id: uid(), daysBefore: 1, time: settings.reminderTime, channels: ['push'] }, { id: uid(), daysBefore: 0, time: settings.reminderTime, channels: ['push'] }]
  ));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [rituals, setRituals] = useState(existing?.rituals ?? '');
  const [photo, setPhoto] = useState(existing?.photo);
  const [privacy, setPrivacy] = useState(existing?.privacy ?? 'private');
  const [customDays, setCustomDays] = useState('');
  const [error, setError] = useState('');

  const byThithi = recurrence === 'thithi' || (recurrence === 'solar' && solarBy === 'thithi');
  const resolution = useMemo(() => {
    if (!originalDate || !byThithi) return null;
    try { return resolveLunarDate(originalDate, originalTime || undefined, place); } catch { return null; }
  }, [originalDate, originalTime, place, byThithi]);

  const ambiguous = !!resolution && resolution.options.length > 1;
  const lunar: LunarDate | undefined = manual ?? (resolution ? (ambiguous ? (choice !== null ? resolution.options[choice].lunar : undefined) : resolution.lunar) : undefined);

  // Tamil Nadu and Kerala: the solar month of the original date, and its nakshatra (at the time
  // given, or at sunrise — in Kerala, 6 nazhika after sunrise).
  const system = eventSolarSystem(tradition);
  const solarCalc = useMemo(() => {
    if (!system || !originalDate) return null;
    try {
      const { y, m, d } = parseCivil(originalDate);
      const sunrise = sunTimes(originalDate, place).sunrise;
      const at = originalTime
        ? zonedToUtc(y, m, d, +originalTime.slice(0, 2), +originalTime.slice(3, 5), place.tz)
        : new Date(sunrise.getTime() + (system === 'malayalam' ? 2.4 * 3600000 : 0));
      return { month: solarDate(originalDate, place, system).month, star: nakshatraIndexAt(at) };
    } catch { return null; }
  }, [system, originalDate, originalTime, place]);
  const solar: SolarAnchor | undefined = recurrence === 'solar' && system && solarCalc && (solarBy === 'star' || lunar)
    ? {
        system, month: solarMonth ?? solarCalc.month, by: solarBy, repeat,
        ...(solarBy === 'star' ? { nakshatra: star ?? solarCalc.star } : { tithiIndex: lunar!.tithiIndex }),
      }
    : undefined;

  const preview = useMemo(() => {
    if (!originalDate || (recurrence === 'thithi' && !lunar) || (recurrence === 'solar' && !solar)) return [];
    const e = { ...build(), id: 'preview' };
    return occurrencesBetween(e, settings, today, addDays(today, 365 * 3)).slice(0, 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalDate, recurrence, lunar, rule, adhikaPolicy, settings, today, JSON.stringify(solar)]);

  function build(): FamilyEvent {
    const now = new Date().toISOString();
    return {
      id: existing?.id ?? uid(),
      personName: personName.trim() || (relationship ? relationLabel(relationship, lang) : x('unnamed')),
      relationship: relationship || 'Other',
      category, title: title.trim() || defaultTitle(category),
      originalDate, originalTime: originalTime || undefined, originalPlace: place,
      recurrence, lunar: recurrence === 'thithi' ? lunar : undefined, solar: recurrence === 'solar' ? solar : undefined,
      lunarSource: manual ? 'user' : 'computed',
      nakshatraIndex, tradition, rule, adhikaPolicy, reminders,
      notes: notes || undefined, rituals: rituals || undefined, photo, privacy,
      isSample: existing?.isSample && existing.personName === personName ? true : undefined,
      createdAt: existing?.createdAt ?? now, updatedAt: now,
    };
  }

  function onSave() {
    if (!personName.trim() && !relationship) return setError(x('errName'));
    if (!originalDate) return setError(x('errDate'));
    if (recurrence === 'thithi' && !lunar) return setError(x('errThithi'));
    if (recurrence === 'solar' && !solar) return setError(x('errSolar'));
    const e = build();
    saveEvent(e);
    if (reminders.length && !e.isSample) {
      if (nativeReminders) askReminderPermission().catch(() => {});
      else if (typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    }
    go({ tab: 'events', id: e.id });
  }

  const when = (days: number) => (days === 0 ? x('onDay') : days === 1 ? x('dayBefore') : x('daysBefore', { n: days }));

  const toggleReminder = (days: number) => {
    const has = reminders.find((r) => r.daysBefore === days);
    setReminders(has ? reminders.filter((r) => r !== has) : [...reminders, { id: uid(), daysBefore: days, time: settings.reminderTime, channels: ['push'] } as Reminder].sort((a, b) => b.daysBefore - a.daysBefore));
  };

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="card">
        <h2>{x(existing ? 'editEvent' : 'addTitle')}</h2>
        <fieldset>
          <legend>{x('kind')}</legend>
          <div className="chips">
            {(allTypes || !COMMON.includes(category) ? QUICK : COMMON).map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={category === c}
                onClick={() => {
                  setCategory(c); setRule(defaultRule(c));
                  if (!existing) { const d = defaultRepeat(c, tradition); setRecurrence(d.recurrence); setSolarBy(d.by); }
                }}>{CATEGORY[lang][c]}</button>
            ))}
            {!allTypes && COMMON.includes(category) && <button type="button" className="chip" onClick={() => setAllTypes(true)}>{x('other')}</button>}
          </div>
        </fieldset>
        <label className="field">{x('personName')}
          <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder={x('namePh')} autoComplete="off" />
        </label>
        <DateFields lang={lang}
          label={x(category === 'death' ? 'datePassing' : category === 'birthday' ? 'dateBirth' : 'dateEvent')}
          value={originalDate} onChange={(v) => { setOriginalDate(v); setChoice(null); setSolarMonth(null); setStar(null); }} />
      </section>

      <section className="card">
        <fieldset>
          <legend>{x('repeat')}</legend>
          <label className="radio"><input type="radio" checked={recurrence === 'thithi'} onChange={() => setRecurrence('thithi')} />
            <div><strong>{x('byThithi')}</strong><div className="small muted">{x('byThithiSub')}</div></div></label>
          {system && (['star', 'thithi'] as const).map((by) => (
            <label key={by} className="radio"><input type="radio" checked={recurrence === 'solar' && solarBy === by} onChange={() => { setRecurrence('solar'); setSolarBy(by); }} />
              <div><strong>{x(by === 'star' ? 'byStar' : 'bySolarThithi', { cal: x(system === 'tamil' ? 'calTamil' : 'calMalayalam') })}</strong>
                <div className="small muted">{x(by === 'star' ? 'byStarSub' : 'bySolarThithiSub')}</div></div></label>
          ))}
          <label className="radio"><input type="radio" checked={recurrence === 'gregorian'} onChange={() => setRecurrence('gregorian')} />
            <div><strong>{x('byDate')}</strong><div className="small muted">{x('byDateSub')}{originalDate ? ` (${formatCivil(originalDate, LOCALE[lang], { day: 'numeric', month: 'long' })})` : ''}</div></div></label>
          <label className="radio"><input type="radio" checked={recurrence === 'none'} onChange={() => setRecurrence('none')} />
            <div><strong>{x('noRepeat')}</strong></div></label>
        </fieldset>

        {byThithi && resolution && !manual && (
          ambiguous ? (
            <fieldset>
              <legend>{x('whichThithi')}</legend>
              <div className="note warn small">{resolution.note}</div>
              {resolution.options.map((o, i) => (
                <label key={i} className="radio"><input type="radio" name="opt" checked={choice === i} onChange={() => setChoice(i)} /><div>{o.label}</div></label>
              ))}
              <p className="small muted" style={{ margin: 0 }}>{x('timeTip')}</p>
            </fieldset>
          ) : (
            <div className="note good"><strong>{recurrence === 'solar' && solar ? describeSolar(solar, lang) : describeLunar(resolution.lunar, lang)}</strong><div className="small">{resolution.note}</div></div>
          )
        )}
        {recurrence === 'solar' && solarBy === 'star' && solar && (
          <div className="note good"><strong>{describeSolar(solar, lang)}</strong><div className="small">{x(originalTime ? 'starAt' : 'starNoTime')}</div></div>
        )}
        {recurrence === 'thithi' && manual && (
          <div className="note good"><strong>{describeLunar(manual, lang)}</strong><div className="small">{x('manualNote')}</div></div>
        )}

        {preview.length > 0 && (
          <div className="stack">
            <strong>{x('nextObs')}</strong>
            {preview.map((o) => (
              <div key={o.date} className="note info small"><strong>{formatCivil(o.date, LOCALE[lang])}</strong> — {o.reason}{o.caution && <div>⚠ {o.caution}</div>}</div>
            ))}
            <p className="tiny muted">{x('calcFor', { place: settings.place.name })}</p>
          </div>
        )}
      </section>

      <section className="card">
        <fieldset>
          <legend>{x('remindMe')}</legend>
          <div className="chips">
            {[0, 1, 3, 7].map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={reminders.some((r) => r.daysBefore === d)} onClick={() => toggleReminder(d)}>
                {when(d)}
              </button>
            ))}
          </div>
          {reminders.length > 0 && <p className="small muted" style={{ margin: 0 }}>{x('atTimes', { times: [...new Set(reminders.map((r) => clock(r.time, lang)))].join(', ') })}</p>}
        </fieldset>
      </section>

      <details className="card" open={!!manual}>
        <summary>{x('more')}</summary>
        <p className="small muted">{x('moreIntro')}</p>
        <label className="field">{x('relationship')}
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            <option value="">{x('choose')}</option>
            {RELATIONS.map((r) => <option key={r} value={r}>{relationLabel(r, lang)}</option>)}
          </select>
        </label>
        <label className="field">{x('time')}
          <span className="hint">{x('timeHint')}</span>
          <input type="time" value={originalTime} onChange={(e) => { setOriginalTime(e.target.value); setChoice(null); setStar(null); }} />
        </label>
        <div className="field">{x('where')}
          <span className="hint">{x('whereHint')}</span>
          <PlacePicker value={place} onChange={(p) => { setPlace(p); setChoice(null); }} label={x('placeLabel')} locate={false} />
        </div>
        {recurrence === 'thithi' && (
          <details open={!!manual}>
            <summary>{x(manual ? 'usingManual' : 'knowThithi')}</summary>
            <div className="grid2" style={{ marginTop: 8 }}>
              <label className="field">{x('lunarMonth')}
                <select value={manual?.monthIndex ?? lunar?.monthIndex ?? 0} onChange={(e) => setManual({ ...(manual ?? lunar ?? { adhika: false, tithiIndex: 0 }), monthIndex: +e.target.value } as LunarDate)}>
                  {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{monthName(i, lang)}</option>)}
                </select>
              </label>
              <label className="field">{x('pakshaThithi')}
                <select value={manual?.tithiIndex ?? lunar?.tithiIndex ?? 0} onChange={(e) => setManual({ ...(manual ?? lunar ?? { adhika: false, monthIndex: 0 }), tithiIndex: +e.target.value } as LunarDate)}>
                  {Array.from({ length: 30 }, (_, i) => <option key={i} value={i}>{tithiFullName(i, lang)}</option>)}
                </select>
              </label>
            </div>
            <label className="row small" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={manual?.adhika ?? false} onChange={(e) => setManual({ ...(manual ?? lunar ?? { monthIndex: 0, tithiIndex: 0 }), adhika: e.target.checked } as LunarDate)} />
              {x('adhikaCheck')}
            </label>
            {manual && <button className="btn ghost" type="button" onClick={() => setManual(null)}>{x('useCalc')}</button>}
          </details>
        )}
        {recurrence === 'solar' && system && solar && (
          <div className="grid2">
            <label className="field">{x('solarMonth')}
              <select value={solar.month} onChange={(e) => setSolarMonth(+e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{solarMonthName(system, i, lang)}</option>)}
              </select>
            </label>
            {solarBy === 'star' && (
              <label className="field">{x('star')}
                <select value={solar.nakshatra} onChange={(e) => setStar(+e.target.value)}>
                  {Array.from({ length: 27 }, (_, i) => <option key={i} value={i}>{nakshatraName(i, lang)}</option>)}
                </select>
              </label>
            )}
            <label className="field">{x('twice')}
              <select value={repeat} onChange={(e) => setRepeat(e.target.value as 'first' | 'second')}>
                <option value="first">{x('keepFirst')}</option>
                <option value="second">{x('keepSecond')}</option>
              </select>
            </label>
          </div>
        )}
        <fieldset>
          <legend>{x('reminderTimes')}</legend>
          {reminders.map((r) => (
            <div key={r.id} className="row">
              <span className="grow">{x('remindAt', { when: when(r.daysBefore) })}</span>
              <input type="time" value={r.time} style={{ width: 140 }} aria-label={x('reminderTime')}
                onChange={(e) => setReminders(reminders.map((x) => (x.id === r.id ? { ...x, time: e.target.value } : x)))} />
              <button type="button" className="btn ghost" aria-label={x('removeReminder')} onClick={() => setReminders(reminders.filter((x) => x.id !== r.id))}>✕</button>
            </div>
          ))}
          <div className="row">
            <input type="number" min={1} max={60} placeholder={x('customDays')} value={customDays} onChange={(e) => setCustomDays(e.target.value)} style={{ width: 150 }} aria-label={x('customDaysAria')} />
            <button type="button" className="btn" disabled={!customDays || reminders.some((r) => r.daysBefore === +customDays)} onClick={() => { toggleReminder(+customDays); setCustomDays(''); }}>{x('add')}</button>
          </div>
          <p className="tiny muted">{x('tzNote', { tz: settings.place.tz })}</p>
        </fieldset>
        <label className="field">{x('title')}<input type="text" value={title} placeholder={defaultTitle(category)} onChange={(e) => setTitle(e.target.value)} /></label>
        {(recurrence === 'thithi' || recurrence === 'solar') && (
          <>
            <label className="field">{x('rule')}
              <span className="hint">{x('ruleHint')}</span>
              <select value={rule} onChange={(e) => setRule(e.target.value as ObservanceRule)}>
                {(['sunrise', 'aparahna', 'madhyahna', 'pradosha'] as ObservanceRule[]).map((r) => <option key={r} value={r}>{RULE[lang][r]}{r === defaultRule(category) ? x('usual') : ''}</option>)}
              </select>
            </label>
            {recurrence === 'thithi' && (
              <label className="field">{x('adhikaYears')}
                <select value={adhikaPolicy} onChange={(e) => setAdhikaPolicy(e.target.value as 'nija' | 'both')}>
                  <option value="nija">{x('nija')}</option>
                  <option value="both">{x('both')}</option>
                </select>
              </label>
            )}
            <label className="field">{x('tradition')}
              <select value={tradition} onChange={(e) => {
                const t = e.target.value as TraditionId;
                setTradition(t);
                // Solar repeats need a solar calendar; fall back to the lunar thithi otherwise.
                if (recurrence === 'solar' && !eventSolarSystem(t)) setRecurrence('thithi');
              }}>
                {TRADITIONS.map((tr) => <option key={tr.id} value={tr.id}>{traditionName(tr, lang)}</option>)}
              </select>
            </label>
          </>
        )}
        <label className="field">{x('janma')}
          <select value={nakshatraIndex ?? ''} onChange={(e) => setNakshatraIndex(e.target.value === '' ? undefined : +e.target.value)}>
            <option value="">—</option>
            {Array.from({ length: 27 }, (_, i) => <option key={i} value={i}>{nakshatraName(i, lang)}</option>)}
          </select>
        </label>
        <label className="field">{x('rituals')}<textarea value={rituals} onChange={(e) => setRituals(e.target.value)} placeholder={x('ritualsPh')} /></label>
        <label className="field">{x('notes')}<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <div className="row">
          {photo && <img className="photo-preview" src={photo} alt="" />}
          <label className="btn">{x(photo ? 'changePhoto' : 'addPhoto')}
            <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await resizePhoto(f)); }} />
          </label>
          {photo && <button type="button" className="btn ghost" onClick={() => setPhoto(undefined)}>{x('remove')}</button>}
        </div>
        <fieldset>
          <legend>{x('privacy')}</legend>
          <label className="radio"><input type="radio" checked={privacy === 'private'} onChange={() => setPrivacy('private')} /><div><strong>{x('private')}</strong><div className="small muted">{x('privateSub')}</div></div></label>
          <label className="radio"><input type="radio" checked={privacy === 'family'} onChange={() => setPrivacy('family')} /><div><strong>{x('shared')}</strong><div className="small muted">{x('sharedSub')}</div></div></label>
        </fieldset>
      </details>

      {error && <div className="note bad" role="alert">{error}</div>}
      <div className="row">
        <button className="btn primary grow" onClick={onSave}>{x('saveEvent')}</button>
        <button className="btn" onClick={() => history.back()}>{t('cancel')}</button>
      </div>
    </div>
  );
}
