import { nextOccurrence, upcoming } from '../data/occurrences';
import { displayMonth, solarLabel, tradition, traditionYear } from '../data/traditions';
import type { AppState, FamilyEvent } from '../data/types';
import { ACTIVITY_LABEL, MUHURTA_ASSUMPTIONS, assessDay, type DayAssessment } from '../engine/muhurta';
import { karanaName, nakshatraName, pakshaName, pakshaOf, SAMVATSARA, tithiFullName, weekdayName, yogaName } from '../engine/names';
import { observancesInRange } from '../engine/observances';
import { dayPanchang } from '../engine/panchang';
import { describeLunar } from '../engine/recurrence';
import { describeSolar } from '../engine/solarRecurrence';
import { ritualsFor, SHRADDHA_NOTE } from '../engine/rituals';
import { addDays, formatCivil, formatTime, formatTimeRel, todayIn, type CivilDate } from '../engine/tz';
import { parse, type EventDraft } from './parse';

export interface Answer {
  title: string;
  lines: string[];
  sections?: Array<{ heading: string; items: string[] }>;
  caution?: string;
  source?: string;
  draft?: EventDraft;
  eventIds?: string[];
}

function sourceLine(s: AppState): string {
  const t = tradition(s.settings.tradition);
  return `Source: calculated on this device from astronomical positions (Drik method, Lahiri ayanamsa) for ${s.settings.place.name} (${s.settings.place.tz}). Tradition: ${t.name}. Not a copy of a published almanac — confirm important dates with your local Panchangam or priest.`;
}

const span = (a: Date, b: Date, tz: string, ref: CivilDate) => `${formatTimeRel(a, ref, tz)} – ${formatTimeRel(b, ref, tz)}`;

const ERA_EN = { kollam: 'Kollam Era', bangabda: 'Bangabda', vikram: 'Vikram Samvat' };

export function panchangLines(date: CivilDate, s: AppState): Answer['sections'] {
  const { place, tradition: tr } = s.settings;
  const p = dayPanchang(date, place);
  const tz = place.tz;
  const t0 = p.tithis[0];
  const yr = traditionYear(date, place, tr, p);
  const solar = solarLabel(date, place, tr, 'en');
  return [
    {
      heading: 'Panchangam',
      items: [
        `${'era' in yr ? `${ERA_EN[yr.era]} ${yr.n}` : `Samvatsara: ${SAMVATSARA[yr.samvatsara]}`} · Month: ${solar ? `${solar} (lunar ${displayMonth(p.month, t0.index, tr, 'en')})` : displayMonth(p.month, t0.index, tr, 'en')} · ${pakshaName(pakshaOf(t0.index))}`,
        ...p.tithis.map((t, i) => `${i === 0 ? 'Thithi' : 'then'}: ${tithiFullName(t.index)} until ${formatTimeRel(t.end, date, tz)}`),
        ...p.nakshatras.map((n, i) => `${i === 0 ? 'Nakshatra' : 'then'}: ${nakshatraName(n.index)} until ${formatTimeRel(n.end, date, tz)}`),
        `Yoga: ${yogaName(p.yogas[0].index)} until ${formatTimeRel(p.yogas[0].end, date, tz)}`,
        `Karana: ${karanaName(p.karanas[0].index)} until ${formatTimeRel(p.karanas[0].end, date, tz)}`,
      ],
    },
    {
      heading: 'Timings',
      items: [
        `Sunrise ${formatTime(p.sunrise, tz)} · Sunset ${formatTime(p.sunset, tz)}${p.sunApproximated ? ' (approximate — no true sunrise at this latitude)' : ''}`,
        `Rahu Kalam ${span(p.rahuKalam.start, p.rahuKalam.end, tz, date)}`,
        `Yamagandam ${span(p.yamagandam.start, p.yamagandam.end, tz, date)}`,
        `Gulika Kalam ${span(p.gulikaKalam.start, p.gulikaKalam.end, tz, date)}`,
        p.abhijit ? `Abhijit Muhurta ${span(p.abhijit.start, p.abhijit.end, tz, date)}` : 'Abhijit Muhurta: traditionally not used on Wednesdays',
      ],
    },
  ];
}

