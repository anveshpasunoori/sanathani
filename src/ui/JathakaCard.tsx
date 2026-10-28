import { useEffect, useMemo, useRef, useState } from 'react';
import type { BirthProfile } from '../data/types';
import type { BirthChart } from '../engine/jyotish';
import { cardDetails, cardNote, type CardDetails } from '../engine/profileCard';
import { formatCivil } from '../engine/tz';
import { useText } from '../i18n';
import { HOROSCOPE_TEXT } from '../locales/horoscope';
import { Card } from './components';

// Wallet-card proportions (ISO/IEC 7810 ID-1, 85.6 × 54 mm), drawn at 2× for sharp phone screens.
const W = 1012, H = 638, SCALE = 2;
const GOLD = '#f5c86b', CREAM = 'rgba(255, 244, 228, 0.82)', WHITE = '#fffaf2';
const SERIF = '"Noto Serif", Georgia, serif', SANS = 'Inter, system-ui, sans-serif', TELUGU = '"Noto Sans Telugu", "Noto Sans", sans-serif';

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: number, family: string) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${family}`; s -= 1; } while (ctx.measureText(text).width > maxW && s > 10);
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = `600 12.5px ${SANS}`;
  ctx.fillStyle = GOLD;
  ctx.letterSpacing = '1.5px';
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = '0px';
}

export function drawCard(ctx: CanvasRenderingContext2D, p: BirthProfile, d: CardDetails) {
  ctx.save();
  ctx.scale(SCALE, SCALE);

  // Background: deep maroon to saffron, with a faint lotus-like rosette.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#4f1414'); bg.addColorStop(0.55, '#7d2219'); bg.addColorStop(1, '#b9531b');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(0, 0, W, H, 36); ctx.fill();
  ctx.save();
  ctx.translate(W - 120, 110);
  ctx.strokeStyle = 'rgba(245, 200, 107, 0.13)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 16; i++) {
    ctx.rotate(Math.PI / 8);
    ctx.beginPath(); ctx.ellipse(0, -70, 26, 70, 0, 0, Math.PI * 2); ctx.stroke();
  }
  for (const r of [150, 190, 230]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(245, 200, 107, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(16, 16, W - 32, H - 32, 26); ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  // Header
  label(ctx, 'Jathaka card  ·  జాతక పత్రం', 48, 62);
  ctx.font = `500 13px ${SANS}`; ctx.fillStyle = CREAM; ctx.textAlign = 'right';
  ctx.fillText('Sanathani', W - 48, 62);
  ctx.textAlign = 'left';

  // Name and birth line
  ctx.fillStyle = WHITE;
  fit(ctx, p.name, W - 96, 46, 700, SERIF);
  ctx.fillText(p.name, 48, 118);
  const born = `${p.relation} · ${formatCivil(p.date, 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}${p.time ? `, ${p.time}` : ''} · ${p.place.name}`;
  ctx.fillStyle = CREAM;
  fit(ctx, born, W - 96, 17, 400, SANS);
  ctx.fillText(born, 48, 148);

  // Raasi / Nakshatram / Lagnam
  const cols = [48, 372, 696], colW = 290;
  const big: Array<[string, string, string]> = [
    ['Raasi · రాశి', d.rashi.te, d.rashi.en],
    ['Nakshatram · నక్షత్రం', `${d.nakshatra.te} ${d.nakshatra.pada}`, `${d.nakshatra.en} · pada ${d.nakshatra.pada}`],
    ['Lagnam · లగ్నం', d.lagna?.te ?? '—', d.lagna?.en ?? 'Needs birth time'],
  ];
  big.forEach(([l, te, en], i) => {
    label(ctx, l, cols[i], 206);
    ctx.fillStyle = WHITE;
    fit(ctx, te, colW, 40, 700, TELUGU);
    ctx.fillText(te, cols[i], 256);
    ctx.fillStyle = CREAM;
    fit(ctx, en, colW, 19, 500, SANS);
    ctx.fillText(en, cols[i], 284);
  });

  ctx.strokeStyle = 'rgba(245, 200, 107, 0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(48, 318); ctx.lineTo(W - 48, 318); ctx.stroke();

  // Lucky tiles
  const tiles = [48, 282, 516, 750], tileW = 214;
  const tile = (x: number) => { ctx.fillStyle = 'rgba(255, 244, 228, 0.09)'; ctx.beginPath(); ctx.roundRect(x, 338, tileW, 112, 16); ctx.fill(); };
  tiles.forEach(tile);
  label(ctx, 'Lucky day', tiles[0] + 16, 366);
  ctx.fillStyle = WHITE; fit(ctx, d.lucky.day.te, tileW - 32, 26, 700, TELUGU); ctx.fillText(d.lucky.day.te, tiles[0] + 16, 404);
  ctx.fillStyle = CREAM; fit(ctx, d.lucky.day.en, tileW - 32, 15, 500, SANS); ctx.fillText(d.lucky.day.en, tiles[0] + 16, 430);

  label(ctx, 'Lucky numbers', tiles[1] + 16, 366);
  ctx.fillStyle = WHITE; ctx.font = `700 40px ${SERIF}`; ctx.fillText(d.lucky.numbers.join(' · '), tiles[1] + 16, 420);

  label(ctx, 'Lucky colour', tiles[2] + 16, 366);
  ctx.fillStyle = d.lucky.colour.hex; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(tiles[2] + 36, 405, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = WHITE; fit(ctx, d.lucky.colour.te, tileW - 80, 22, 700, TELUGU); ctx.fillText(d.lucky.colour.te, tiles[2] + 64, 402);
  ctx.fillStyle = CREAM; fit(ctx, d.lucky.colour.en, tileW - 80, 14, 500, SANS); ctx.fillText(d.lucky.colour.en, tiles[2] + 64, 426);

  label(ctx, 'Nama aksharalu', tiles[3] + 16, 366);
  let x = tiles[3] + 16;
  d.syllables.te.forEach((s, i) => {
    ctx.font = `${i === d.syllables.mine ? 800 : 500} ${i === d.syllables.mine ? 28 : 22}px ${TELUGU}`;
    ctx.fillStyle = i === d.syllables.mine ? GOLD : CREAM;
    ctx.fillText(s, x, 404);
    x += ctx.measureText(s).width + 12;
  });
  ctx.fillStyle = CREAM; ctx.font = `500 14px ${SANS}`;
  ctx.fillText(d.syllables.en.map((s, i) => (i === d.syllables.mine ? `[${s}]` : s)).join(' '), tiles[3] + 16, 430);

  // Avakahada details
  const facts: Array<[string, string]> = [
    ['Raasi lord', d.rashiLord], ['Star lord', d.nakshatraLord], ['Star deity', d.deity],
    ['Gana', d.gana], ['Nadi', d.nadi], ['Yoni', d.yoni],
  ];
  facts.forEach(([l, v], i) => {
    const fx = 48 + (i % 3) * 324, fy = 492 + Math.floor(i / 3) * 52;
    label(ctx, l, fx, fy);
    ctx.fillStyle = WHITE; fit(ctx, v, 290, 19, 600, SANS); ctx.fillText(v, fx, fy + 24);
  });

  ctx.fillStyle = 'rgba(255, 244, 228, 0.55)'; ctx.font = `400 11.5px ${SANS}`;
  ctx.fillText('Calculated with Lahiri ayanamsa · lucky day, numbers and colour are traditional associations', 48, H - 34);
  ctx.restore();
}

export function JathakaCard({ profile, chart }: { profile: BirthProfile; chart: BirthChart }) {
  const { x, lang } = useText(HOROSCOPE_TEXT);
  const ref = useRef<HTMLCanvasElement>(null);
  const details = useMemo(() => cardDetails(chart), [chart]);
  const [msg, setMsg] = useState('');
  const fileName = `jathaka-card-${profile.name.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-') || 'person'}.png`;

  useEffect(() => {
    let cancelled = false;
    const fonts = [`700 40px "Noto Sans Telugu"`, `700 46px "Noto Serif"`, `600 16px Inter`];
    Promise.all(fonts.map((f) => document.fonts?.load(f).catch(() => null))).finally(() => {
      const c = ref.current;
      if (cancelled || !c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      drawCard(ctx, profile, details);
    });
    return () => { cancelled = true; };
  }, [profile, details]);

  const blob = () => new Promise<Blob | null>((res) => ref.current?.toBlob(res, 'image/png'));
  const download = async () => {
    const b = await blob(); if (!b) return;
    const url = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg(x('downloaded'));
  };
  const share = async () => {
    const b = await blob(); if (!b) return;
    const file = new File([b], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `${profile.name} — Jathaka card` }); } catch { /* user closed the share sheet */ }
    } else {
      download();
    }
  };

  return (
    <Card title={x('jathakaCard')}>
      <canvas ref={ref} width={W * SCALE} height={H * SCALE} className="jathaka-canvas"
        role="img" aria-label={`${profile.name}: ${details.rashi.en} rashi, ${details.nakshatra.en} nakshatra pada ${details.nakshatra.pada}${details.lagna ? `, ${details.lagna.en} lagna` : ''}. Lucky day ${details.lucky.day.en}, lucky numbers ${details.lucky.numbers.join(' and ')}, lucky colour ${details.lucky.colour.en}.`} />
      <div className="row">
        <button className="btn primary" onClick={share}>{x('shareSave')}</button>
        <button className="btn" onClick={download}>{x('downloadImg')}</button>
      </div>
      {msg && <p className="small muted" role="status">{msg}</p>}
      <p className="tiny muted">{x('cardHelp')}</p>
      <p className="tiny muted">{cardNote(lang)}</p>
    </Card>
  );
}
