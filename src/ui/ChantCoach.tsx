// "Chant with me": plays a stotram one line (or half-line) at a time, slowly, then pauses so the
// listener can repeat it. With a recording (data/chants.ts) it plays the chanter's own voice for
// each line, slowed without changing pitch so the svaras stay true. Otherwise it plays the bundled
// natural (neural) voice for the reader's language (data/voice.ts), and only where that has not
// been made yet, the phone's computer voice. Neither can chant Vedic svaras.
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChantRecording } from '../data/chants';
import { useScript, useText } from '../i18n';
import { POOJA_TEXT } from '../locales/pooja';
import { loadVoiceManifest, spoken, voiceFile, voiceKey, voicePieces, type VoiceManifest } from '../data/voice';

// Speech engines tremble when slowed far below normal, so the phone voice keeps a natural rate and
// "slow" means smaller pieces with gaps: word by word, or half a line at a time. Recordings are
// slowed only a little, for the same reason.
const VOICE_RATE = 1;
const SPEEDS = [
  { chunk: 'word', gap: 450, audio: 0.75, label: 'verySlow' },
  { chunk: 'half', gap: 300, audio: 0.85, label: 'slow' },
  { chunk: 'line', gap: 0, audio: 1, label: 'normal' },
] as const;

// Vedic accent marks, shown in colour when the text carries them.
const SVARAS: Record<string, { cls: string; label: 'svarita' | 'anudatta' | 'dirgha' }> = {
  '॑': { cls: 'sv-up', label: 'svarita' },
  '॒': { cls: 'sv-low', label: 'anudatta' },
  '᳚': { cls: 'sv-long', label: 'dirgha' },
};
const SVARA_RE = /([॒॑᳚])/;
// The phone's own language list names voices in English.
const MENU_LANGUAGE: Record<string, string> = { 'te-IN': 'Telugu', 'kn-IN': 'Kannada', 'ta-IN': 'Tamil', 'ml-IN': 'Malayalam', 'hi-IN': 'Hindi', 'mr-IN': 'Marathi' };

/** Line text with any svara marks wrapped so they can be coloured. */
function withSvaras(text: string) {
  return text.split(SVARA_RE).map((part, i) => (SVARAS[part] ? <span key={i} className={SVARAS[part].cls}>{part}</span> : part));
}

