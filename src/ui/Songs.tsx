import { useEffect, useMemo, useState } from 'react';
import type { DeityImageId } from '../data/deityImages';
import { SONGS, songsFor, type Song, type SongDeity } from '../data/songs';
import { useText } from '../i18n';
import { POOJA_TEXT } from '../locales/pooja';
import { pickName, SONG_DEITY_NAMES, subName } from '../locales/poojaNames';
import { Card, DeityPic, DevotionSwitch } from './components';
import { go } from './router';
import { asset } from '../data/asset';

export const SONG_DEITIES: Array<{ id: SongDeity; image: DeityImageId; en: string; te: string }> = [
  { id: 'ayyappa', image: 'ayyappa', en: 'Ayyappa', te: 'అయ్యప్ప స్వామి' },
  { id: 'ganapathi', image: 'ganapathi', en: 'Ganapathi', te: 'గణపతి' },
  { id: 'shiva', image: 'shiva', en: 'Shiva', te: 'శివుడు' },
  { id: 'vishnu', image: 'vishnu', en: 'Vishnu', te: 'విష్ణువు' },
  { id: 'venkateswara', image: 'venkateswara', en: 'Venkateswara', te: 'వేంకటేశ్వర స్వామి' },
  { id: 'lakshmi', image: 'lakshmi', en: 'Lakshmi', te: 'లక్ష్మీ దేవి' },
  { id: 'hanuman', image: 'hanuman', en: 'Hanuman', te: 'హనుమాన్' },
  { id: 'rama', image: 'rama', en: 'Sri Rama', te: 'శ్రీ రాముడు' },
  { id: 'krishna', image: 'krishna', en: 'Sri Krishna', te: 'శ్రీ కృష్ణుడు' },
  { id: 'durga', image: 'durga', en: 'Durga', te: 'దుర్గా దేవి' },
  { id: 'lalitha', image: 'lalitha', en: 'Lalitha', te: 'లలితా దేవి' },
  { id: 'saraswati', image: 'saraswati', en: 'Saraswati', te: 'సరస్వతీ దేవి' },
  { id: 'subrahmanya', image: 'kartikeya', en: 'Subrahmanya', te: 'సుబ్రహ్మణ్య స్వామి' },
  { id: 'narasimha', image: 'narasimha', en: 'Narasimha', te: 'నృసింహ స్వామి' },
  { id: 'dattatreya', image: 'dattatreya', en: 'Dattatreya', te: 'దత్తాత్రేయ స్వామి' },
  { id: 'surya', image: 'surya', en: 'Surya', te: 'సూర్య భగవానుడు' },
  { id: 'shani', image: 'shani', en: 'Shani', te: 'శనైశ్చరుడు' },
  { id: 'kubera', image: 'kubera', en: 'Kubera', te: 'కుబేరుడు' },
];

const SIZE_KEY = 'thithi-reminder:song-size';

export function SongsScreen({ deity, song }: { deity?: string; song?: string }) {
  const d = SONG_DEITIES.find((x) => x.id === deity);
  const s = SONGS.find((x) => x.id === song);
  if (d && s) return <SongView deity={d} song={s} />;
  if (d) return <DeitySongs deity={d} />;
  return <DeityMenu />;
}

type Deity = (typeof SONG_DEITIES)[number];

/** Songs are in Telugu, as sung; the screens around them follow the chosen language. */
function useSongText() {
  const { x, lang } = useText(POOJA_TEXT);
  return {
    x,
    deityName: (d: Deity) => pickName(d, lang, SONG_DEITY_NAMES, d.id),
    deitySub: (d: Deity) => subName(d, lang),
    count: (n: number) => (n === 1 ? x('oneSong') : x('songCount', { n })),
  };
}

