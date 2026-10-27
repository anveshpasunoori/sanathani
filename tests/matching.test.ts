import { birthChart, type BirthChart } from '../src/engine/jyotish';
import { kujaDosha, matchCharts, NAK_YONI, nadiOf, relation, YONI_TABLE } from '../src/engine/matching';
import { zonedToUtc } from '../src/engine/tz';
import { HYD } from './fixtures';

/** Minimal chart with the Moon at a given sidereal longitude (and Mars where we want it). */
function fake(moonLon: number, marsRashi = 2, lagnaRashi?: number): BirthChart {
  const pt = (lon: number) => ({ lon, rashi: Math.floor(lon / 30), degInSign: lon % 30, nakshatra: Math.floor(lon / (360 / 27)), pada: Math.floor((lon % (360 / 27)) / (360 / 108)) + 1, navamsa: 0 });
  const moon = { ...pt(moonLon), graha: 'moon' as const, retro: false };
  const mars = { ...pt(marsRashi * 30 + 10), graha: 'mars' as const, retro: false };
  return { instant: new Date(0), timeKnown: lagnaRashi !== undefined, ayanamsa: 24, lagna: lagnaRashi !== undefined ? pt(lagnaRashi * 30 + 5) : undefined, grahas: [moon, mars], moon };
}
const NAK = 360 / 27;

describe('Ashtakoota tables', () => {
  it('Yoni table is symmetric with the seven bitter-enemy pairs at 0', () => {
    for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) expect(YONI_TABLE[i][j]).toBe(YONI_TABLE[j][i]);
    const zeros = YONI_TABLE.flatMap((r, i) => r.map((v, j) => (v === 0 && i < j ? `${i}-${j}` : ''))).filter(Boolean);
    expect(zeros.sort()).toEqual(['0-8', '1-13', '2-11', '3-12', '4-10', '5-6', '7-9'].sort());
    expect(YONI_TABLE.every((r, i) => r[i] === 4)).toBe(true);
  });
  it('every yoni animal has one male and one female nakshatra (two for some)', () => {
    const counts = new Map<number, number>();
    NAK_YONI.forEach((y) => counts.set(y, (counts.get(y) ?? 0) + 1));
    expect(counts.size).toBe(14);
  });
  it('Nadi follows the classical Adi/Madhya/Antya sequence', () => {
    expect([0, 5, 6, 11, 12, 17, 18, 23, 24].every((n) => nadiOf(n) === 0)).toBe(true); // Adi
    expect([1, 4, 7, 10, 13, 16, 19, 22, 25].every((n) => nadiOf(n) === 1)).toBe(true); // Madhya
    expect([2, 3, 8, 9, 14, 15, 20, 21, 26].every((n) => nadiOf(n) === 2)).toBe(true); // Antya
  });
  it('planetary friendships follow the natural (naisargika) table', () => {
    expect(relation('sun', 'jupiter')).toBe('friend');
    expect(relation('mercury', 'moon')).toBe('enemy');
    expect(relation('moon', 'mercury')).toBe('friend');
    expect(relation('saturn', 'jupiter')).toBe('neutral');
  });
});

