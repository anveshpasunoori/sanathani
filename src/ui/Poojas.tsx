import { useEffect, useMemo, useState } from 'react';
import { NAMAVALIS } from '../data/ashtottarams';
import { POOJA_NOTE, POOJAS, REGIONAL_POOJA_NOTE, poojaForTradition, shortSteps, type Pooja, type PoojaStep } from '../data/poojas';
import { usePoojaText } from '../data/poojaText';
import type { DeityImageId } from '../data/deityImages';
import type { TraditionId } from '../data/types';
import { upcoming } from '../data/occurrences';
import { useStore } from '../data/store';
import { sankalpamParts, sankalpamText } from '../engine/sankalpam';
import { formatCivil, todayIn } from '../engine/tz';
import { Card, DeityPic, DevotionSwitch, FollowButton, relativeDay } from './components';
import { shareText, shoppingText } from '../data/shopping';
import { FOLLOW_TEXT } from '../locales/reminders';
import { REGIONAL_CUSTOMS, REGIONS, regionFor, type Region } from '../data/regionalCustoms';
import { LOCALE, useScript, useText } from '../i18n';
import type { Lang } from '../engine/names';
import { POOJA_TEXT } from '../locales/pooja';
import { NEW_YEAR_WHEN, newYearOf, poojaName, REGION_NAMES, subName } from '../locales/poojaNames';
import { go } from './router';
import type { Stotra } from './Stotram';
import { MyPoojaForm, MyPoojasCard, MyPoojaView, useMyPoojas } from './Mine';

type SizeKey = 'verses' | 'names' | 'vsn' | 'chaupais' | 'callResponse' | 'vedicHymn';
export const STOTRA_LIST: Array<{ id: string; en: string; te: string; image: DeityImageId; size: Array<[SizeKey, number?]> }> = [
  { id: 'vishnu-sahasranamam', en: 'Sri Vishnu Sahasranamam', te: 'శ్రీ విష్ణు సహస్రనామ స్తోత్రము', image: 'vishnu', size: [['verses', 108], ['vsn']] },
  { id: 'lalitha-sahasranamam', en: 'Sri Lalitha Sahasranamam', te: 'శ్రీ లలితా సహస్రనామ స్తోత్రము', image: 'lalitha', size: [['verses', 183]] },
  { id: 'ganesha-pancharatnam', en: 'Ganesha Pancharatnam', te: 'గణేశ పంచరత్న స్తోత్రము', image: 'ganapathi', size: [['verses', 5]] },
  { id: 'mahalakshmi-ashtakam', en: 'Mahalakshmi Ashtakam', te: 'మహాలక్ష్మ్యష్టకము', image: 'lakshmi', size: [['verses', 8]] },
  { id: 'harivarasanam', en: 'Harivarasanam', te: 'హరివరాసనం', image: 'ayyappa', size: [['verses', 8]] },
  { id: 'ayyappa-ashtottaram', en: 'Sri Ayyappa Ashtottara Shatanamavali', te: 'శ్రీ అయ్యప్ప అష్టోత్తర శతనామావళి', image: 'ayyappa', size: [['names', 108]] },
  { id: 'ayyappa-sharanu-ghosha', en: 'Sharanu Ghosha', te: 'శరణు ఘోష', image: 'ayyappa', size: [['callResponse']] },
  { id: 'shiva-ashtottaram', en: 'Shiva Ashtottara Shatanamavali', te: 'శ్రీ శివ అష్టోత్తర శతనామావళి', image: 'shiva', size: [['names', 108]] },
  { id: 'ganesha-ashtottaram', en: 'Ganesha Ashtottara Shatanamavali', te: 'శ్రీ గణేశ అష్టోత్తర శతనామావళి', image: 'ganapathi', size: [['names', 108]] },
  { id: 'lakshmi-ashtottaram', en: 'Mahalakshmi Ashtottara Shatanamavali', te: 'శ్రీ మహాలక్ష్మీ అష్టోత్తర శతనామావళి', image: 'lakshmi', size: [['names', 108]] },
  { id: 'venkateswara-ashtottaram', en: 'Sri Venkateswara Ashtottara Shatanamavali', te: 'శ్రీ వేంకటేశ్వర అష్టోత్తర శతనామావళి', image: 'venkateswara', size: [['names', 108]] },
  { id: 'hanuman-chalisa', en: 'Sri Hanuman Chalisa', te: 'శ్రీ హనుమాన్ చాలీసా', image: 'hanuman', size: [['chaupais', 40]] },
  { id: 'thiruppavai', en: 'Thiruppavai', te: 'తిరుప్పావై', image: 'andal', size: [['verses', 30]] },
  { id: 'mantra-pushpam', en: 'Mantra Pushpam', te: 'మంత్ర పుష్పము', image: 'vishnu', size: [['vedicHymn']] },
];