/** Splits a long line at the space nearest its middle, so beginners get shorter phrases. */
function halves(line: string): string[] {
  const words = line.trim().split(/\s+/);
  if (words.length < 3) return [line.trim()];
  const mid = line.length / 2;
  let best = 1, pos = 0, bestDist = Infinity;
  for (let i = 1; i < words.length; i++) {
    pos += words[i - 1].length + 1;
    if (Math.abs(pos - mid) < bestDist) { bestDist = Math.abs(pos - mid); best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// On the web the browser's speech engine is used directly, so cancel and speak happen in the same
// tick (the plugin's web version awaits in between, which let Pause slip through). The store apps
// go through the plugin, since Android's web view has no speech engine of its own.
const native = Capacitor.isNativePlatform();

// Devices ship small "compact" voices that sound shaky; prefer a downloaded Enhanced or Premium
// one for the language when present.
const quality = (name: string) => (/premium/i.test(name) ? 2 : /enhanced|neural|natural/i.test(name) ? 1 : 0);
function bestVoice(voices: SpeechSynthesisVoice[], lang: string): number {
  const prefix = lang.slice(0, 2);
  let best = -1;
  voices.forEach((v, i) => {
    if (!v.lang.replace('_', '-').startsWith(prefix)) return;
    if (best < 0 || quality(v.name) > quality(voices[best].name)) best = i;
  });
  return best;
}
const nativeVoice = new Map<string, Promise<number | undefined>>();

function speak(text: string, rate: number, lang: string): Promise<void> {
  if (native) {
    if (!nativeVoice.has(lang)) nativeVoice.set(lang, TextToSpeech.getSupportedVoices().then(({ voices }) => { const i = bestVoice(voices, lang); return i < 0 ? undefined : i; }).catch(() => undefined));
    return nativeVoice.get(lang)!.then((voice) => TextToSpeech.speak({ text, lang, rate, voice }));
  }
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voices = speechSynthesis.getVoices();
    const i = bestVoice(voices, lang);
    if (i >= 0) u.voice = voices[i];
    u.onend = () => resolve();
    u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(e));
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}
function hush() {
  if (native) TextToSpeech.stop().catch(() => {});
  else if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/** Plays [from, to) of the recording at the given rate, keeping the pitch. Resolves at `to` or when stopped. */
function playSegment(audio: HTMLAudioElement, from: number, to: number, rate: number, stopped: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    audio.currentTime = from;
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    const tick = () => {
      if (stopped() || audio.ended || audio.currentTime >= to) { audio.pause(); resolve(); return; }
      requestAnimationFrame(tick);
    };
    audio.play().then(() => requestAnimationFrame(tick)).catch(() => resolve());
  });
}

export function ChantCoach({ lines, fontSize, recording, voiceLang = 'te-IN' }: { lines: string[]; fontSize: number; recording?: ChantRecording; voiceLang?: string }) {
  const { x } = useText(POOJA_TEXT);
  const { sa } = useScript();
  const [useRecording, setUseRecording] = useState(!!recording);
  const [short, setShort] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [repeatAfter, setRepeatAfter] = useState(true);
  const [times, setTimes] = useState(1);
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'speaking' | 'your-turn'>('idle');
  const [voice, setVoice] = useState<'checking' | 'ok' | 'missing'>('checking');
  const run = useRef(0);
  const list = useRef<HTMLOListElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const lineAudio = useRef<HTMLAudioElement | null>(null);
  const [natural, setNatural] = useState<VoiceManifest | null>(null);

  const fromRecording = useRecording && !!recording;
  // Recordings and the natural voice are made per line, so lines stay whole (the speed setting
  // still plays them half by half or word by word).
  const wholeLines = fromRecording || !!natural;
  const phrases = useMemo(() => (short && !wholeLines ? lines.flatMap(halves) : lines.map((l) => l.trim())).filter(Boolean), [lines, short, wholeLines]);
  const svarasUsed = useMemo(() => Object.keys(SVARAS).filter((m) => lines.some((l) => l.includes(m))), [lines]);

  useEffect(() => {
    // Browsers load their voice list a moment after the page opens, so check a few times before
    // telling the user to install one.
    let alive = true;
    (async () => {
      const made = await loadVoiceManifest(voiceLang);
      if (made) { if (alive) { setNatural(made); setVoice('ok'); } return; }
      for (let tries = 0; tries < 6 && alive; tries++) {
        const ok = await TextToSpeech.isLanguageSupported({ lang: voiceLang }).then((r) => r.supported).catch(() => false);
        if (ok) { if (alive) setVoice('ok'); return; }
        await wait(500);
      }
      if (alive) setVoice('missing');
    })();
    return () => { alive = false; run.current++; hush(); audio.current?.pause(); lineAudio.current?.pause(); };
  }, []);

  // Changing how lines are split or where the sound comes from resets the position.
  useEffect(() => { stop(); setCurrent(0); }, [short, wholeLines]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    list.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [current]);

  function stop() {
    run.current++;
    setPhase('idle');
    hush();
    audio.current?.pause();
    lineAudio.current?.pause();
  }

  async function sayLine(i: number, isStopped: () => boolean) {
    if (fromRecording && recording) {
      audio.current ??= new Audio(recording.src);
      const end = recording.starts[i + 1] ?? Number.POSITIVE_INFINITY;
      await playSegment(audio.current, recording.starts[i], end, SPEEDS[speed].audio, isStopped);
      return;
    }
    const { chunk, gap } = SPEEDS[speed];
    const text = spoken(phrases[i]);
    const made = natural?.lines[voiceKey(text)];
    if (made) {
      // Slow speeds play the same natural recording in pieces, at its own pace, with pauses between.
      lineAudio.current?.pause();
      const el = lineAudio.current = new Audio(voiceFile(voiceLang, voiceKey(text)));
      const pieces = voicePieces(made, text.length, chunk);
      for (let k = 0; k < pieces.length; k++) {
        if (isStopped()) return;
        await playSegment(el, pieces[k][0], pieces[k][1], 1, isStopped);
        if (k < pieces.length - 1) await wait(gap);
      }
    } else {
      const pieces = (chunk === 'word' ? text.split(' ') : chunk === 'half' ? halves(text) : [text]).filter(Boolean);
      for (let k = 0; k < pieces.length; k++) {
        if (isStopped()) return;
        await speak(pieces[k], VOICE_RATE, voiceLang);
        if (k < pieces.length - 1) await wait(gap);
      }
    }
  }

  async function play(from = current) {
    hush();
    audio.current?.pause();
    lineAudio.current?.pause();
    const me = ++run.current;
    const isStopped = () => run.current !== me;
    for (let i = from; i < phrases.length; i++) {
      setCurrent(i);
      for (let n = 0; n < times; n++) {
        if (isStopped()) return;
        setPhase('speaking');
        const started = Date.now();
        try {
          await sayLine(i, isStopped);
        } catch {
          if (!isStopped()) { setVoice('missing'); setPhase('idle'); }
          return;
        }
        if (isStopped()) return;
        // Give the listener a little longer than the line took.
        if (repeatAfter) setPhase('your-turn');
        await wait(repeatAfter ? Math.max(1500, (Date.now() - started) * 1.3 + 600) : 400);
      }
    }
    if (!isStopped()) { setPhase('idle'); setCurrent(0); }
  }

  const noVoice = !fromRecording && voice === 'missing';

  return (
    <div className="chant">
      {recording && (
        <div className="segmented" aria-label={x('whoseVoice')}>
          <button aria-pressed={fromRecording} onClick={() => setUseRecording(true)}>🎙 {x('chantedBy', { name: recording.chanter })}</button>
          <button aria-pressed={!fromRecording} onClick={() => setUseRecording(false)}>{x('phoneVoice')}</button>
        </div>
      )}

      {noVoice ? (
        <div className="note warn small">
          <strong>{x('noVoice', { language: x('voiceLanguage') })}</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li><strong>iPhone:</strong> Settings → Accessibility → Spoken Content → Voices → {MENU_LANGUAGE[voiceLang] ?? 'Telugu'} → download a voice.</li>
            <li><strong>Android:</strong> Settings → Accessibility → Text-to-speech → Speech Services by Google → ⚙ → Install voice data → {MENU_LANGUAGE[voiceLang] ?? 'Telugu'}.</li>
          </ul>
          <div style={{ marginTop: 6 }}>{x('openAgain')}</div>
        </div>
      ) : (
        <>
          <div className="chant-controls">
            <div className="segmented" aria-label={x('speed')}>
              {SPEEDS.map((s, i) => <button key={s.label} aria-pressed={speed === i} onClick={() => setSpeed(i)}>{x(s.label)}</button>)}
            </div>
            <div className="chips">
              <button className="chip" aria-pressed={repeatAfter} onClick={() => setRepeatAfter((v) => !v)}>{x('repeatAfter')}</button>
              {!wholeLines && <button className="chip" aria-pressed={short} onClick={() => setShort((v) => !v)}>{x('shorter')}</button>}
              <button className="chip" onClick={() => setTimes((t) => (t % 3) + 1)} aria-label={x('eachLineAria', { n: times })}>
                {x('eachLine', { n: times })}
              </button>
            </div>
          </div>

          <div className="chant-bar" role="group" aria-label={x('player')}>
            <button className="btn" aria-label={x('prevLine')} disabled={current === 0}
              onClick={() => { const i = Math.max(0, current - 1); if (phase === 'idle') setCurrent(i); else play(i); }}>⏮</button>
            {phase === 'idle'
              ? <button className="btn primary grow" disabled={!fromRecording && voice === 'checking'} onClick={() => play()}>▶ {x(current ? 'continue' : 'start')}</button>
              : <button className="btn primary grow" onClick={stop}>⏸ {x('pause')}</button>}
            <button className="btn" aria-label={x('nextLine')} disabled={current >= phrases.length - 1}
              onClick={() => { const i = Math.min(phrases.length - 1, current + 1); if (phase === 'idle') setCurrent(i); else play(i); }}>⏭</button>
          </div>
          <p className="chant-status small" aria-live="polite">
            {phase === 'speaking' && x('listening')}
            {phase === 'your-turn' && x('yourTurn')}
            {phase === 'idle' && x('tapLine')}
          </p>
        </>
      )}

      {svarasUsed.length > 0 && (
        <p className="svara-legend small">
          {svarasUsed.map((m) => <span key={m}><span className={SVARAS[m].cls}>{sa('క') + m}</span> {x(SVARAS[m].label)}</span>)}
        </p>
      )}

      <ol ref={list} className="chant-lines" style={{ fontSize: `${fontSize}rem` }}>
        {phrases.map((p, i) => (
          <li key={i} aria-current={i === current ? 'true' : undefined} className={i === current ? phase : undefined}>
            <button onClick={() => !noVoice && play(i)}>{withSvaras(p)}</button>
          </li>
        ))}
      </ol>
      <p className="tiny muted">
        {x(fromRecording ? 'pitchNote' : natural ? 'naturalVoice' : 'computerVoice')}
      </p>
    </div>
  );
}
