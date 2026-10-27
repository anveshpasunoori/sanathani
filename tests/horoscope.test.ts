import { sunTropical } from '../src/engine/astro';
import { chandrashtamaPeriods, dailyReading, dashaReading, goodDays, taraOf, transits } from '../src/engine/horoscope';
import {
  ascendantTropical, birthChart, DASHA_YEARS, dashaAt, grahaSidereal, nakshatraOf, navamsaOf, nextSignChange, padaOf, vimshottari,
} from '../src/engine/jyotish';
import { RASHI_EN } from '../src/engine/names';
import { dayPanchang, nakshatraIndexAt, sunTimes } from '../src/engine/panchang';
import { addDays, zonedToUtc } from '../src/engine/tz';
import { HYD, NJ, VIJ } from './fixtures';

const DAY = 86400000;
const near = (a: Date | undefined, iso: string, hours: number) => expect(Math.abs(a!.getTime() - Date.parse(iso)) / 3600000).toBeLessThan(hours);

describe('graha positions agree with published sidereal transit dates', () => {
  it.each([
    ['jupiter', '2025-05-01', 'Mithuna', '2025-05-14T17:00:00Z'],
    ['jupiter', '2025-10-01', 'Karka', '2025-10-18T16:00:00Z'],
    ['saturn', '2025-03-01', 'Meena', '2025-03-29T16:15:00Z'],
    ['rahu', '2025-05-01', 'Kumbha', '2025-05-18T11:00:00Z'],
  ] as const)('%s enters %s', (g, from, sign, when) => {
    const c = nextSignChange(g, new Date(from), 400);
    expect(RASHI_EN[c!.rashi]).toBe(sign);
    near(c?.date, when, g === 'saturn' ? 6 : 12);
  });

  it('Rahu and Ketu are always opposite', () => {
    const d = new Date('2026-01-01');
    expect(Math.abs(((grahaSidereal('ketu', d) - grahaSidereal('rahu', d) + 360) % 360) - 180)).toBeLessThan(1e-9);
  });
});

describe('Lagna', () => {
  it('equals the Sun\'s degree at sunrise (Sun is on the eastern horizon)', () => {
    for (const [place, date] of [[HYD, '2025-06-01'], [VIJ, '2025-12-21'], [NJ, '2026-03-20']] as const) {
      const sr = sunTimes(date, place).sunrise;
      const diff = Math.abs(((ascendantTropical(sr, place.lat, place.lon) - sunTropical(sr) + 540) % 360) - 180);
      expect(diff).toBeLessThan(2); // sunrise is defined by the upper limb with refraction
    }
  });

  it('moves through all 12 signs in a sidereal day', () => {
    const start = zonedToUtc(2025, 1, 1, 0, 0, HYD.tz);
    const signs = new Set<number>();
    for (let m = 0; m < 24 * 60; m += 20) signs.add(Math.floor(birthChart({ instant: new Date(start.getTime() + m * 60000), lat: HYD.lat, lon: HYD.lon, timeKnown: true }).lagna!.rashi));
    expect(signs.size).toBe(12);
  });
});

describe('birth chart', () => {
  const instant = zonedToUtc(1985, 8, 15, 6, 30, HYD.tz);
  const chart = birthChart({ instant, lat: HYD.lat, lon: HYD.lon, timeKnown: true });

  it('Janma Nakshatra matches the Panchangam engine', () => {
    expect(chart.moon.nakshatra).toBe(nakshatraIndexAt(instant));
  });
  it('houses are whole-sign from Lagna', () => {
    for (const g of chart.grahas) expect(g.house).toBe(((g.rashi - chart.lagna!.rashi + 12) % 12) + 1);
  });
  it('omits Lagna when time is unknown', () => {
    expect(birthChart({ instant, lat: HYD.lat, lon: HYD.lon, timeKnown: false }).lagna).toBeUndefined();
  });
  it('pada and navamsa follow the 3°20′ division', () => {
    expect(padaOf(0)).toBe(1); expect(padaOf(3.4)).toBe(2); expect(padaOf(13.3)).toBe(4); expect(padaOf(13.34)).toBe(1);
    expect(navamsaOf(0)).toBe(0); expect(navamsaOf(30)).toBe(9); expect(navamsaOf(60)).toBe(6); expect(navamsaOf(359.9)).toBe(11);
    expect(nakshatraOf(359.9)).toBe(26);
  });
});

