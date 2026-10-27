import { observancesInRange } from '../src/engine/observances';
import { solarDate, solarMonthName } from '../src/engine/solar';
import { dayPanchang, type Place } from '../src/engine/panchang';
import { traditionForLang, traditionYear } from '../src/data/traditions';

const KOLKATA: Place = { name: 'Kolkata', lat: 22.5726, lon: 88.3639, tz: 'Asia/Kolkata' };
const BHUBANESWAR: Place = { name: 'Bhubaneswar', lat: 20.2961, lon: 85.8245, tz: 'Asia/Kolkata' };
const AHMEDABAD: Place = { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata' };
const AMRITSAR: Place = { name: 'Amritsar', lat: 31.634, lon: 74.8723, tz: 'Asia/Kolkata' };

const first = (id: string, from: string, to: string, place: Place, t: string) => observancesInRange(from, to, place, t).find((o) => o.id === id)?.date;

describe('Bengali and Odia solar months', () => {
  it('Poila Boishakh follows the Bengal rule (the day after the sankranti; two days after if past midnight)', () => {
    expect(first('poila-boishakh', '2026-04-01', '2026-04-30', KOLKATA, 'bn')).toBe('2026-04-15');
    // 2025: the Sun entered Mesha at about 3:30 am on 14 April, after midnight — so 15 April.
    expect(first('poila-boishakh', '2025-04-01', '2025-04-30', KOLKATA, 'bn')).toBe('2025-04-15');
  });

  it('Pana Sankranti follows the Odisha rule (the sankranti day, or the next if past midnight)', () => {
    expect(first('pana-sankranti', '2026-04-01', '2026-04-30', BHUBANESWAR, 'or')).toBe('2026-04-14');
    expect(first('pana-sankranti', '2025-04-01', '2025-04-30', BHUBANESWAR, 'or')).toBe('2025-04-14');
  });

  it('names the months and counts the Bangabda', () => {
    const sd = solarDate('2026-04-20', KOLKATA, 'bengali');
    expect(solarMonthName('bengali', sd.month, 'en')).toBe('Boishakh');
    expect(solarMonthName('bengali', sd.month, 'bn')).toBe('বৈশাখ');
    expect(solarMonthName('odia', 0, 'or')).toBe('ବୈଶାଖ');
    expect(traditionYear('2026-04-20', KOLKATA, 'bn', dayPanchang('2026-04-20', KOLKATA))).toEqual({ era: 'bangabda', n: 1433 });
  });

  it('keeps Durga Puja and Kali Puja in Bengal', () => {
    const ids = observancesInRange('2026-10-01', '2026-11-30', KOLKATA, 'bn').map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(['durga-shashthi', 'maha-ashtami', 'vijayadashami', 'kojagari-lakshmi', 'kali-puja', 'jagaddhatri-puja']));
  });
});

describe('Gujarati calendar', () => {
  it('counts the Vikram Samvat from the day after Diwali', () => {
    expect(traditionYear('2026-10-26', AHMEDABAD, 'gu', dayPanchang('2026-10-26', AHMEDABAD))).toEqual({ era: 'vikram', n: 2082 });
    const bestu = first('bestu-varas', '2026-10-01', '2026-11-30', AHMEDABAD, 'gu')!;
    expect(traditionYear(bestu, AHMEDABAD, 'gu', dayPanchang(bestu, AHMEDABAD))).toEqual({ era: 'vikram', n: 2083 });
    expect(bestu > first('deepavali', '2026-10-01', '2026-11-30', AHMEDABAD, 'gu')!).toBe(true);
  });
});

describe('North India regional festivals', () => {
  it('Lohri is the eve of Makara Sankranti and Vaisakhi the Mesha sankranti day', () => {
    expect(first('lohri', '2026-01-01', '2026-01-31', AMRITSAR, 'north')).toBe('2026-01-13');
    expect(first('vaisakhi', '2026-04-01', '2026-04-30', AMRITSAR, 'north')).toBe('2026-04-14');
    expect(first('vaisakhi', '2025-04-01', '2025-04-30', AMRITSAR, 'north')).toBe('2025-04-13');
    expect(first('bhogi', '2026-01-01', '2026-01-31', AMRITSAR, 'north')).toBeUndefined();
  });

  it('maps each new language to its calendar', () => {
    expect(['bn', 'or', 'gu', 'pa', 'raj', 'bho'].map((l) => traditionForLang(l as never, 'te'))).toEqual(['bn', 'or', 'gu', 'north', 'north', 'north']);
  });
});
