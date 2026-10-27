import { birthChart, type BirthChart } from '../src/engine/jyotish';
import { AREA_ORDER, areaLink, chartBasis, housesOf, lifeTimeline, periodsForArea, periodThemes } from '../src/engine/lifeThemes';
import { zonedToUtc } from '../src/engine/tz';
import { HYD } from './fixtures';

const chart = birthChart({ instant: zonedToUtc(1985, 8, 15, 6, 30, HYD.tz), lat: HYD.lat, lon: HYD.lon, timeKnown: true });

describe('chart basis', () => {
  const b = chartBasis(chart);
  it('counts whole-sign houses from Lagna', () => {
    expect(b.fromLagna).toBe(true);
    for (const g of chart.grahas) expect(b.placements[g.graha].occupies).toBe(g.house);
  });
  it('gives each of the seven planets its sign lordships (12 in total)', () => {
    const all = Object.values(b.placements).flatMap((p) => p.rules);
    expect(all.sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(b.placements.sun.rules).toHaveLength(1);
    expect(b.placements.moon.rules).toHaveLength(1);
    expect(b.placements.saturn.rules).toHaveLength(2);
  });
  it('Rahu and Ketu act through their sign lord', () => {
    expect(b.placements.rahu.rules).toEqual([]);
    expect(b.placements.rahu.dispositor).toBeDefined();
    const d = b.placements[b.placements.rahu.dispositor!];
    expect(housesOf(b, 'rahu')).toEqual(expect.arrayContaining([b.placements.rahu.occupies, d.occupies, ...d.rules]));
  });
  it('falls back to the Moon sign when the birth time is unknown', () => {
    const noTime = birthChart({ instant: chart.instant, lat: HYD.lat, lon: HYD.lon, timeKnown: false });
    const nb = chartBasis(noTime);
    expect(nb.fromLagna).toBe(false);
    expect(nb.placements.moon.occupies).toBe(1);
  });
});

describe('life areas', () => {
  const b = chartBasis(chart);
  it('the 7th lord links strongly to marriage', () => {
    const seventhLord = (Object.values(b.placements).find((p) => p.rules.includes(7)))!.graha;
    expect(areaLink(b, seventhLord, 'marriage').score).toBeGreaterThanOrEqual(2);
    expect(areaLink(b, seventhLord, 'marriage').why.some((w) => w.key === 'rules' && w.h === 7)).toBe(true);
  });

  it('periods for an area are real antardashas inside the window, each with reasons', () => {
    const from = new Date('2026-10-24');
    for (const area of AREA_ORDER) {
      const list = periodsForArea(chart, area, from, 40);
      for (const p of list) {
        expect(p.end.getTime()).toBeGreaterThan(from.getTime());
        expect(p.start.getTime()).toBeLessThan(from.getTime() + 40.01 * 365.25 * 86400000);
        expect(p.why.length).toBeGreaterThan(0);
        expect(p.score).toBeGreaterThanOrEqual(3);
      }
    }
    expect(AREA_ORDER.some((a) => periodsForArea(chart, a, from, 40).length > 0)).toBe(true);
  });

  it('timeline covers birth to age 100 and themes are worded positively', () => {
    const t = lifeTimeline(chart);
    expect(t[0].start.getTime()).toBeLessThanOrEqual(chart.instant.getTime());
    expect(t[t.length - 1].end.getTime()).toBeGreaterThan(chart.instant.getTime() + 99 * 365.25 * 86400000);
    const words = chart.grahas.flatMap((g) => { const th = periodThemes(b, g.graha); return [th.nature, ...th.areas]; }).join(' ');
    expect(words).not.toMatch(/\b(death|loss|disease|accident|divorce|bad|misfortune)\b/i);
  });

  it('works for any chart (fuzz over 200 births)', () => {
    for (let i = 0; i < 200; i++) {
      const c: BirthChart = birthChart({ instant: new Date(Date.UTC(1950, 0, 1) + i * 73.3 * 86400000 + i * 3600000), lat: HYD.lat, lon: HYD.lon, timeKnown: i % 3 !== 0 });
      const bb = chartBasis(c);
      for (const g of c.grahas) expect(housesOf(bb, g.graha).every((h) => h >= 1 && h <= 12)).toBe(true);
    }
  });
});

describe('life themes in each translated language', () => {
  it('reasons and period themes are worded in the reader\'s script', () => {
    const scripts = [['kn', /[ಀ-೿]/], ['ta', /[஀-௿]/], ['ml', /[ഀ-ൿ]/], ['hi', /[ऀ-ॿ]/], ['mr', /[ऀ-ॿ]/]] as const;
    const b = chartBasis(chart);
    for (const [lang, script] of scripts) {
      const why = AREA_ORDER.flatMap((a) => periodsForArea(chart, a, new Date('2026-10-24'), 30, lang).flatMap((p) => p.why));
      const t = periodThemes(b, 'jupiter', lang);
      const texts = [...why, ...t.areas, t.nature];
      expect(why.length).toBeGreaterThan(0);
      expect(texts.every((s) => script.test(s) && !/[{}]|undefined/.test(s))).toBe(true);
    }
  });
});