function assessmentAnswer(a: DayAssessment, s: AppState): Answer {
  const tz = s.settings.place.tz;
  const verdict = a.verdict === 'favorable' ? 'Traditionally favorable'
    : a.verdict === 'mixed' ? 'Mixed — favorable only during certain hours' : 'Traditionally not recommended';
  return {
    title: `${formatCivil(a.date)} for ${ACTIVITY_LABEL[a.activity]}: ${verdict}`,
    lines: [
      `Thithi ${tithiFullName(a.panchang.tithis[0].index)}, Nakshatra ${nakshatraName(a.panchang.nakshatras[0].index)}, ${weekdayName(a.panchang.weekday)}.`,
    ],
    sections: [
      { heading: 'Traditional considerations', items: a.factors.map((f) => `${f.good ? '✓' : '✗'} ${f.text}`) },
      {
        heading: 'Available windows',
        items: a.windows.length
          ? a.windows.map((w) => `${span(w.start, w.end, tz, a.date)} — ${tithiFullName(w.tithi)}, ${nakshatraName(w.nakshatra)}`)
          : ['No daytime window passes the traditional screen on this day.'],
      },
      { heading: 'Periods to avoid', items: a.avoid.map((x) => `${x.name} ${span(x.span.start, x.span.end, tz, a.date)}`) },
    ],
    caution: (a.activity === 'marriage' ? 'Marriage muhurtas depend on both horoscopes and Lagna — please consult a qualified priest. ' : '') +
      'These are traditional beliefs, not predictions: no timing guarantees success or failure. ' + MUHURTA_ASSUMPTIONS,
    source: sourceLine(s),
  };
}

function eventLabel(e: FamilyEvent): string {
  return `${e.personName}${e.title ? ` — ${e.title}` : ''}`;
}