describe('matchCharts', () => {
  it('same star and sign scores the well-known 28 with Nadi dosha', () => {
    const r = matchCharts(fake(NAK * 0.5), fake(NAK * 0.5));
    expect(r.total).toBe(28);
    expect(r.kootas.find((k) => k.key === 'nadi')).toMatchObject({ score: 0, cancelled: undefined });
    expect(r.kootas.reduce((s, k) => s + k.max, 0)).toBe(36);
  });

  it('cancels Nadi dosha for the same sign with different stars', () => {
    // Search all pada pairs for one in the same sign, different stars, same Nadi.
    let found = false;
    for (let a = 0; a < 108 && !found; a++) for (let b = 0; b < 108 && !found; b++) {
      const la = a * (NAK / 4) + 0.1, lb = b * (NAK / 4) + 0.1;
      const ca = fake(la), cb = fake(lb);
      if (ca.moon.rashi === cb.moon.rashi && ca.moon.nakshatra !== cb.moon.nakshatra && nadiOf(ca.moon.nakshatra) === nadiOf(cb.moon.nakshatra)) {
        const nadi = matchCharts(ca, cb).kootas.find((k) => k.key === 'nadi')!;
        expect(nadi.score).toBe(0);
        expect(nadi.cancelled).toMatch(/Same Moon sign/);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('flags 6/8 Bhakoot and cancels it when the sign lords are friends', () => {
    // Bride Mesha (Mars), groom Kanya (6th; Mercury): Mars–Mercury are not mutual friends → dosha stands.
    const r1 = matchCharts(fake(5), fake(155));
    expect(r1.kootas.find((k) => k.key === 'bhakoot')).toMatchObject({ score: 0, cancelled: undefined });
    // Bride Mesha (Mars), groom Vrischika (8th; Mars): same lord → cancelled.
    const r2 = matchCharts(fake(5), fake(215));
    expect(r2.kootas.find((k) => k.key === 'bhakoot')!.cancelled).toMatch(/same or friends/);
  });

  it('scores stay within each koota maximum for every star pair', () => {
    for (let a = 0; a < 27; a++) for (let b = 0; b < 27; b++) {
      const r = matchCharts(fake(a * NAK + 1), fake(b * NAK + 1));
      for (const k of r.kootas) { expect(k.score).toBeGreaterThanOrEqual(0); expect(k.score).toBeLessThanOrEqual(k.max); }
      expect(r.adjusted).toBeGreaterThanOrEqual(r.total);
    }
  });

  it('works on real charts', () => {
    const c1 = birthChart({ instant: zonedToUtc(1990, 3, 12, 9, 15, HYD.tz), lat: HYD.lat, lon: HYD.lon, timeKnown: true });
    const c2 = birthChart({ instant: zonedToUtc(1987, 11, 2, 18, 40, HYD.tz), lat: HYD.lat, lon: HYD.lon, timeKnown: true });
    const r = matchCharts(c1, c2);
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(36);
  });
});

describe('Kuja dosha', () => {
  it('Mars in the 7th from Lagna is dosha', () => {
    expect(kujaDosha(fake(100, 6, 0)).present).toBe(true); // Lagna Mesha, Mars Tula
  });
  it('is set aside when Mars is in its own sign or exalted', () => {
    const k = kujaDosha(fake(100, 9, 3)); // Lagna Karka, Mars Makara (7th, exalted)
    expect(k.present).toBe(false);
    expect(k.exception).toMatch(/exalted/);
  });
  it('falls back to the Moon when the birth time is unknown', () => {
    const k = kujaDosha(fake(5, 3)); // Moon Mesha, Mars Karka → 4th from Moon
    expect(k.fromLagna).toBeUndefined();
    expect(k.present).toBe(true);
    expect(k.basis).toMatch(/from the Moon/);
  });
  it('balances when both charts have it', () => {
    const r = matchCharts(fake(100, 6, 0), fake(200, 6, 0));
    expect(r.kuja.note).toMatch(/balanced/);
  });
});

describe('matching in each translated language', () => {
  it('koota details, cancellations and Kuja notes are worded in the reader\'s script', () => {
    const scripts = [['te', /[ఀ-౿]/], ['kn', /[ಀ-೿]/], ['ta', /[஀-௿]/], ['ml', /[ഀ-ൿ]/], ['hi', /[ऀ-ॿ]/], ['mr', /[ऀ-ॿ]/]] as const;
    const pairs = [[fake(5), fake(155)], [fake(5), fake(215)], [fake(100, 6, 0), fake(200, 6, 0)], [fake(100, 9, 3), fake(5, 3)]];
    for (const [lang, script] of scripts) {
      for (const [a, b] of pairs) {
        const r = matchCharts(a, b, lang);
        const texts = [...r.kootas.flatMap((k) => [k.about, k.detail, k.cancelled ?? '']), r.kuja.note, r.kuja.bride.basis, r.kuja.groom.basis, r.kuja.bride.exception ?? '', r.kuja.groom.exception ?? ''];
        expect(texts.filter(Boolean).every((t) => script.test(t) && !/[{}]|undefined/.test(t))).toBe(true);
      }
    }
    expect(matchCharts(fake(5), fake(155), 'gu').kootas[0].about).toBe('Temperament and spiritual outlook');
  });
});
