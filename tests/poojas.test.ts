import { mandalaStart, POOJAS, poojaForTradition, shortSteps } from '../src/data/poojas';
import { NAMAVALIS } from '../src/data/ashtottarams';
import { DEITY_IMAGES } from '../src/data/deityImages';
import { existsSync } from 'node:fs';
import { dayPanchang } from '../src/engine/panchang';
import data from '../src/data/stotras.json';
import { observancesInRange } from '../src/engine/observances';
import { weekdayOf } from '../src/engine/tz';
import { HYD, NJ } from './fixtures';
import { STOTRA_LIST } from '../src/ui/Poojas';

describe('pooja dates', () => {
  it('every pooja has upcoming dates in India and the US', () => {
    for (const place of [HYD, NJ]) for (const p of POOJAS) {
      const d = p.next('2026-10-24', place);
      expect(d.length).toBeGreaterThan(0);
      for (const x of d) expect(x.date >= '2026-10-24').toBe(true);
    }
  });
  it('Ayyappa Mandala begins at Vrischika Sankranti (mid-November)', () => {
    const s = mandalaStart('2026-10-24', HYD)!;
    expect(s >= '2026-11-15' && s <= '2026-11-18').toBe(true);
    // Already inside the season → returns the current season's start.
    expect(mandalaStart('2026-12-01', HYD)).toBe(s);
  });
  it('Varalakshmi Vratam is the Friday before Shravana Purnima', () => {
    const v = POOJAS.find((p) => p.id === 'lakshmi')!.next('2027-01-01', HYD).find((x) => x.label === 'Varalakshmi Vratam')!;
    expect(weekdayOf(v.date)).toBe(5);
    const purnima = observancesInRange('2027-01-01', '2027-12-31', HYD).find((o) => o.id === 'raksha-bandhan')!.date;
    const gap = (Date.parse(purnima) - Date.parse(v.date)) / 86400000;
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThanOrEqual(7);
  });
  it('Ugadi pooja date matches the Ugadi festival', () => {
    expect(POOJAS.find((p) => p.id === 'ugadi')!.next('2026-10-24', HYD)[0].date).toBe('2027-04-07');
  });
});