const ORDER = ['nithya', 'ganapathi', 'lakshmi', 'varalakshmi', 'shiva', 'vishnu', 'venkateswara', 'satyanarayana', 'durga', 'saraswati', 'hanuman', 'rama', 'krishna', 'thiruppavai',
  'subrahmanya', 'ayyappa', 'lalitha', 'surya', 'navagraha', 'narasimha', 'dattatreya', 'kubera', 'ugadi', 'vehicle', 'pinda'];

const STYLE_KEY = 'thithi-reminder:pooja-style';

type X = ReturnType<typeof useText<keyof typeof POOJA_TEXT.en>>['x'];
/** "108 verses · 1000 names with meanings" in the chosen language. */
const sizeText = (size: Array<[SizeKey, number?]>, x: X) => size.map(([k, n]) => x(k, n === undefined ? undefined : { n })).join(' · ');

/** A stotram's title: Telugu or English as written, and the Sanskrit title in the reader's script otherwise. */
export function useStotraTitle() {
  const { lang, saTitle } = useScript();
  return {
    title: (s: { en: string; te: string }) => (lang === 'en' ? s.en : lang === 'te' ? s.te : saTitle(s.te)),
    sub: (s: { en: string; te: string }) => subName(s, lang),
  };
}


/** The new-year pooja has its own picture for Kerala (Vishu), Tamil Nadu (Puthandu), Karnataka (Ugadi), Maharashtra (Gudi Padwa) and the North (Nav Samvatsar). */
const NEW_YEAR_IMAGE: Partial<Record<TraditionId, DeityImageId>> = { ml: 'vishu', ta: 'puthandu', kn: 'ugadi-kn', mr: 'gudi-padwa', north: 'nav-samvatsar', gu: 'lakshmi', bn: 'lakshmi', or: 'hanuman' };
const poojaImage = (p: Pooja, tradition: TraditionId): DeityImageId =>
  p.id === 'ugadi' ? NEW_YEAR_IMAGE[tradition] ?? p.image : p.image;

