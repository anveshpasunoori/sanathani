// What the phone's home-screen widget shows. The widget can't run the Panchang engine, so the app
// works out the next two weeks — already in the reader's language and script — and hands them to
// the widget (iOS: an App Group shared with the widget extension; Android: SharedPreferences). The
// widget then picks the current day and, within it, the thithi and nakshatra prevailing right now,
// so it stays correct for two weeks even if the app isn't opened.
import { translate, LOCALE } from '../i18n';
import { CATEGORY } from '../locales/common';
import { festivalName } from '../locales/festivals';
import { HOME_TEXT } from '../locales/home';
import { nakshatraName, tithiFullName, weekdayName, type Lang } from '../engine/names';
import { observancesInRange } from '../engine/observances';
import { dayPanchang } from '../engine/panchang';
import { addDays, formatCivil, formatTime, type CivilDate } from '../engine/tz';
import { displayMonth, solarLabel } from './traditions';
import { upcoming } from './occurrences';
import type { AppState } from './types';

/** A thithi or nakshatra and when it ends (ISO instant), so the widget can switch at the right moment. */
export interface WidgetSpan { name: string; ends: string }

export interface WidgetDay {
  date: CivilDate;
  /** "Tuesday, 27 Oct" in the reader's language. */
  heading: string;
  /** "Ashvayuja" (or "Kartik 10 · Ashvayuja" in the solar-month regions). */
  month: string;
  tithis: WidgetSpan[];
  nakshatras: WidgetSpan[];
  sunrise: string;
  sunset: string;
  /** "3:20 pm – 4:40 pm"; ISO bounds let the widget mark it while it is on. */
  rahu: { text: string; start: string; end: string };
  /** Festivals and vratas of the day. */
  festivals: string[];
  /** Family events that fall on this day: "Venkata Rao — Annual Shraddha". */
  family: string[];
}

export interface WidgetData {
  version: 1;
  lang: Lang;
  place: string;
  /** Headings in the reader's language. */
  labels: { thithi: string; nakshatra: string; rahu: string; sunrise: string; sunset: string; now: string; openApp: string };
  /** The next family event within 60 days, for the larger widget: "Venkata Rao — Annual Shraddha · 18 Nov". */
  nextFamily?: string;
  days: WidgetDay[];
  made: string;
}

const DAYS = 14;

export function widgetData(s: AppState, today: CivilDate, days = DAYS): WidgetData {
  const { place, tradition, lang } = s.settings;
  const loc = LOCALE[lang];
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const clock = (d: Date) => formatTime(d, place.tz, loc);
  const obs = observancesInRange(today, addDays(today, days - 1), place, tradition);
  const fam = upcoming(s.events, s.settings, today, 60);
  const famLabel = (o: (typeof fam)[number]) => `${o.event.personName} — ${o.event.title ?? CATEGORY[lang][o.event.category]}`;

  const out: WidgetDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const p = dayPanchang(date, place);
    const solar = solarLabel(date, place, tradition, lang);
    const lunar = displayMonth(p.month, p.tithis[0].index, tradition, lang);
    out.push({
      date,
      heading: `${weekdayName(p.weekday, lang)}, ${formatCivil(date, loc, { day: 'numeric', month: 'short' })}`,
      month: solar ? `${solar} · ${lunar}` : lunar,
      tithis: p.tithis.map((x) => ({ name: tithiFullName(x.index, lang), ends: x.end.toISOString() })),
      nakshatras: p.nakshatras.map((x) => ({ name: nakshatraName(x.index, lang), ends: x.end.toISOString() })),
      sunrise: clock(p.sunrise),
      sunset: clock(p.sunset),
      rahu: { text: `${clock(p.rahuKalam.start)} – ${clock(p.rahuKalam.end)}`, start: p.rahuKalam.start.toISOString(), end: p.rahuKalam.end.toISOString() },
      festivals: obs.filter((o) => o.date === date).map((o) => festivalName(o, lang)),
      family: fam.filter((o) => o.date === date).map(famLabel),
    });
  }
  const next = fam[0];
  return {
    version: 1,
    lang,
    place: place.name,
    labels: {
      thithi: t('thithi'), nakshatra: t('nakshatra'), rahu: t('rahu'), sunrise: t('sunrise'), sunset: t('sunset'),
      now: HOME_TEXT[lang].now, openApp: t('todayPanchang'),
    },
    nextFamily: next && `${famLabel(next)} · ${formatCivil(next.date, loc, { day: 'numeric', month: 'short' })}`,
    days: out,
    made: new Date().toISOString(),
  };
}