export function answer(question: string, s: AppState): Answer {
  const today = todayIn(s.settings.place.tz);
  const intent = parse(question, today);
  const place = s.settings.place;

  switch (intent.kind) {
    case 'panchang': {
      const p = dayPanchang(intent.date, place);
      return {
        title: `Panchangam for ${formatCivil(intent.date)} · ${place.name}`,
        lines: [`${weekdayName(p.weekday)}: ${tithiFullName(p.tithis[0].index)} at sunrise, ${nakshatraName(p.nakshatras[0].index)} nakshatra.`],
        sections: panchangLines(intent.date, s),
        source: sourceLine(s),
      };
    }
    case 'rituals': {
      const p = dayPanchang(intent.date, place);
      const items = p.tithis.flatMap((t) => ritualsFor(t.index).map((r) => `${tithiFullName(t.index)}: ${r}`));
      const obs = observancesInRange(intent.date, intent.date, place, s.settings.tradition);
      return {
        title: `Traditionally observed on ${formatCivil(intent.date)}`,
        lines: obs.length ? [`Observances: ${obs.map((o) => o.name).join(', ')}.`] : [],
        sections: [{ heading: 'Customary practices', items: items.length ? items : ['No specific thithi observance; daily worship as per family custom.'] }],
        caution: 'Practices vary by region, family and sampradaya. These are customary observances, not obligations.',
        source: sourceLine(s),
      };
    }
    case 'suitability':
      return assessmentAnswer(assessDay(intent.date, place, intent.activity), s);
    case 'best-muhurta': {
      const days: DayAssessment[] = [];
      for (let d = intent.from; d <= intent.to; d = addDays(d, 1)) days.push(assessDay(d, place, intent.activity));
      const ranked = days.filter((d) => d.windows.length).sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, 3);
      const tz = place.tz;
      return {
        title: `Best traditional options for ${ACTIVITY_LABEL[intent.activity]}, ${formatCivil(intent.from)} – ${formatCivil(intent.to)}`,
        lines: ranked.length ? [] : ['No day in this range passes the traditional screen. Try a longer range or consult your priest.'],
        sections: ranked.map((d) => ({
          heading: `${formatCivil(d.date)} — ${d.verdict === 'favorable' ? 'favorable' : 'partly favorable'}`,
          items: [
            ...d.windows.map((w) => `Window ${span(w.start, w.end, tz, d.date)}: ${tithiFullName(w.tithi)}, ${nakshatraName(w.nakshatra)}`),
            ...d.factors.filter((f) => !f.good).map((f) => `Note: ${f.text}`),
            `Avoid: ${d.avoid.map((x) => `${x.name} ${span(x.span.start, x.span.end, tz, d.date)}`).join('; ')}`,
          ],
        })),
        caution: (intent.activity === 'marriage' ? 'For marriage, please consult a qualified priest; this screen does not consider horoscopes. ' : '') +
          'Recommendations reflect traditional beliefs and vary across regions and families. ' + MUHURTA_ASSUMPTIONS,
        source: sourceLine(s),
      };
    }
    case 'family-event': {
      const matches = s.events.filter((e) =>
        (!intent.relation || e.relationship.toLowerCase() === intent.relation.toLowerCase()) &&
        (!intent.category || e.category === intent.category || (intent.category === 'death' && e.category === 'shraddha')));
      if (!matches.length) {
        return {
          title: 'No matching saved event',
          lines: [
            `I couldn't find a saved ${intent.category ?? 'event'}${intent.relation ? ` for your ${intent.relation.toLowerCase()}` : ''}.`,
            'Add it once with the original date (and time, if known) and I will calculate the observance every year.',
            ...(intent.category === 'death' || /shraddh|abdik|taddin/.test(intent.text) ? [SHRADDHA_NOTE] : []),
          ],
          draft: { category: intent.category, relationship: intent.relation, recurrence: intent.category === 'death' ? 'thithi' : undefined, reminders: [] },
        };
      }
      const items = matches.map((e) => {
        const o = nextOccurrence(e, s.settings, today);
        return o ? `${eventLabel(e)}: ${formatCivil(o.date)}. ${o.reason}${o.caution ? ` ⚠ ${o.caution}` : ''}` : `${eventLabel(e)}: no upcoming date.`;
      });
      return {
        title: matches.length === 1 ? `Next: ${eventLabel(matches[0])}` : 'Matching family events',
        lines: [],
        sections: [{ heading: 'Next observance', items }],
        caution: matches.some((e) => e.category === 'death' || e.category === 'shraddha') ? SHRADDHA_NOTE : undefined,
        source: sourceLine(s),
        eventIds: matches.map((e) => e.id),
      };
    }
    case 'upcoming-events': {
      const list = upcoming(s.events, s.settings, today, intent.days);
      return {
        title: `Family events in the next ${intent.days} days`,
        lines: list.length ? [] : ['Nothing scheduled in this period.'],
        sections: list.length ? [{ heading: 'Upcoming', items: list.map((o) => `${formatCivil(o.date)} — ${eventLabel(o.event)}${o.event.recurrence === 'thithi' && o.event.lunar ? ` (${describeLunar(o.event.lunar)})` : o.event.recurrence === 'solar' && o.event.solar ? ` (${describeSolar(o.event.solar)})` : ''}`) }] : undefined,
        eventIds: list.map((o) => o.event.id),
      };
    }
    case 'observances': {
      const list = observancesInRange(intent.from, intent.to, place, s.settings.tradition);
      return {
        title: `Observances ${formatCivil(intent.from)} – ${formatCivil(intent.to)}`,
        lines: list.length ? [] : ['No listed observances in this period.'],
        sections: list.length ? [{ heading: 'Calculated by traditional rule', items: list.map((o) => `${formatCivil(o.date)} — ${o.name}`) }] : undefined,
        caution: 'Dates are computed by rule; regional almanacs may differ by a day (e.g. Smarta vs Vaishnava Ekadashi).',
        source: sourceLine(s),
      };
    }
    case 'why-different':
      return {
        title: 'Why Thithi anniversaries move on the Gregorian calendar',
        lines: [
          'A lunar year of 12 months is about 354 days — roughly 11 days shorter than the solar (Gregorian) year. So a thithi falls about 11 days earlier each year.',
          'Every 2–3 years an extra lunar month (Adhika Masa) is inserted to keep the lunar calendar aligned with the seasons, and the date jumps about 19 days later.',
          'The day is also chosen by when the thithi prevails at a specific time of day (sunrise, or the afternoon for Shraddha) at your location, so the same thithi can fall on different civil dates in India and the USA.',
        ],
        source: sourceLine(s),
      };
    case 'add-event':
      return {
        title: 'Please confirm this new event',
        lines: [
          `Type: ${intent.draft.category ?? 'custom'}${intent.draft.relationship ? ` · ${intent.draft.relationship}` : ''}`,
          `Repeats: ${intent.draft.recurrence === 'thithi' ? 'every year by Telugu Thithi' : intent.draft.recurrence === 'gregorian' ? 'every year on the same Gregorian date' : 'to be chosen'}`,
          `Reminders: ${intent.draft.reminders.length ? intent.draft.reminders.map((r) => `${r.daysBefore === 0 ? 'on the day' : `${r.daysBefore} day(s) before`}${r.time ? ` at ${r.time}` : ''}`).join(', ') : 'default'}`,
          intent.draft.originalDate ? `Original date: ${formatCivil(intent.draft.originalDate)}` : 'I still need the original date — tap Review to add it.',
        ],
        draft: intent.draft,
      };
    case 'help':
    default:
      return {
        title: 'Try asking',
        lines: [
          'What does today\'s Panchangam say?',
          'Is tomorrow good for starting a business?',
          'Best muhurta next week for a housewarming',
          'When is my father\'s death anniversary this year?',
          'Which family events are coming up in the next 30 days?',
          'Upcoming festivals this month',
          'Remember my wedding anniversary on the Telugu calendar and remind me 3 days before',
        ],
      };
  }
}