export function PoojasScreen({ id }: { id?: string }) {
  const settings = useStore((s) => s.settings);
  const { x, lang } = useText(POOJA_TEXT);
  const { title, sub } = useStotraTitle();
  const today = todayIn(settings.place.tz);
  const mine = useMyPoojas();
  const pooja = POOJAS.find((p) => p.id === id);
  if (pooja) return <PoojaDetail pooja={pooja} />;
  // The user's own poojas (ids start with "my-") and the form for a new one.
  const own = mine.find((p) => p.id === id);
  if (own) return <MyPoojaView pooja={own} back={x('allPoojas')} />;
  if (id === 'new') return <>
    <button className="btn ghost" onClick={() => go({ tab: 'pooja' })}>← {x('allPoojas')}</button>
    <MyPoojaForm onDone={(p) => go({ tab: 'pooja', id: p?.id })} />
  </>;
  return (
    <>
      <DevotionSwitch current="pooja" />
      <Card className="hero">
        <h2 style={{ margin: 0 }}>{x('poojasStotrams')}</h2>
        <p className="muted small" style={{ marginBottom: 0 }}>{x('listIntro')}</p>
      </Card>
      <div className="pooja-grid">
        {ORDER.map((id) => POOJAS.find((p) => p.id === id)!).filter(Boolean).map((p) => <PoojaTile key={p.id} p={p} today={today} lang={lang} />)}
      </div>
      <MyPoojasCard />
      <Card title={x('stotrams')}>
        <ul className="stotra-list">
          {STOTRA_LIST.map((s) => (
            <li key={s.id}>
              <button onClick={() => go({ tab: 'stotram', id: s.id })}>
                <DeityPic id={s.image} className="stotra-pic" />
                <span className="grow"><strong>{title(s)}</strong><span className="small muted">{sub(s)} · {sizeText(s.size, x)}</span></span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="tiny muted">{x('credits')}</p>
      </Card>
    </>
  );
}

function PoojaTile({ p, today, lang }: { p: Pooja; today: string; lang: Lang }) {
  const place = useStore((s) => s.settings.place);
  const tradition = useStore((s) => s.settings.tradition);
  // Dates take a moment to work out, so the tiles are drawn first and the dates follow.
  const [next, setNext] = useState<{ date: string; label: string }>();
  useEffect(() => {
    const id = setTimeout(() => {
      try { setNext([...p.next(today, place, tradition)].sort((a, b) => a.date.localeCompare(b.date))[0]); } catch { setNext(undefined); }
    }, 0);
    return () => clearTimeout(id);
  }, [p, today, place, tradition]);
  return (
    <button className="pooja-tile" onClick={() => go({ tab: 'pooja', id: p.id })}>
      <DeityPic id={poojaImage(p, tradition)} className="pooja-pic" />
      <strong>{poojaName(p, lang, tradition).title}</strong>
      <span className="small muted">{subName(poojaName(p, lang, tradition).titles, lang)}</span>
      {next && <span className="tiny pooja-next">{next.label} · {relativeDay(today, next.date, lang)}</span>}
    </button>
  );
}

const CHECK_KEY = 'thithi-reminder:samagri';
function useChecklist(id: string) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(CHECK_KEY) ?? '{}')[id] ?? {}; } catch { return {}; }
  });
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(CHECK_KEY) ?? '{}');
      localStorage.setItem(CHECK_KEY, JSON.stringify({ ...all, [id]: checked }));
    } catch { /* storage unavailable */ }
  }, [id, checked]);
  return [checked, setChecked] as const;
}