function DeityMenu() {
  const { x, deityName, deitySub, count } = useSongText();
  const deities = useMemo(() => [...SONG_DEITIES].sort((a, b) => Number(songsFor(b.id).length > 0) - Number(songsFor(a.id).length > 0)), []);
  return (
    <>
      <DevotionSwitch current="songs" />
      <Card className="hero">
        <h2 style={{ margin: 0 }}>{x('devotionalSongs')}</h2>
        <p className="muted small" style={{ marginBottom: 0 }}>{x('songsIntro')}</p>
      </Card>
      <div className="pooja-grid">
        {deities.map((d) => {
          const n = songsFor(d.id).length;
          return (
            <button key={d.id} className={`pooja-tile${n ? '' : ' empty'}`} onClick={() => go({ tab: 'songs', deity: d.id })}>
              <DeityPic id={d.image} className="pooja-pic" />
              <strong>{deityName(d)}</strong>
              <span className="small muted">{deitySub(d)}</span>
              <span className="tiny pooja-next">{n ? count(n) : x('comingSoon')}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function DeitySongs({ deity }: { deity: Deity }) {
  const { x, deityName, count } = useSongText();
  const [q, setQ] = useState('');
  const all = songsFor(deity.id);
  const list = q.trim() ? all.filter((s) => s.title.te.includes(q.trim()) || s.title.en.toLowerCase().includes(q.trim().toLowerCase()) || s.text.includes(q.trim())) : all;
  return (
    <>
      <button className="btn ghost" onClick={() => go({ tab: 'songs' })}>← {x('allDeities')}</button>
      <Card className="hero">
        <div className="pooja-hero">
          <DeityPic id={deity.image} className="hero-pic" credit />
          <div className="grow">
            <h2 style={{ margin: 0 }}>{x('deitySongs', { deity: deityName(deity) })}</h2>
            <div className="small muted">{count(all.length)}</div>
          </div>
        </div>
      </Card>
      {all.length > 0 ? (
        <Card>
          <label className="sr-only" htmlFor="song-search">{x('searchSongs')}</label>
          <input id="song-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={x('searchSongsPh')} />
          <ol className="song-list">
            {list.map((s) => (
              <li key={s.id}>
                <button onClick={() => go({ tab: 'songs', deity: deity.id, song: s.id })}>
                  <span className="song-no">{all.indexOf(s) + 1}</span>
                  <span className="grow"><strong lang="te">{s.title.te}{s.audio && <span className="has-audio" title={x('hasRecording')}> 🎵</span>}</strong><span className="small muted">{s.title.en}</span></span>
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ol>
          {list.length === 0 && <p className="small muted">{x('noSongs')}</p>}
        </Card>
      ) : (
        <Card><p className="muted">{x('noSongsYet')}</p></Card>
      )}
    </>
  );
}

function SongView({ deity, song }: { deity: Deity; song: Song }) {
  const { x, deityName } = useSongText();
  const [size, setSize] = useState(() => { try { return Number(localStorage.getItem(SIZE_KEY)) || 1.15; } catch { return 1.15; } });
  useEffect(() => { try { localStorage.setItem(SIZE_KEY, String(size)); } catch { /* ignore */ } }, [size]);
  const list = songsFor(deity.id);
  const i = list.findIndex((s) => s.id === song.id);
  const prev = list[i - 1], next = list[i + 1];
  const stanzas = song.text.split(/\n\s*\n/).map((st) => st.split('\n'));
  return (
    <>
      <button className="btn ghost" onClick={() => go({ tab: 'songs', deity: deity.id })}>← {x('deitySongs', { deity: deityName(deity) })}</button>
      <Card className="hero">
        <div className="pooja-hero">
          <DeityPic id={deity.image} className="stotra-pic" />
          <div className="grow">
            <h2 style={{ margin: 0 }} lang="te">{song.title.te}</h2>
            <div className="small muted">{song.title.en} · {i + 1} / {list.length}</div>
          </div>
        </div>
      </Card>
      {song.audio && (
        <Card>
          <div className="song-audio">
            <span aria-hidden="true">🎵</span>
            <div className="grow">
              <strong>{x('listen')}</strong>
              {song.audio.singer !== 'Recording' && <div className="small muted">{song.audio.singer}</div>}
            </div>
          </div>
          <audio controls preload="none" src={asset(song.audio.src)} style={{ width: '100%' }}>{x('noAudio')}</audio>
        </Card>
      )}
      <div className="row reader-tools" role="group" aria-label={x('readingOptions')}>
        <span className="grow" />
        <button className="btn" aria-label={x('smaller')} onClick={() => setSize((s) => Math.max(0.9, +(s - 0.1).toFixed(2)))}>A−</button>
        <button className="btn" aria-label={x('larger')} onClick={() => setSize((s) => Math.min(2, +(s + 0.1).toFixed(2)))}>A+</button>
      </div>
      <Card>
        <div className="song-text" lang="te" style={{ fontSize: `${size}rem` }}>
          {stanzas.map((lines, k) => (
            <p key={k} className="stanza">
              {lines.map((l, j) => (
                <span key={j} className={l.trim().startsWith('॥') ? 'refrain' : /^(శ్లోకం|\(కోరస్\))/.test(l.trim()) ? 'cue' : undefined}>
                  {l.split(/(\(కోరస్\)|\(\d\)|\(\d సార్లు\))/).map((part, m) => (/^\((కోరస్|\d)/.test(part) ? <span key={m} className="cue"> {part}</span> : part))}
                  <br />
                </span>
              ))}
            </p>
          ))}
        </div>
      </Card>
      <div className="row">
        {prev ? <button className="btn grow" onClick={() => go({ tab: 'songs', deity: deity.id, song: prev.id })}>← <span lang="te">{prev.title.te}</span></button> : <span className="grow" />}
        {next && <button className="btn grow" style={{ textAlign: 'right' }} onClick={() => go({ tab: 'songs', deity: deity.id, song: next.id })}><span lang="te">{next.title.te}</span> →</button>}
      </div>
      <p className="tiny muted">{x('songKey')}</p>
    </>
  );
}
