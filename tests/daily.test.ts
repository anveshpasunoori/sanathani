import { DEFAULT_SETTINGS } from '../src/data/store';
import { makaraJyothi, nextPeriod, progress, MANTRAS, PRACTICES } from '../src/data/sadhana';
import { planMorning } from '../src/reminders/morning';
import { DAILY_TEXT } from '../src/locales/daily';
import { HYD } from './fixtures';

describe('deekshas and sacred months', () => {
  it('counts the Ayyappa Mandala as 41 days from the day the mala is worn', () => {
    const p = progress('mandala', '2026-11-17', '2026-11-27', HYD, 'te');
    expect(p).toMatchObject({ day: 11, total: 41, end: '2026-12-27', done: false });
    expect(progress('mandala', '2026-11-17', '2026-12-28', HYD, 'te').done).toBe(true);
  });
  it('finds Makara Jyothi in mid-January', () => {
    const d = makaraJyothi('2026-11-20', HYD)!;
    expect(d >= '2027-01-13' && d <= '2027-01-16').toBe(true);
  });
  it('finds Karthika Masam after Deepavali, Dhanurmasam in mid-December and Navaratri in autumn', () => {
    const k = nextPeriod('karthika', '2026-11-01', HYD, 'te')!;
    expect(k.start >= '2026-11-08' && k.start <= '2026-11-12').toBe(true);
    expect(k.end > k.start).toBe(true);
    const d = nextPeriod('dhanurmasam', '2026-11-01', HYD, 'te')!;
    expect(d.start >= '2026-12-14' && d.start <= '2026-12-17').toBe(true);
    const n = nextPeriod('navaratri', '2026-11-01', HYD, 'te')!;
    expect(n.start >= '2027-09-25' && n.start <= '2027-10-12').toBe(true);
    expect(progress('navaratri', n.start, n.start, HYD, 'te').total).toBe(9);
  });
  it('has the words for every practice and mantra', () => {
    for (const lang of Object.keys(DAILY_TEXT) as Array<keyof typeof DAILY_TEXT>) {
      for (const [kind, n] of Object.entries(PRACTICES)) {
        const prefix = { mandala: 'm', karthika: 'k', dhanurmasam: 'd', navaratri: 'n' }[kind as 'mandala'];
        for (let i = 1; i <= n; i++) expect(DAILY_TEXT[lang][`${prefix}${i}` as 'm1'], `${lang} ${prefix}${i}`).toBeTruthy();
      }
    }
    expect(MANTRAS.every((m) => m.te && m.en)).toBe(true);
  });
});

describe('morning message', () => {
  const settings = { ...DEFAULT_SETTINGS, place: HYD, morning: { on: true, time: '06:30' } };
  it('plans one message a day for a week, with the thithi and Rahu Kalam', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    const m = planMorning({ settings, events: [] }, '2026-11-01', now);
    expect(m).toHaveLength(7);
    expect(new Set(m.map((x) => x.key)).size).toBe(7);
    expect(m[0].body).toContain('Rahu Kalam');
    expect(m[0].title).toMatch(/·/);
  });
  it('sends nothing when it is turned off, and skips a time already past today', () => {
    expect(planMorning({ settings: { ...settings, morning: { on: false, time: '06:30' } }, events: [] }, '2026-11-01', new Date('2026-11-01T00:00:00Z'))).toEqual([]);
    expect(planMorning({ settings, events: [] }, '2026-11-01', new Date('2026-11-01T12:00:00Z'))).toHaveLength(6);
  });
  it('is written in the reader\'s language', () => {
    const m = planMorning({ settings: { ...settings, lang: 'te' }, events: [] }, '2026-11-01', new Date('2026-11-01T00:00:00Z'));
    expect(m[0].body).toContain('రాహుకాలం');
  });
});