describe('stotram texts', () => {
  const by = Object.fromEntries(data.stotras.map((s) => [s.id, s]));
  it('every listed or linked stotram exists', () => {
    for (const s of STOTRA_LIST) expect(by[s.id] ?? NAMAVALIS[s.id]).toBeDefined();
    for (const p of POOJAS) for (const id of p.stotras) expect(by[id] ?? NAMAVALIS[id]).toBeDefined();
  });
  it('Vishnu Sahasranamam has all 1000 names in order', () => {
    const names = (by['vishnu-sahasranamam'] as { names: Array<{ n: number }> }).names;
    expect(names.map((n) => n.n)).toEqual(Array.from({ length: 1000 }, (_, i) => i + 1));
    expect(names[0]).toMatchObject({ name: 'విశ్వం' });
  });
  it('Lalitha Sahasranamam has verses 1–182 and starts with Sri Mata', () => {
    const verses = by['lalitha-sahasranamam'].sections.flatMap((s) => s.verses);
    const nums = new Set(verses.map((v) => Number(v[v.length - 1].match(/(\d+)\s*$/)?.[1])).filter(Boolean));
    for (let i = 1; i <= 182; i++) expect(nums.has(i)).toBe(true);
    expect(verses.flat().join(' ')).toContain('శ్రీమాతా');
  });
  it('credits the source and licence', () => {
    expect(data.license).toMatch(/CC BY-SA/);
    for (const s of data.stotras as Array<{ source: { url: string; credit?: string } }>) {
      if (s.source.credit) expect(s.source.url).toMatch(/^https:\/\//);
      else expect(s.source.url).toMatch(/^https:\/\/te\.wikisource\.org\//);
    }
  });
});

describe('new poojas', () => {
  it('Maha Navami (Ayudha Pooja) is the day before Vijayadashami', () => {
    const obs = observancesInRange('2025-09-01', '2027-12-31', HYD);
    const nav = obs.filter((o) => o.id === 'maha-navami').map((o) => o.date);
    const vd = obs.filter((o) => o.id === 'vijayadashami').map((o) => o.date);
    expect(nav).toEqual(['2025-10-01', '2026-10-19', '2027-10-08']);
    expect(vd).toEqual(['2025-10-02', '2026-10-20', '2027-10-09']);
  });
  it('Hanuman Jayanti follows the regional tradition', () => {
    const te = observancesInRange('2027-01-01', '2027-12-31', HYD, 'te').find((o) => o.id === 'hanuman-jayanti')!;
    const north = observancesInRange('2027-01-01', '2027-12-31', HYD, 'north').find((o) => o.id === 'hanuman-jayanti')!;
    expect(north.date < te.date).toBe(true); // Chaitra Purnima comes before Vaishakha Bahula Dashami
    expect((Date.parse(te.date) - Date.parse(north.date)) / 86400000).toBeGreaterThan(20);
  });
  it('Satyanarayana, Hanuman and Vehicle poojas exist with dates and linked texts', () => {
    for (const id of ['satyanarayana', 'hanuman', 'vehicle']) {
      const p = POOJAS.find((x) => x.id === id)!;
      expect(p.next('2026-10-24', HYD, 'te').length).toBeGreaterThan(0);
      expect(p.steps.length).toBeGreaterThan(5);
    }
    expect(POOJAS.find((x) => x.id === 'vehicle')!.action?.activity).toBe('vehicle');
  });
  it('Hanuman Chalisa has all 40 chaupais', () => {
    const c = data.stotras.find((s) => s.id === 'hanuman-chalisa')!;
    const chaupai = c.sections.find((s) => s.title === 'చౌపాఈ')!;
    expect(chaupai.verses).toHaveLength(40);
    expect(chaupai.verses[0].join(' ')).toContain('జయ హనుమాన');
    expect(chaupai.verses[39].join(' ')).toContain('తులసీదాస');
  });
});

describe('all deity poojas', () => {
  it('has 20 poojas, each with a picture on disk, upcoming dates, and both short and detailed styles', () => {
    expect(POOJAS).toHaveLength(25);
    for (const p of POOJAS) {
      expect(existsSync(`public${DEITY_IMAGES[p.image].src}`)).toBe(true);
      expect(p.next('2026-10-25', HYD, 'te').length).toBeGreaterThan(0);
      const short = shortSteps(p);
      expect(short.length).toBeGreaterThan(1);
      expect(short.length).toBeLessThan(p.steps.length);
    }
  });
  it('new festival dates match published Telugu calendars', () => {
    const obs = observancesInRange('2026-01-01', '2027-03-01', HYD, 'te');
    const on = (id: string) => obs.filter((o) => o.id === id).map((o) => o.date);
    expect(on('vasant-panchami')).toEqual(['2026-01-23', '2027-02-11']);
    expect(on('navaratri')).toEqual(['2026-10-11']);
    expect(on('dhanteras')).toEqual(['2026-11-06']);
    expect(on('narasimha-jayanti')).toEqual(['2026-04-30']);
  });
  it('Saraswati pooja falls on a Navaratri day with Moola nakshatra', () => {
    const d = POOJAS.find((p) => p.id === 'saraswati')!.next('2026-10-01', HYD).find((x) => x.label.startsWith('Saraswati'))!;
    expect(d.date >= '2026-10-11' && d.date <= '2026-10-20').toBe(true);
    const p = dayPanchang(d.date, HYD);
    expect(p.nakshatras.some((n) => n.index === 18)).toBe(true);
  });
  it('Shani Trayodashi is a Saturday with Trayodashi at sunrise', () => {
    const d = POOJAS.find((p) => p.id === 'navagraha')!.next('2026-10-25', HYD).find((x) => x.label === 'Shani Trayodashi')!;
    expect(weekdayOf(d.date)).toBe(6);
    expect([12, 27]).toContain(dayPanchang(d.date, HYD).tithis[0].index);
  });
});

describe('ashtottarams', () => {
  it('each list has 108 names and is used in the right poojas', () => {
    for (const n of Object.values(NAMAVALIS)) if (n.id.endsWith('ashtottaram')) expect(n.names, n.id).toHaveLength(108);
    const uses = (pid: string) => POOJAS.find((p) => p.id === pid)!.steps.flatMap((st) => st.namavalis ?? []);
    expect(uses('shiva')).toContain('shiva-ashtottaram');
    expect(uses('ayyappa')).toEqual(expect.arrayContaining(['ayyappa-ashtottaram', 'shiva-ashtottaram']));
    expect(uses('ayyappa')).toEqual(['ganesha-ashtottaram', 'ayyappa-ashtottaram', 'shiva-ashtottaram', 'venkateswara-ashtottaram', 'lakshmi-ashtottaram', 'ayyappa-sharanu-ghosha']);
    expect(NAMAVALIS['ayyappa-sharanu-ghosha'].names.every((x) => x.name.endsWith('శరణం అయ్యప్ప'))).toBe(true);
    expect(uses('ganapathi')).toContain('ganesha-ashtottaram');
    const ayShort = shortSteps(POOJAS.find((p) => p.id === 'ayyappa')!);
    expect(ayShort.flatMap((st) => st.namavalis ?? [])).toEqual(['ganesha-ashtottaram', 'ayyappa-ashtottaram', 'ayyappa-sharanu-ghosha']);
    expect(ayShort.map((st) => st.stotra).filter(Boolean)).toEqual(['harivarasanam']);
    expect(POOJAS.find((p) => p.id === 'ayyappa')!.steps.some((st) => st.stotra === 'harivarasanam')).toBe(true);
    for (const p of POOJAS) for (const st of [...p.steps, ...shortSteps(p)]) if (st.stotra) expect(data.stotras.some((x) => x.id === st.stotra)).toBe(true);
    expect(uses('vehicle')).toContain('ganesha-ashtottaram');
    expect(uses('lakshmi')).toContain('lakshmi-ashtottaram');
    expect(uses('kubera')).toContain('lakshmi-ashtottaram');
    expect(uses('venkateswara')).toContain('venkateswara-ashtottaram');
  });
  it('keeps the family text\'s alternative readings and first/last names', () => {
    const l = NAMAVALIS['lakshmi-ashtottaram'];
    expect(l.names[0].name).toBe('ఓం ప్రకృత్యై నమః');
    expect(l.names[107].name).toBe('ఓం భువనేశ్వర్యై నమః');
    expect(l.names[22].alt).toBe('దీపాయై నమః');
    expect(NAMAVALIS['ganesha-ashtottaram'].names[4].name).toBe('ఓం ద్వైమాతురాయ నమః');
    expect(NAMAVALIS['shiva-ashtottaram'].names[107].name).toBe('ఓం పరమేశ్వరాయ నమః');
    expect(NAMAVALIS['ayyappa-ashtottaram'].names[0].name).toBe('ఓం మహాశాస్త్రే నమః');
    expect(NAMAVALIS['ayyappa-ashtottaram'].names[55].name).toBe('ఓం గణనాథాయ నమః');
    expect(NAMAVALIS['ayyappa-ashtottaram'].names[107].name).toBe('ఓం భక్తవత్సలాయ నమః');
  });
});

describe('pinda pradanam', () => {
  it('has Mahalaya dates (the day before Navaratri for the Amavasya) and a Shraddha sankalpam', () => {
    const obs = observancesInRange('2026-09-01', '2026-10-31', HYD);
    expect(obs.find((o) => o.id === 'mahalaya-amavasya')?.date).toBe('2026-10-10');
    const pp = obs.find((o) => o.id === 'pitru-paksha')!.date;
    expect(pp >= '2026-09-25' && pp <= '2026-09-28').toBe(true);
    const p = POOJAS.find((x) => x.id === 'pinda')!;
    const sk = p.steps.find((s) => s.kind === 'sankalpam')!;
    expect(sk.sankalpaEnding?.join(' ')).toContain('శ్రాద్ధం కరిష్యే');
    expect(shortSteps(p).length).toBe(4);
    expect(p.next('2026-10-25', HYD).length).toBeGreaterThan(0);
  });
});

describe('new year pooja by region', () => {
  const ugadi = POOJAS.find((p) => p.id === 'ugadi')!;
  const text = (t: string) => JSON.stringify(poojaForTradition(ugadi, t));

  it('keeps the Telugu guide for the Telugu calendar', () => {
    expect(poojaForTradition(ugadi, 'te')).toEqual(ugadi);
    expect(text('te')).toContain('Ugadi pachadi');
  });

  it('gives each region its own rituals', () => {
    expect(text('kn')).toContain('Bevu-bella');
    expect(text('mr')).toContain('Raising the gudi');
    expect(text('ta')).toContain('kanni');
    expect(text('ml')).toContain('Vishukkani');
    expect(text('north')).toContain('Ghatasthapana');
    for (const t of ['kn', 'mr', 'ta', 'ml', 'north']) {
      const p = poojaForTradition(ugadi, t);
      expect(text(t)).not.toContain('Ugadi pachadi');
      expect(p.samagri.length).toBeGreaterThan(3);
      expect(shortSteps(p).length).toBeGreaterThan(4);
    }
  });
});

describe('Thiruppavai', () => {
  const p = POOJAS.find((x) => x.id === 'thiruppavai')!;
  it('has all 30 pasurams, 8 lines each, in order, marked as Tamil text', () => {
    const st = data.stotras.find((s) => s.id === 'thiruppavai')! as { sections: Array<{ title: string; lang?: string; verses: string[][] }> };
    const pas = st.sections.find((s) => s.title === 'తిరుప్పావై')!;
    expect(pas.lang).toBe('ta');
    expect(pas.verses).toHaveLength(30);
    pas.verses.forEach((v, i) => { expect(v).toHaveLength(8); expect(v[7]).toMatch(new RegExp(`ఎం పావాయ్ \\| ${i + 1}$`)); });
    expect(p.stotras).toContain('thiruppavai');
  });
  it('follows Dhanurmasam: pasuram 1 at the start, Koodaravalli on day 27, Goda Kalyanam on Bhogi', () => {
    const d = p.next('2026-10-26', HYD, 'te');
    expect(d.map((x) => x.label)).toEqual(['Dhanurmasam begins (pasuram 1)', 'Koodaravalli (pasuram 27)', 'Bhogi — Goda Kalyanam']);
    expect(d.map((x) => x.date)).toEqual(['2026-12-16', '2027-01-11', '2027-01-14']);
    expect(p.next('2026-12-25', HYD, 'te')[0].label).toBe('Today: pasuram 10 of 30');
    expect(p.next('2027-01-20', HYD, 'te')[0].date).toBe('2027-12-16');
  });
});

describe('nithya pooja', () => {
  it('opens with the family text and continues to a complete pooja, short and detailed', () => {
    const p = POOJAS.find((x) => x.id === 'nithya')!;
    const titles = p.steps.map((s) => s.title.en);
    expect(titles.slice(0, 12)).toEqual(['Ganapathi dhyanam', 'Ekaharathi', 'Deeparadhana', 'Achamanam', "Vishnu's names", 'Mangala shlokas', 'Akshata samarpana', 'Bhushuddhi', 'Pranayamam', 'Shuddhi mantram', 'Sankalpam', 'Kalasharadhana']);
    expect(titles).toContain('Udvasana');
    expect(p.steps.find((s) => s.title.en === 'Deeparadhana')!.mantra).toContain('భో దీప దేవి రూపస్త్వం');
    expect(p.steps.find((s) => s.kind === 'sankalpam')).toBeDefined();
    expect(shortSteps(p).map((s) => s.title.en)).toEqual(['Ganapathi dhyanam', 'Deeparadhana', 'Achamanam', 'Mangala shlokas', 'Sankalpam', 'Offering', 'Naivedyam & harathi', 'Namaskaram']);
    expect(p.next('2026-10-26', HYD)[0].date).toBe('2026-10-26');
  });
});

describe('varalakshmi vratham', () => {
  it('follows the family text up to upaveetam, then the thoram, katha and closing', () => {
    const p = POOJAS.find((x) => x.id === 'varalakshmi')!;
    const titles = p.steps.map((s) => s.title.en);
    expect(titles.slice(0, 19)).toEqual(['Preparation', 'Making the thoram', 'Achamanam', 'Pranayamam', 'Sankalpam', 'Ganapathi pooja', 'Kalasha pooja', 'Dhyanam', 'Avahanam', 'Asanam', 'Padyam', 'Arghyam', 'Achamaniyam', 'Panchamruta snanam', 'Shuddhodaka snanam', 'Vastram', 'Abharanam', 'Upaveetam', 'Gandham, Akshatas, Pushpam']);
    expect(titles).toEqual(expect.arrayContaining(['Thoram bandhanam', 'Vratha katha', 'Vayanam', 'Udvasana']));
    expect(p.steps.find((s) => s.kind === 'sankalpam')!.preeti).toBe('శ్రీ వరలక్ష్మీ దేవతా');
    expect(p.steps.find((s) => s.title.en === 'Upaveetam')!.mantra).toContain('తప్తహేమకృతం దేవి');
    expect(p.samagri).toHaveLength(25);
    expect(shortSteps(p).map((s) => s.title.en)).toEqual(['Sankalpam', 'Ganapathi pooja', 'Dhyanam', 'Avahanam', 'Offering', 'Thoram bandhanam', 'Naivedyam & harathi', 'Namaskaram']);
    const v = p.next('2027-01-01', HYD)[0];
    expect(new Date(v.date + 'T00:00:00Z').getUTCDay()).toBe(5);
  });
});
