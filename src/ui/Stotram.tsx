import { useEffect, useMemo, useState } from 'react';
import { useScript, useText, VOICE_LANG } from '../i18n';
import { tamilTextFromTelugu } from '../engine/script';
import { POOJA_TEXT } from '../locales/pooja';
import { recordingFor } from '../data/chants';
import { ChantCoach } from './ChantCoach';
import { Card, DeityPic } from './components';
import { NAMAVALIS } from '../data/ashtottarams';
import { NamavaliBlock, STOTRA_LIST } from './Poojas';
import { go } from './router';

export interface Stotra {
  id: string;
  title: { te: string; en: string };
  about: string;
  /** `lang: 'ta'` marks Tamil text (Thiruppavai) written in Telugu script. */
  sections: Array<{ title: string; verses: string[][]; lang?: 'ta' }>;
  names?: Array<{ n: number; name: string; meaning: string }>;
  /** `credit` names a source other than Wikisource. */
  source: { title: string; url: string; credit?: string };
}
interface StotraFile { license: string; fetched: string; stotras: Stotra[] }

// The texts are ~300 KB, so they load only when a stotram is opened.
let cache: Promise<StotraFile> | null = null;
export const loadStotras = () => (cache ??= import('../data/stotras.json').then((m) => m.default as StotraFile));

const SIZE_KEY = 'thithi-reminder:stotra-size';

export function StotramScreen({ id }: { id: string }) {
  const { sa, saTitle, lang, script } = useScript();
  const text = (line: string, sec: Stotra['sections'][number]) => (sec.lang === 'ta' ? tamilTextFromTelugu(line, script) : sa(line));
  const { x, t } = useText(POOJA_TEXT);
  const [file, setFile] = useState<StotraFile | null>(null);
  const [error, setError] = useState('');
  const [size, setSize] = useState(() => { try { return Number(localStorage.getItem(SIZE_KEY)) || 1.15; } catch { return 1.15; } });
  const [view, setView] = useState<'text' | 'chant' | 'names'>('text');
  const [q, setQ] = useState('');

  useEffect(() => { loadStotras().then(setFile).catch(() => setError(x('loadError'))); }, []);
  useEffect(() => { try { localStorage.setItem(SIZE_KEY, String(size)); } catch { /* ignore */ } }, [size]);

  const st = file?.stotras.find((s) => s.id === id);
  const meta = STOTRA_LIST.find((s) => s.id === id);
  const names = useMemo(() => {
    if (!st?.names) return [];
    const f = q.trim();
    return f ? st.names.filter((n) => n.name.includes(f) || n.meaning.includes(f) || String(n.n) === f) : st.names;
  }, [st, q]);

  if (NAMAVALIS[id]) {
    return (
      <>
        <button className="btn ghost" onClick={() => history.length > 1 ? history.back() : go({ tab: 'pooja' })}>← {t('back')}</button>
        <Card className="hero">
          <div className="pooja-hero">
            {meta && <DeityPic id={meta.image} className="hero-pic" />}
            <div className="grow">
              <h2 style={{ margin: 0 }}>{saTitle(NAMAVALIS[id].title.te)}</h2>
              <div className="small muted">{NAMAVALIS[id].title.en}</div>
            </div>
          </div>
          <p className="small" style={{ marginBottom: 0 }}>{x('namavaliHelp')}</p>
        </Card>
        <Card><NamavaliBlock id={id} open /></Card>
      </>
    );
  }

  return (
    <>
      <button className="btn ghost" onClick={() => history.length > 1 ? history.back() : go({ tab: 'pooja' })}>← {t('back')}</button>
      {error && <div className="note warn">{error}</div>}
      {!file && !error && <Card><p className="muted">{x('loading')}</p></Card>}
      {file && !st && <Card><p>{x('stotraNotFound')}</p></Card>}
      {st && (
        <>
          <Card className="hero">
            <div className="pooja-hero">
              {meta && <DeityPic id={meta.image} className="hero-pic" credit />}
              <div className="grow">
                <h2 style={{ margin: 0 }}>{saTitle(st.title.te)}</h2>
                <div className="small muted">{st.title.en}</div>
              </div>
            </div>
            <p className="small" style={{ marginBottom: 0 }}>{st.about}</p>
          </Card>

          <div className="row reader-tools" role="group" aria-label={x('readingOptions')}>
            <div className="segmented grow">
              <button aria-pressed={view === 'text'} onClick={() => setView('text')}>{x('read')}</button>
              <button aria-pressed={view === 'chant'} onClick={() => setView('chant')}>🔊 {x('chant')}</button>
              {st.names && <button aria-pressed={view === 'names'} onClick={() => setView('names')}>{x('namesMeanings')}</button>}
            </div>
            <button className="btn" aria-label={x('smaller')} onClick={() => setSize((s) => Math.max(0.9, +(s - 0.1).toFixed(2)))}>A−</button>
            <button className="btn" aria-label={x('larger')} onClick={() => setSize((s) => Math.min(2, +(s + 0.1).toFixed(2)))}>A+</button>
          </div>

          {view === 'text' && (
            <Card>
              <div className="stotra-text" style={{ fontSize: `${size}rem` }}>
                {st.sections.map((sec, i) => (
                  <section key={i}>
                    {sec.title && <h3>{text(sec.title, sec)}</h3>}
                    {sec.verses.map((v, j) => <p key={j} className="verse">{v.map((line, k) => <span key={k}>{text(line, sec)}<br /></span>)}</p>)}
                  </section>
                ))}
              </div>
            </Card>
          )}

          {view === 'chant' && (
            <Card>
              <ChantCoach fontSize={size} voiceLang={VOICE_LANG[lang]} lines={st.sections.flatMap((sec) => sec.verses.flat().map((line) => text(line, sec)))} recording={recordingFor(st.id)} />
            </Card>
          )}

          {view === 'names' && st.names && (
            <Card>
              <label className="sr-only" htmlFor="name-search">{x('searchNames')}</label>
              <input id="name-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={x('searchNamesPh')} />
              <ol className="name-list" style={{ fontSize: `${Math.max(0.95, size - 0.1)}rem` }}>
                {names.map((n) => (
                  <li key={n.n} value={n.n}><strong>{sa(n.name)}</strong> — <span className="muted">{n.meaning}</span></li>
                ))}
              </ol>
              {names.length === 0 && <p className="small muted">{x('noNames')}</p>}
            </Card>
          )}

          <p className="tiny muted">
            {st.source.credit
              ? <>{x('source')}: <a href={st.source.url} target="_blank" rel="noreferrer">{st.source.credit} — {st.source.title}</a>.</>
              : <>{x('source')}: <a href={st.source.url} target="_blank" rel="noreferrer">{x('wikisource')} — {st.source.title}</a> (CC BY-SA 4.0), {x('retrieved', { date: file!.fetched })}.</>}
            {' '}{x('textNote')}
          </p>
        </>
      )}
    </>
  );
}
