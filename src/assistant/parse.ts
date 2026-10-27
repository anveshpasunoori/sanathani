// Natural-language understanding for the assistant. Deterministic and offline: every answer is
// built from engine output, never from free-form generation.
import type { Activity } from '../engine/muhurta';
import { addDays, parseCivil, civil, weekdayOf, type CivilDate } from '../engine/tz';
import type { EventCategory, Recurrence } from '../data/types';

export type Intent =
  | { kind: 'add-event'; draft: EventDraft }
  | { kind: 'family-event'; relation?: string; category?: EventCategory; text: string }
  | { kind: 'upcoming-events'; days: number }
  | { kind: 'why-different' }
  | { kind: 'best-muhurta'; activity: Activity; from: CivilDate; to: CivilDate }
  | { kind: 'suitability'; activity: Activity; date: CivilDate }
  | { kind: 'rituals'; date: CivilDate }
  | { kind: 'panchang'; date: CivilDate }
  | { kind: 'observances'; from: CivilDate; to: CivilDate }
  | { kind: 'help' };

export interface EventDraft {
  category?: EventCategory;
  relationship?: string;
  personName?: string;
  recurrence?: Recurrence;
  originalDate?: CivilDate;
  reminders: Array<{ daysBefore: number; time?: string }>;
}

const RELATIONS: Array<[RegExp, string]> = [
  [/father[- ]in[- ]law|mama ?garu|మామగారు/, 'Father-in-law'],
  [/mother[- ]in[- ]law|atha ?garu|అత్తగారు/, 'Mother-in-law'],
  [/grand ?father|grandpa|tatayya|thatha|తాతయ్య|తాత/, 'Grandfather'],
  [/grand ?mother|grandma|nanamma|nannamma|ammamma|నానమ్మ|అమ్మమ్మ|బామ్మ/, 'Grandmother'],
  [/father|dad\b|daddy|nanna|నాన్న/, 'Father'],
  [/mother|\bmom\b|\bmum\b|amma\b|అమ్మ/, 'Mother'],
  [/wife|భార్య/, 'Wife'],
  [/husband|భర్త/, 'Husband'],
  [/\bson\b|కొడుకు/, 'Son'],
  [/daughter|కూతురు/, 'Daughter'],
  [/brother|anna\b|tammudu|అన్న|తమ్ముడు/, 'Brother'],
  [/sister|akka|chelli|అక్క|చెల్లి/, 'Sister'],
  [/uncle|babai|బాబాయి/, 'Uncle'],
  [/aunt|pinni|పిన్ని/, 'Aunt'],
];

const CATEGORIES: Array<[RegExp, EventCategory]> = [
  [/death anniversary|shraddh|sraddh|shradh|abdikam|taddinam|tithi of passing|ఆబ్దికం|తద్దినం|ఆబ్దీకం|వర్ధంతి|vardhanti|punya ?tithi|passed away/, 'death'],
  [/wedding|marriage|పెళ్లి ?రోజు|వివాహ/, 'marriage'],
  [/engagement|nischitartham|నిశ్చితార్థం/, 'engagement'],
  [/birthday|janma ?(thithi|tithi|dinam)|పుట్టిన ?రోజు|జన్మదినం/, 'birthday'],
  [/naming|namakaran|నామకరణం/, 'naming'],
  [/house ?warming|gruha ?pravesh|griha ?pravesh|గృహప్రవేశం/, 'housewarming'],
];

const ACTIVITIES: Array<[RegExp, Activity]> = [
  [/house ?warming|gr[iu]ha ?pravesh|గృహప్రవేశం/, 'housewarming'],
  [/marriage|wedding|వివాహం|పెళ్లి/, 'marriage'],
  [/naming|namakaran|నామకరణం/, 'naming'],
  [/\b(car|bike|vehicle|scooter)\b|వాహనం/, 'vehicle'],
  [/travel|journey|trip|flight|ప్రయాణం/, 'travel'],
  [/property|house|home|land|plot|flat|apartment|register|registration|ఇల్లు|స్థలం/, 'property'],
  [/business|shop|store|company|venture|project|startup|start|open|వ్యాపారం/, 'business'],
];

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fifteen: 15, a: 1 };
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function findRelation(q: string): string | undefined {
  return RELATIONS.find(([re]) => re.test(q))?.[1];
}
export function findCategory(q: string): EventCategory | undefined {
  return CATEGORIES.find(([re]) => re.test(q))?.[1];
}
function findActivity(q: string): Activity | undefined {
  return ACTIVITIES.find(([re]) => re.test(q))?.[1];
}

