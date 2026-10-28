import { useEffect, useMemo, useState } from 'react';
import type { DeityImageId } from '../data/deityImages';
import { songsFor, type Song, type SongDeity } from '../data/songs';
import { useText } from '../i18n';
import { POOJA_TEXT } from '../locales/pooja';
import { pickName, SONG_DEITY_NAMES, subName } from '../locales/poojaNames';
import { Card, DeityPic, DevotionSwitch } from './components';
import { go } from './router';
import { asset } from '../data/asset';
import { deleteMine } from '../data/store';
import type { MySong } from '../data/types';
import { MINE_TEXT } from '../locales/mine';
import { MineActions, MySongForm, useMySongs } from './Mine';

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

/** A song in a list: one of the booklet's, or one the user added (`mine`). */
type Listed = Song & { mine?: MySong };
const asSong = (m: MySong): Listed => ({ id: m.id, deities: [m.deity as SongDeity], title: { te: m.title, en: m.source ?? '' }, text: m.text, mine: m });
/** The booklet's songs for a deity, then the user's own. */
const songsWith = (d: SongDeity, mine: MySong[]): Listed[] => [...songsFor(d), ...mine.filter((m) => m.deity === d).map(asSong)];

export function SongsScreen({ deity, song }: { deity?: string; song?: string }) {
  const mine = useMySongs();
  const { x, deityName } = useSongText();
  const d = SONG_DEITIES.find((x) => x.id === deity);
  // "#songs/new" or "#songs/<deity>/new": the form for a song of the user's own.
  if (deity === 'new' || (d && song === 'new')) return <>
    <button className="btn ghost" onClick={() => go(d ? { tab: 'songs', deity: d.id } : { tab: 'songs' })}>← {d ? x('deitySongs', { deity: deityName(d) }) : x('allDeities')}</button>
    <MySongForm deity={d?.id} onDone={(s) => go(s ? { tab: 'songs', deity: s.deity, song: s.id } : d ? { tab: 'songs', deity: d.id } : { tab: 'songs' })} />
  </>;
  const all = d ? songsWith(d.id, mine) : [];
  const s = all.find((x) => x.id === song);
  if (d && s) return <SongView deity={d} song={s} list={all} />;
  if (d) return <DeitySongs deity={d} all={all} />;
  return <DeityMenu mine={mine} />;
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

function DeityMenu({ mine }: { mine: MySong[] }) {
  const { x, deityName, deitySub, count } = useSongText();
  const { x: m } = useText(MINE_TEXT);
  const deities = useMemo(() => [...SONG_DEITIES].sort((a, b) => Number(songsWith(b.id, mine).length > 0) - Number(songsWith(a.id, mine).length > 0)), [mine]);
  return (
    <>
      <DevotionSwitch current="songs" />
      <Card className="hero">
        <h2 style={{ margin: 0 }}>{x('devotionalSongs')}</h2>
        <p className="muted small">{x('songsIntro')}</p>
        <button className="btn" onClick={() => go({ tab: 'songs', deity: 'new' })}>{m('addSong')}</button>
      </Card>
      <div className="pooja-grid">
        {deities.map((d) => {
          const n = songsWith(d.id, mine).length;
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

function DeitySongs({ deity, all }: { deity: Deity; all: Listed[] }) {
  const { x, deityName, count } = useSongText();
  const { x: m } = useText(MINE_TEXT);
  const [q, setQ] = useState('');
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
                  <span className="grow"><strong lang={s.mine ? undefined : 'te'}>{s.title.te}{s.audio && <span className="has-audio" title={x('hasRecording')}> 🎵</span>}</strong><span className="small muted">{s.mine ? [m('yours'), s.title.en].filter(Boolean).join(' · ') : s.title.en}</span></span>
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
      <button className="btn" onClick={() => go({ tab: 'songs', deity: deity.id, song: 'new' })}>{m('addSong')}</button>
    </>
  );
}

function SongView({ deity, song, list }: { deity: Deity; song: Listed; list: Listed[] }) {
  const { x, deityName } = useSongText();
  const [editing, setEditing] = useState(false);
  const [size, setSize] = useState(() => { try { return Number(localStorage.getItem(SIZE_KEY)) || 1.15; } catch { return 1.15; } });
  useEffect(() => { try { localStorage.setItem(SIZE_KEY, String(size)); } catch { /* ignore */ } }, [size]);
  const i = list.findIndex((s) => s.id === song.id);
  const prev = list[i - 1], next = list[i + 1];
  const stanzas = song.text.split(/\n\s*\n/).map((st) => st.split('\n'));
  // The user's own songs are in whatever language they typed, so they are not marked as Telugu.
  const te = song.mine ? undefined : 'te';
  if (editing && song.mine) return <MySongForm initial={song.mine} onDone={(s) => { setEditing(false); if (s && s.deity !== deity.id) go({ tab: 'songs', deity: s.deity, song: s.id }); }} />;
  return (
    <>
      <button className="btn ghost" onClick={() => go({ tab: 'songs', deity: deity.id })}>← {x('deitySongs', { deity: deityName(deity) })}</button>
      <Card className="hero">
        <div className="pooja-hero">
          <DeityPic id={deity.image} className="stotra-pic" />
          <div className="grow">
            <h2 style={{ margin: 0 }} lang={te}>{song.title.te}</h2>
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
        <div className="song-text" lang={te} style={{ fontSize: `${size}rem` }}>
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
      {song.mine ? (
        <MineActions name={song.title.te} share={() => `🎵 ${song.title.te}${song.mine!.source ? `\n${song.mine!.source}` : ''}\n\n${song.text}\n\n— Sanathani`}
          onEdit={() => setEditing(true)} onDelete={() => { deleteMine('mySongs', song.id); go({ tab: 'songs', deity: deity.id }); }} />
      ) : <p className="tiny muted">{x('songKey')}</p>}
    </>
  );
}
