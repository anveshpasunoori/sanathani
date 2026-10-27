import { birthChart, nakshatraLord, SIGN_LORD } from '../src/engine/jyotish';
import { cardDetails } from '../src/engine/profileCard';
import { zonedToUtc } from '../src/engine/tz';
import { HYD } from './fixtures';

const chartAt = (y: number, m: number, d: number, h: number, timeKnown = true) =>
  birthChart({ instant: zonedToUtc(y, m, d, h, 0, HYD.tz), lat: HYD.lat, lon: HYD.lon, timeKnown });

describe('Jathaka card details', () => {
  it('matches the chart and highlights the naming syllable of the birth pada', () => {
    const c = chartAt(1990, 3, 12, 9);
    const d = cardDetails(c);
    expect(d.nakshatra.pada).toBe(c.moon.pada);
    expect(d.syllables.en).toHaveLength(4);
    expect(d.syllables.te).toHaveLength(4);
    expect(d.syllables.mine).toBe(c.moon.pada - 1);
  });

  it('classic examples: Ashwini → Chu Che Cho La; Revati → De Do Cha Chi; Krittika is Rakshasa gana, Agni', () => {
    const fake = (nak: number) => {
      const c = chartAt(2000, 1, 1, 12);
      const lon = nak * (360 / 27) + 1;
      return cardDetails({ ...c, moon: { ...c.moon, lon, nakshatra: nak, rashi: Math.floor(lon / 30), pada: 1 } });
    };
    expect(fake(0).syllables.en).toEqual(['Chu', 'Che', 'Cho', 'La']);
    expect(fake(26).syllables.en).toEqual(['De', 'Do', 'Cha', 'Chi']);
    expect(fake(2)).toMatchObject({ gana: 'Rakshasa', deity: 'Agni', yoni: 'Sheep' });
    expect(fake(21).deity).toBe('Vishnu');
  });

  it('lucky day, numbers and colour follow the Moon-sign lord (and star lord for numbers)', () => {
    const NUM: Record<string, number> = { sun: 1, moon: 2, jupiter: 3, rahu: 4, mercury: 5, venus: 6, ketu: 7, saturn: 8, mars: 9 };
    const DAY: Record<string, string> = { sun: 'Sunday', moon: 'Monday', mars: 'Tuesday', mercury: 'Wednesday', jupiter: 'Thursday', venus: 'Friday', saturn: 'Saturday' };
    for (let i = 0; i < 60; i++) {
      const c = chartAt(1960 + i, 1 + (i % 12), 1 + (i % 27), 6 + (i % 12));
      const d = cardDetails(c);
      const lord = SIGN_LORD[c.moon.rashi];
      expect(d.lucky.day.en).toBe(DAY[lord]);
      expect(d.lucky.numbers[0]).toBe(NUM[lord]);
      expect(d.lucky.numbers).toContain(NUM[nakshatraLord(c.moon.nakshatra)]);
      expect(d.lucky.colour.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('omits Lagna without a birth time', () => {
    expect(cardDetails(chartAt(1990, 3, 12, 9, false)).lagna).toBeUndefined();
  });
});