function PoojaDetail({ pooja: common }: { pooja: Pooja }) {
  const settings = useStore((s) => s.settings);
  // Some festivals (the new year) are kept with the region's own steps and samagri.
  const pooja = poojaForTradition(common, settings.tradition);
  const regional = !!common.byTradition?.[settings.tradition];
  const { x, lang } = useText(POOJA_TEXT);
  const { title } = useStotraTitle();
  // Pooja guides are written in English (with Telugu titles and samagri); other languages read the bundled translations.
  const te = lang === 'te';
  const [english, setEnglish] = useState(false);
  const { t, translated } = usePoojaText(lang, english);
  const loc = LOCALE[lang];
  const name = poojaName(pooja, lang, settings.tradition);
  const today = todayIn(settings.place.tz);
  const [tab, setTab] = useState<'steps' | 'samagri' | 'stotras'>('steps');
  const [style, setStyleState] = useState<'short' | 'detailed'>(() => { try { return localStorage.getItem(STYLE_KEY) === 'short' ? 'short' : 'detailed'; } catch { return 'detailed'; } });
  const setStyle = (v: 'short' | 'detailed') => { setStyleState(v); try { localStorage.setItem(STYLE_KEY, v); } catch { /* ignore */ } };
  const [checked, setChecked] = useChecklist(regional ? `${pooja.id}:${settings.tradition}` : pooja.id);
  const dates = useMemo(() => { try { return [...pooja.next(today, settings.place, settings.tradition)].sort((a, b) => a.date.localeCompare(b.date)); } catch { return []; } }, [pooja, today, settings.place, settings.tradition]);
  const done = pooja.samagri.filter((_, i) => checked[i]).length;
  const { x: f } = useText(FOLLOW_TEXT);
  const [shared, setShared] = useState<'shared' | 'copied' | 'failed'>();
  async function shareList() {
    const heading = f('shoppingFor', { pooja: name.title });
    const when = dates[0] && `📅 ${dates[0].label}: ${formatCivil(dates[0].date, loc, { weekday: 'short', day: 'numeric', month: 'short' })}`;
    const text = shoppingText({
      heading, when, checked, te,
      samagri: pooja.samagri.map((s) => ({ en: t(s.en, s.te), te: t(s.en, s.te) })),
      naivedyam: pooja.naivedyam.map((n) => ({ en: t(n.en, n.te), te: t(n.en, n.te) })),
      labels: { toGet: f('toGet'), alreadyHave: f('alreadyHave'), naivedyam: f('naivedyam') },
    });
    setShared(await shareText(heading, text));
  }

  return (
    <>
      <button className="btn ghost" onClick={() => go({ tab: 'pooja' })}>← {x('allPoojas')}</button>
      <Card className="hero">
        <div className="pooja-hero">
          <DeityPic id={poojaImage(pooja, settings.tradition)} className="hero-pic" credit />
          <div className="grow">
            <h2 style={{ margin: 0 }}>{name.title}</h2>
            <div className="small muted">{name.deity}</div>
          </div>
        </div>
        {translated ? (
          <div className="note info small">
            {x('aiNote')}{' '}
            <button className="btn ghost small" onClick={() => setEnglish((v) => !v)}>{x(english ? 'showTranslation' : 'showEnglish')}</button>
          </div>
        ) : lang !== 'en' && lang !== 'te' && <p className="note info small">{x('contentNote')}</p>}
        <p className="small" style={{ marginBottom: 6 }}>{(w => t(w.en, w.te))(pooja.id === 'ugadi' ? NEW_YEAR_WHEN[newYearOf(settings.tradition)] : pooja.when)}</p>
        {pooja.action && (
          <button className="btn primary" style={{ marginBottom: 8 }} onClick={() => go({ tab: 'muhurtam', activity: pooja.action!.activity })}>🪔 {t(pooja.action.label.en, pooja.action.label.te)}</button>
        )}
        {pooja.id === 'pinda' && <FamilyShraddha />}
        {dates.length > 0 && (
          <div className="row">
            <FollowButton follow={`pooja:${pooja.id}`} />
            {dates.map((d) => (
              <button key={d.label + d.date} className="chip" onClick={() => go({ tab: 'calendar', date: d.date })}>
                📅 {d.label}: {formatCivil(d.date, loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </button>
            ))}
          </div>
        )}
      </Card>

      <RegionalCard poojaId={pooja.id} t={t} />

      <div className="segmented" role="tablist">
        <button role="tab" aria-pressed={tab === 'steps'} onClick={() => setTab('steps')}>{x('steps')}</button>
        <button role="tab" aria-pressed={tab === 'samagri'} onClick={() => setTab('samagri')}>{x('samagri')} {done > 0 && `(${done}/${pooja.samagri.length})`}</button>
        <button role="tab" aria-pressed={tab === 'stotras'} onClick={() => setTab('stotras')}>{x('stotrams')}</button>
      </div>

      {tab === 'steps' && (
        <Card>
          <div className="segmented" role="group" aria-label={x('poojaStyle')} style={{ marginBottom: 12 }}>
            <button aria-pressed={style === 'short'} onClick={() => setStyle('short')}>⏱ {x('short')}</button>
            <button aria-pressed={style === 'detailed'} onClick={() => setStyle('detailed')}>📿 {x('detailed')}</button>
          </div>
          <p className="small muted" style={{ marginTop: 0 }}>
            {x(style === 'short' ? 'shortNote' : 'detailedNote')}
          </p>
          <StepList steps={style === 'short' ? shortSteps(pooja) : pooja.steps} lang={lang} t={t} />
          {style === 'detailed' && pooja.note && <p className="small note info">{t(pooja.note)}</p>}
          <p className="tiny muted">{t(regional ? REGIONAL_POOJA_NOTE : POOJA_NOTE)}</p>
        </Card>
      )}

      {tab === 'samagri' && (
        <Card title={x('keepReady')} action={done > 0 ? <button className="btn ghost small" onClick={() => setChecked({})}>{x('clear')}</button> : undefined}>
          <ul className="checklist">
            {pooja.samagri.map((s, i) => (
              <li key={i}>
                <label><input type="checkbox" checked={!!checked[i]} onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))} />
                  <span>{t(s.en, s.te)}{lang !== 'en' && lang !== 'te' ? null : <span className="tiny muted"> · {subName(s, lang)}</span>}</span></label>
              </li>
            ))}
          </ul>
          <strong className="small">{x('naivedyam')}</strong>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {pooja.naivedyam.map((n, i) => <li key={i}>{t(n.en, n.te)}</li>)}
          </ul>
          <button className="btn primary" style={{ marginTop: 12, width: '100%' }} onClick={shareList}>{f('shareList')}</button>
          {shared === 'copied' && <p className="small note good" role="status">{f('copied')}</p>}
        </Card>
      )}

      {tab === 'stotras' && (
        <Card>
          <ul className="stotra-list">
            {pooja.stotras.map((id) => {
              const s = STOTRA_LIST.find((x) => x.id === id)!;
              return (
                <li key={id}>
                  <button onClick={() => go({ tab: 'stotram', id })}>
                    <DeityPic id={s.image} className="stotra-pic" />
                    <span className="grow"><strong>{title(s)}</strong><span className="small muted">{sizeText(s.size, x)}</span></span>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}

const WHO_KEY = 'thithi-reminder:sankalpam-who';

function SankalpamBlock({ preeti, ending }: { preeti: string; ending?: string[] }) {
  const { sa, lang } = useScript();
  const { x } = useText(POOJA_TEXT);
  const place = useStore((s) => s.settings.place);
  const today = todayIn(place.tz);
  const [who, setWho] = useState<{ name: string; gotram: string }>(() => { try { return JSON.parse(localStorage.getItem(WHO_KEY) ?? '') as { name: string; gotram: string }; } catch { return { name: '', gotram: '' }; } });
  useEffect(() => { try { localStorage.setItem(WHO_KEY, JSON.stringify(who)); } catch { /* ignore */ } }, [who]);
  const parts = useMemo(() => sankalpamParts(today, place), [today, place]);
  const text = useMemo(() => sankalpamText(today, place, preeti || 'శ్రీ పరమేశ్వర', who, ending), [today, place, preeti, who, ending]);
  return (
    <div className="sankalpam">
      <div className="grid2">
        <label className="field small">{x('gotram')}<input value={who.gotram} onChange={(e) => setWho({ ...who, gotram: e.target.value })} placeholder={x('gotramPh')} /></label>
        <label className="field small">{x('name')}<input value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} placeholder={x('namePh')} /></label>
      </div>
      <blockquote className="mantra" lang="sa">{sa(text)}</blockquote>
      <p className="tiny muted">
        {x('filledFor', { date: formatCivil(today, LOCALE[lang]), place: place.name })}: {[parts.samvatsaram, parts.masam, parts.paksham, parts.tithi, parts.nakshatram].map(sa).join(', ')}.
        {parts.abroad ? ` ${x('abroad')}` : ''}
        {' '}{x('omit', { phrase: sa('ధర్మపత్నీ సమేతః') })}
      </p>
    </div>
  );
}

type PoojaT = ReturnType<typeof usePoojaText>['t'];

function StepList({ steps, lang, t }: { steps: PoojaStep[]; lang: Lang; t: PoojaT }) {
  const te = lang === 'te';
  const { sa } = useScript();
  const { x } = useText(POOJA_TEXT);
  return (
    <ol className="pooja-steps">
      {steps.map((s, i) => (
        <li key={i}>
          <strong>{t(s.title.en, s.title.te)}</strong> {(lang === 'en' || te) && <span className="small muted">{subName(s.title, lang)}</span>}
          <p>{t(s.text)}</p>
          {s.kind === 'sankalpam'
            ? <SankalpamBlock preeti={s.preeti ?? ''} ending={s.sankalpaEnding} />
            : s.mantra && <><span className="say-label">{x('say')}</span><blockquote className="mantra" lang="sa">{sa(s.mantra)}</blockquote></>}
          {s.namavalis?.map((id) => <NamavaliBlock key={id} id={id} />)}
          {s.stotra && <StotraInline id={s.stotra} />}
        </li>
      ))}
    </ol>
  );
}

/** 108 names to offer at, one by one; tap a name to mark it offered. */
export function NamavaliBlock({ id, open: startOpen = false }: { id: string; open?: boolean }) {
  const { sa } = useScript();
  const { x } = useText(POOJA_TEXT);
  const { title, sub } = useStotraTitle();
  const n = NAMAVALIS[id];
  const [done, setDone] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(startOpen);
  if (!n) return null;
  const toggle = (i: number) => setDone((d) => { const x = new Set(d); if (x.has(i)) x.delete(i); else x.add(i); return x; });
  return (
    <div className="namavali">
      <button className="namavali-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="grow"><strong>{title(n.title)}</strong> <span className="small muted">{sub(n.title)}</span></span>
        <span className="namavali-count">{done.size} / {n.names.length}</span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <>
          <ol className="namavali-list" lang="sa">
            {n.names.map((x, i) => (
              <li key={i} className={done.has(i) ? 'done' : undefined}>
                <button onClick={() => toggle(i)} aria-pressed={done.has(i)}>
                  <span className="nm-no">{i + 1}</span>
                  <span className="nm-name">{sa(x.name)}{x.alt && <span className="tiny muted"> [{sa(x.alt)}]</span>}</span>
                </button>
              </li>
            ))}
          </ol>
          {n.closing && <p className="small muted" lang="sa" style={{ textAlign: 'center' }}>{sa(n.closing)}</p>}
          {done.size > 0 && <button className="btn ghost small" onClick={() => setDone(new Set())}>{x('resetCount')}</button>}
        </>
      )}
    </div>
  );
}

/** A full stotram shown inside a pooja step (loaded on demand, like the stotram reader). */
function StotraInline({ id }: { id: string }) {
  const { sa } = useScript();
  const { x } = useText(POOJA_TEXT);
  const { title, sub } = useStotraTitle();
  const [open, setOpen] = useState(true);
  const [st, setSt] = useState<Stotra | null>(null);
  useEffect(() => {
    let alive = true;
    import('./Stotram').then((m) => m.loadStotras()).then((f) => { if (alive) setSt(f.stotras.find((x) => x.id === id) ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);
  const meta = STOTRA_LIST.find((x) => x.id === id);
  return (
    <div className="namavali">
      <button className="namavali-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="grow"><strong>{meta ? title(meta) : id}</strong> <span className="small muted">{meta ? sub(meta) : ''}</span></span>
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (st ? (
        <div className="stotra-text inline">
          {st.sections.map((sec, i) => (
            <section key={i}>
              {sec.title && <h3>{sa(sec.title)}</h3>}
              {sec.verses.map((v, j) => <p key={j} className="verse">{v.map((line, k) => <span key={k}>{sa(line)}<br /></span>)}</p>)}
            </section>
          ))}
          <p className="tiny muted">{x('source')}: <a href={st.source.url} target="_blank" rel="noreferrer">{x('wikisource')}</a> (CC BY-SA 4.0)</p>
        </div>
      ) : <p className="small muted" style={{ padding: '8px 12px' }}>{x('loading')}</p>)}
    </div>
  );
}

/** The family's own Shraddha dates (death anniversaries saved in Family Events), for the Pinda Pradanam page. */
function FamilyShraddha() {
  const { x, lang } = useText(POOJA_TEXT);
  const events = useStore((s) => s.events);
  const settings = useStore((s) => s.settings);
  const today = todayIn(settings.place.tz);
  const list = useMemo(
    () => upcoming(events.filter((e) => e.category === 'death' || e.category === 'shraddha'), settings, today, 400),
    [events, settings, today],
  );
  const loc = LOCALE[lang];
  return (
    <div className="note info small" style={{ marginBottom: 8 }}>
      <strong>{x('familyShraddha')}</strong>
      {list.length ? (
        <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {list.slice(0, 6).map((o) => (
            <li key={o.event.id + o.date}>
              <button className="linklike" onClick={() => go({ tab: 'events', id: o.event.id })}>{o.event.personName}</button>
              {' — '}{formatCivil(o.date, loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: '4px 0 0' }}>{x('familyShraddhaEmpty')}</p>
      )}
    </div>
  );
}

const REGION_KEY = 'thithi-reminder:pooja-region';

/** How the chosen region keeps this festival: local name, customs, extra samagri and naivedyam. */
function RegionalCard({ poojaId, t }: { poojaId: string; t: PoojaT }) {
  const { x, lang } = useText(POOJA_TEXT);
  // The customs are written in English (and Telugu for the Telugu region); other languages read the translations.
  const regionName = (r: (typeof REGIONS)[number]) => (lang === 'en' || lang === 'te' ? r[lang] : REGION_NAMES[lang][r.id]);
  const tradition = useStore((s) => s.settings.tradition);
  const [region, setRegionState] = useState<Region>(() => {
    // A region saved by an older version (e.g. the separate Andhra/Telangana entries) falls back to the calendar's region.
    try {
      const saved = localStorage.getItem(REGION_KEY);
      return REGIONS.some((r) => r.id === saved) ? (saved as Region) : regionFor(tradition);
    } catch { return regionFor(tradition); }
  });
  const setRegion = (r: Region) => { setRegionState(r); try { localStorage.setItem(REGION_KEY, r); } catch { /* ignore */ } };
  const byRegion = REGIONAL_CUSTOMS[poojaId];
  if (!byRegion) return null;
  const c = byRegion[region];
  const tx = (s: { en: string; te?: string }) => t(s.en, s.te);
  return (
    <Card title={x('regionCustoms')}>
      <label className="field">
        <span className="sr-only">{x('region')}</span>
        <select value={region} onChange={(e) => setRegion(e.target.value as Region)} aria-label={x('region')}>
          {REGIONS.map((r) => <option key={r.id} value={r.id}>{regionName(r)}{byRegion[r.id] ? '' : x('generalSuffix')}</option>)}
        </select>
      </label>
      {c ? (
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          <strong>{tx(c.name)}</strong>
          {/* The note explains a solar date the list above doesn't show; with that region's own calendar chosen, it does. */}
          {c.dateNote && region !== tradition && <div className="note warn small">📅 {tx(c.dateNote)}</div>}
          <ul className="customs">
            {c.customs.map((x, i) => <li key={i}>{tx(x)}</li>)}
          </ul>
          {c.samagri && <div className="small"><strong>{x('alsoKeep')} </strong>{c.samagri.map(tx).join(' · ')}</div>}
          {c.naivedyam && <div className="small"><strong>{x('naivedyam')}: </strong>{c.naivedyam.map(tx).join(' · ')}</div>}
        </div>
      ) : (
        <p className="small muted" style={{ marginBottom: 0 }}>{x('generalBelow')}</p>
      )}
      <p className="tiny muted" style={{ marginBottom: 0 }}>{x('customsVary')}</p>
    </Card>
  );
}