describe('Vimshottari dasha', () => {
  it('starts with the birth-star lord, balance proportional to the nakshatra remaining', () => {
    const birth = new Date('2000-01-01T00:00:00Z');
    const moonLon = 0 + (360 / 27) * 0.25; // a quarter into Ashwini → Ketu, 3/4 of 7 years left
    const p = vimshottari(birth, moonLon);
    expect(p[0].lord).toBe('ketu');
    expect((p[0].end.getTime() - birth.getTime()) / (365.25 * DAY)).toBeCloseTo(5.25, 6);
    expect(p.map((x) => x.lord)).toEqual(['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury']);
    expect((p[8].end.getTime() - p[0].start.getTime()) / (365.25 * DAY)).toBeCloseTo(120, 6);
  });
  it('antardashas fill each maha dasha exactly, starting with its own lord', () => {
    const p = vimshottari(new Date('1990-05-05T00:00:00Z'), 123.4);
    for (const m of p) {
      expect(m.antar[0].lord).toBe(m.lord);
      expect(m.antar[8].end.getTime()).toBeCloseTo(m.end.getTime(), -1);
      expect((m.end.getTime() - m.start.getTime()) / (365.25 * DAY)).toBeCloseTo(DASHA_YEARS[m.lord], 6);
    }
    const now = dashaAt(p, new Date('2026-10-24'));
    expect(now?.antar.start.getTime()).toBeLessThanOrEqual(Date.parse('2026-10-24'));
  });
});

describe('readings', () => {
  const chart = birthChart({ instant: zonedToUtc(1985, 8, 15, 6, 30, HYD.tz), lat: HYD.lat, lon: HYD.lon, timeKnown: true });

  it('tara bala cycles every 9 nakshatras', () => {
    expect(taraOf(5, 5).number).toBe(1);
    expect(taraOf(5, 6).number).toBe(2);
    expect(taraOf(5, 14).number).toBe(1);
    expect(taraOf(26, 0).number).toBe(2);
    expect(taraOf(0, 8).name.en).toBe('Parama Mitra Tara');
  });

  it('daily reading uses the day\'s sunrise nakshatra and flags Chandrashtama', () => {
    for (let i = 0; i < 30; i++) {
      const d = addDays('2026-10-24', i);
      const r = dailyReading(chart, d, HYD);
      expect(r.tara.number).toBe(taraOf(chart.moon.nakshatra, dayPanchang(d, HYD).nakshatras[0].index).number);
      expect(r.chandrashtama).toBe(r.moonHouse === 8);
      if (r.chandrashtama) expect(r.tone).toBe('gentle');
      expect(r.insights.length).toBeGreaterThan(0);
    }
  });

  it('daily reading, transits and dasha are written in each translated language', () => {
    const scripts = [['kn', /[ಀ-೿]/], ['ta', /[஀-௿]/], ['ml', /[ഀ-ൿ]/], ['hi', /[ऀ-ॿ]/], ['mr', /[ऀ-ॿ]/]] as const;
    const at = new Date('2026-10-27T00:00:00Z');
    for (const [lang, script] of scripts) {
      const texts: string[] = [];
      for (let i = 0; i < 12; i++) {
        const r = dailyReading(chart, addDays('2026-10-24', i * 3), HYD, lang);
        texts.push(...r.insights.flatMap((n) => [n.title, n.text, n.tip ?? '']));
      }
      texts.push(...transits(chart, at, lang).flatMap((t) => [t.text, t.tip ?? '', t.special ?? '']));
      const d = dashaReading(chart, at, lang)!;
      texts.push(d.text, d.tip);
      expect(texts.filter(Boolean).every((t) => script.test(t) && !/[{}]|undefined/.test(t))).toBe(true);
    }
    expect(dashaReading(chart, at, 'gu')!.text).toMatch(/^The .* maha dasha supports/);
  });

  it('never uses alarming words', () => {
    const texts: string[] = [];
    for (let i = 0; i < 40; i++) texts.push(...dailyReading(chart, addDays('2026-10-01', i), HYD).insights.flatMap((x) => [x.title, x.text, x.tip ?? '']));
    texts.push(...transits(chart, new Date('2026-10-24')).flatMap((x) => [x.text, x.tip ?? '']), dashaReading(chart, new Date('2026-10-24'))!.text);
    expect(texts.join(' ')).not.toMatch(/\b(bad|danger|death|disaster|loss|accident|illness|misfortune|unlucky|evil)\b/i);
  });

  it('Chandrashtama periods are when the Moon is in the 8th sign', () => {
    const periods = chandrashtamaPeriods(chart, new Date('2026-10-24'), 60);
    expect(periods.length).toBeGreaterThanOrEqual(2);
    for (const p of periods) {
      const mid = new Date((p.start.getTime() + p.end.getTime()) / 2);
      expect(Math.floor(grahaSidereal('moon', mid) / 30)).toBe((chart.moon.rashi + 7) % 12);
      expect((p.end.getTime() - p.start.getTime()) / DAY).toBeGreaterThan(1.8);
      expect((p.end.getTime() - p.start.getTime()) / DAY).toBeLessThan(2.9);
    }
  });

  it('good days are favourable in both Chandra and Tara bala', () => {
    for (const d of goodDays(chart, '2026-10-24', 30, HYD)) expect(dailyReading(chart, d, HYD).tone).toBe('favourable');
  });

  it('Sade Sati is reported when Saturn is 12th/1st/2nd from the Moon sign', () => {
    const at = new Date('2026-10-24');
    const satRashi = Math.floor(grahaSidereal('saturn', at) / 30);
    const moonInMeena = { ...chart, moon: { ...chart.moon, rashi: satRashi } };
    expect(transits(moonInMeena, at).find((t) => t.graha === 'saturn')?.special).toMatch(/Sade Sati — phase 2/);
  });
});