/** Explicit calendar date in the text, if any. */
export function findExplicitDate(q: string, today: CivilDate): CivilDate | undefined {
  const iso = q.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return civil(+iso[1], +iso[2], +iso[3]);
  const dmy = q.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
  if (dmy) return civil(+dmy[3], +dmy[2], +dmy[1]);
  const mon = `(${MONTHS.join('|')})[a-z]*`;
  const a = q.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${mon},?\\s*(\\d{4})?`));
  const b = q.match(new RegExp(`\\b${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})?`));
  const t = parseCivil(today);
  if (a) return civil(a[3] ? +a[3] : t.y, MONTHS.indexOf(a[2].slice(0, 3)) + 1, +a[1]);
  if (b) return civil(b[3] ? +b[3] : t.y, MONTHS.indexOf(b[1].slice(0, 3)) + 1, +b[2]);
  return undefined;
}

export function findDay(q: string, today: CivilDate): CivilDate | undefined {
  if (/day after tomorrow|ఎల్లుండి/.test(q)) return addDays(today, 2);
  if (/tomorrow|రేపు/.test(q)) return addDays(today, 1);
  if (/yesterday|నిన్న/.test(q)) return addDays(today, -1);
  if (/today|tonight|now|ఈ ?రోజు|ఇవాళ/.test(q)) return today;
  const wd = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(q));
  if (wd >= 0) {
    const diff = (wd - weekdayOf(today) + 7) % 7 || 7;
    return addDays(today, diff);
  }
  return findExplicitDate(q, today);
}

function findRange(q: string, today: CivilDate): { from: CivilDate; to: CivilDate } | undefined {
  const n = q.match(/next (\d+|\w+) days/);
  if (n) {
    const days = /^\d+$/.test(n[1]) ? +n[1] : NUM[n[1]] ?? 7;
    return { from: today, to: addDays(today, days) };
  }
  if (/next week|వచ్చే వారం/.test(q)) return { from: addDays(today, 1), to: addDays(today, 7) };
  if (/this week|ఈ వారం/.test(q)) return { from: today, to: addDays(today, 6 - weekdayOf(today)) };
  const t = parseCivil(today);
  if (/next month|వచ్చే నెల/.test(q)) return { from: civil(t.y, t.m + 1, 1), to: civil(t.y, t.m + 2, 0) };
  if (/this month|ఈ నెల/.test(q)) return { from: today, to: civil(t.y, t.m + 1, 0) };
  return undefined;
}

function parseReminders(q: string): EventDraft['reminders'] {
  const out: EventDraft['reminders'] = [];
  const time = (s: string | undefined) => {
    if (!s) return undefined;
    const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (!m) return undefined;
    let h = +m[1];
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
  };
  const re = /(?:(\d+|one|two|three|four|five|six|seven|ten|fifteen|a)\s+(days?|weeks?)\s+before|on the day|that day|same day)(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/g;
  for (const m of q.matchAll(re)) {
    let days = 0;
    if (m[1]) {
      const n = /^\d+$/.test(m[1]) ? +m[1] : NUM[m[1]];
      days = m[2].startsWith('week') ? n * 7 : n;
    }
    out.push({ daysBefore: days, time: time(m[3]) });
  }
  return out;
}

export function parse(raw: string, today: CivilDate): Intent {
  const q = raw.toLowerCase().replace(/[’`]/g, "'").trim();
  const category = findCategory(q);
  const relation = findRelation(q);

  if (/\b(remember|add|save|create|track|set up|setup)\b|remind me (about|of|every)|గుర్తు/.test(q) && (category || /anniversary|event/.test(q))) {
    let recurrence: Recurrence | undefined;
    if (/telugu|hindu|lunar|thithi|tithi|panchang|తెలుగు|తిథి/.test(q)) recurrence = 'thithi';
    else if (/english|gregorian|same date|calendar date/.test(q)) recurrence = 'gregorian';
    const self = /\bmy (wedding|marriage|engagement)\b|\bour\b/.test(q);
    return {
      kind: 'add-event',
      draft: {
        category: category ?? 'custom',
        relationship: relation ?? (self ? 'Self' : undefined),
        recurrence,
        originalDate: findExplicitDate(q, today),
        reminders: parseReminders(q),
      },
    };
  }

  if (/\bwhy\b/.test(q) && /different|change|moved?|shift|not (on )?the same|every year/.test(q)) return { kind: 'why-different' };

  if ((relation || category) && /when|which day|date|perform|this year|next|should i/.test(q) && !findActivity(q.replace(/house ?warming anniversary/, ''))) {
    return { kind: 'family-event', relation, category, text: q };
  }

  if (/(family )?events?|birthdays|anniversar|occasions/.test(q) && /coming|upcoming|next|this month|soon/.test(q)) {
    const range = findRange(q, today);
    const days = range ? Math.max(1, Math.round((Date.parse(range.to) - Date.parse(today)) / 86400000)) : 30;
    return { kind: 'upcoming-events', days };
  }

  if (/festival|observance|ekadashi|purnima|amavasya|pradosh|sankashti|పండుగ/.test(q) && /coming|upcoming|next|when|this month|list/.test(q)) {
    const range = findRange(q, today) ?? { from: today, to: addDays(today, 30) };
    return { kind: 'observances', ...range };
  }

  const activity = findActivity(q);
  const range = findRange(q, today);
  if (activity && (range || /best|which day|when (should|can)|good day|good date|find/.test(q)) && !findDay(q, today)) {
    const r = range ?? { from: today, to: addDays(today, 14) };
    return { kind: 'best-muhurta', activity, ...r };
  }
  if (activity || /auspicious|muhurt|good (day|time)|suitable|shubh/.test(q)) {
    return { kind: 'suitability', activity: activity ?? 'general', date: findDay(q, today) ?? today };
  }

  if (/ritual|vrat|puja|pooja|what (should|to) (i )?(do|perform)|traditionally|observe/.test(q)) {
    return { kind: 'rituals', date: findDay(q, today) ?? today };
  }

  if (/panchang|thithi|tithi|nakshatra|nakshatram|star|yoga|karana|rahu|yama|gulika|sunrise|sunset|abhijit|paksha|lunar|month|తిథి|నక్షత్రం|పంచాంగం|రాహు/.test(q) || findDay(q, today)) {
    return { kind: 'panchang', date: findDay(q, today) ?? today };
  }
  return { kind: 'help' };
}
