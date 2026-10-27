import { ashtakavarga, chartReading, dignityOf, saturnPhases } from '../src/engine/chartReading';
import { birthChart } from '../src/engine/jyotish';
import { zonedToUtc } from '../src/engine/tz';

const GUNTUR = { lat: 16.3067, lon: 80.4365 };
const chart = birthChart({ instant: zonedToUtc(1985, 8, 15, 6, 30, 'Asia/Kolkata'), ...GUNTUR, timeKnown: true });
const noTime = birthChart({ instant: zonedToUtc(1985, 8, 15, 12, 0, 'Asia/Kolkata'), ...GUNTUR, timeKnown: false });

describe('birth chart reading', () => {
  it('knows the classical dignities', () => {
    expect(dignityOf('sun', 0)).toBe('exalted');
    expect(dignityOf('sun', 6)).toBe('debilitated');
    expect(dignityOf('moon', 1)).toBe('exalted');
    expect(dignityOf('jupiter', 8)).toBe('moolatrikona');
    expect(dignityOf('saturn', 9)).toBe('own');
    expect(dignityOf('mars', 2)).toBe('enemy');
    expect(dignityOf('rahu', 3)).toBeNull();
  });

  it('builds the Ashtakavarga: every planet\'s table adds up as in Parashara, 337 in all', () => {
    const av = ashtakavarga(chart)!;
    const totals = Object.fromEntries(Object.entries(av.bav).map(([g, row]) => [g, row.reduce((a, b) => a + b, 0)]));
    expect(totals).toEqual({ sun: 48, moon: 49, mars: 39, mercury: 54, jupiter: 56, venus: 52, saturn: 39 });
    expect(av.sav.reduce((a, b) => a + b, 0)).toBe(337);
    expect(ashtakavarga(noTime)).toBeNull();
  });

  it('reads every planet and all twelve houses, in English and Telugu', () => {
    const r = chartReading(chart, new Date('2026-10-27T00:00:00Z'));
    expect(r.fromLagna).toBe(true);
    expect(r.planets).toHaveLength(9);
    expect(r.houses).toHaveLength(12);
    expect(r.houses.every((h) => h.bindus! > 0 && h.text.length > 40)).toBe(true);
    expect(r.nature).toHaveLength(3);
    const te = chartReading(chart, new Date('2026-10-27T00:00:00Z'), 'te');
    expect(te.houses[9].text).toMatch(/[ఀ-౿]/);
    // On 15 Aug the sidereal Sun is still in Karka (it enters Simha around the 17th): the Moon's sign, a friend.
    const sun = r.planets.find((p) => p.graha === 'sun')!;
    expect([sun.rashi, sun.dignity]).toEqual([3, 'friend']);
  });

  it('reads the chart in each translated language, and in English for the rest', () => {
    const now = new Date('2026-10-27T00:00:00Z');
    const scripts: Array<['kn' | 'ta' | 'ml' | 'hi' | 'mr', RegExp]> = [['kn', /[ಀ-೿]/], ['ta', /[஀-௿]/], ['ml', /[ഀ-ൿ]/], ['hi', /[ऀ-ॿ]/], ['mr', /[ऀ-ॿ]/]];
    for (const [lang, script] of scripts) {
      const r = chartReading(chart, now, lang);
      const texts = [...r.nature.map((n) => n.text), ...r.planets.map((p) => p.text), ...r.houses.map((h) => h.text), ...r.yogas.map((y) => y.text)];
      expect(texts.every((t) => script.test(t) && !/[{}]|undefined/.test(t))).toBe(true);
    }
    expect(chartReading(chart, now, 'gu').houses[0].text).toMatch(/^Your 1st house/);
  });

  it('reads from the Moon sign when the birth time is unknown', () => {
    const r = chartReading(noTime, new Date('2026-10-27T00:00:00Z'));
    expect(r.fromLagna).toBe(false);
    expect(r.houses[0].rashi).toBe(noTime.moon.rashi);
    expect(r.nature).toHaveLength(2);
  });

  it('finds Saturn\'s phases with sensible lengths', () => {
    const phases = saturnPhases(chart, new Date('1990-01-01'), new Date('2060-01-01'));
    const sade = phases.filter((p) => p.kind === 'sadesati');
    expect(sade.length).toBeGreaterThanOrEqual(2);
    for (const p of sade) {
      const years = (p.end.getTime() - p.start.getTime()) / (365.25 * 86400000);
      expect(years).toBeGreaterThan(6.5);
      expect(years).toBeLessThan(8.5);
    }
  });
});
