// Makes the Sanathani logo set from one emblem drawing, so every variant stays identical:
//   public/brand/*.svg   emblem, primary (stacked) and horizontal logos for light, dark and one colour
//   public/icon.svg      the app icon (burgundy tile, gold emblem) — also the favicon
//   public/icons/*.png   192/512/1024 icons, the iOS touch icon and the Android maskable icon
//   android/…/res, ios/…/Assets.xcassets   launcher icons, the iOS app icon and the splash screens
// Run: node scripts/build-brand.mjs   (PNGs are rendered with the installed Google Chrome, headless)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const C = {
  burgundy: '#702B36', deep: '#4B1822', gold: '#C5A15A', champagne: '#F0DDAA',
  ivory: '#FAF7F0', charcoal: '#302820', darkText: '#F7F0E8',
};

/**
 * The emblem on a 64×64 grid: a temple dome with its finial (the sacred space), the namam with its
 * red-orange centre line (devotion), a five-petal lotus (purity, renewal) and gentle water beneath.
 * Clean shapes and even strokes so it still reads at small icon sizes. `flame` colours the namam's
 * centre line.
 */
function emblem(line, flame = '#D9622B') {
  return `
  <g fill="${line}">
    <path d="M32 7.2c1 1.6 1.6 2.8 1.6 3.8 0 .9-.7 1.6-1.6 1.6s-1.6-.7-1.6-1.6c0-1 .6-2.2 1.6-3.8z"/>
    <ellipse cx="32" cy="13.8" rx="2.7" ry="0.95"/>
    <ellipse cx="32" cy="15.6" rx="1.5" ry="0.9"/>
    <ellipse cx="32" cy="17.3" rx="3.7" ry="1"/>
  </g>
  <g fill="none" stroke="${line}" stroke-linecap="round" stroke-linejoin="round">
    <path stroke-width="2" d="M14.6 39.5c0-3.9 1-6.4 4-7.3 1-4.8 3.6-8.4 7.6-10.4 2.5-1.2 4.4-2.4 5.8-3.9 1.4 1.5 3.3 2.7 5.8 3.9 4 2 6.6 5.6 7.6 10.4 3 .9 4 3.4 4 7.3"/>
    <path stroke-width="1.7" d="M28.2 23.6v9.6c0 2.3 1.6 3.9 3.8 6.6 2.2-2.7 3.8-4.3 3.8-6.6v-9.6"/>
    <path stroke-width="1.6" d="M13.5 52.6c5.6-2.6 11.6-2.2 17.6.1 5.9 2.3 11.2 2.2 19.4-1.5"/>
    <path stroke-width="1.4" d="M23.5 56c4.5-.9 8.6.3 13 .1"/>
  </g>
  <path d="M32 24.6c.9 3.8 1.7 6.9 0 10.7-1.7-3.8-.9-6.9 0-10.7z" fill="${flame}"/>
  <g fill="${line}">
    <path d="M31.4 50.6C24 48 19.6 40.6 21 31.4c7 3.4 10.8 10.4 10.4 19.2z"/>
    <path d="M32.6 50.6C40 48 44.4 40.6 43 31.4c-7 3.4-10.8 10.4-10.4 19.2z"/>
    <path d="M29.6 50.4C21.4 50.6 14.2 46.4 11 40.6c8 -.6 14.8 3.2 18.6 9.8z"/>
    <path d="M34.4 50.4c8.2.2 15.4-4 18.6-9.8-8-.6-14.8 3.2-18.6 9.8z"/>
  </g>`;
}

const svg = (w, h, body, title = 'Sanathani') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${body}\n</svg>\n`;

// The wordmark uses the app's serif (Noto Serif, falling back to Georgia) so it matches the headings.
const word = (x, y, size, fill, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-family="'Noto Serif', Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="600" letter-spacing="0.5" fill="${fill}" text-anchor="${anchor}">Sanathani</text>`;

// The app icon's tile: deep burgundy, a little lighter at the top, with a fine gold border.
const tile = () =>
  `<defs><radialGradient id="g" cx="40%" cy="20%" r="90%"><stop offset="0" stop-color="#7A2E3A"/><stop offset="1" stop-color="${C.deep}"/></radialGradient></defs>`
  + `<rect x="0.6" y="0.6" width="62.8" height="62.8" rx="14" fill="url(#g)" stroke="${C.gold}" stroke-width="1.2"/>`;

const files = {
  // Emblem alone: burgundy on light backgrounds, gold on dark, and a one-colour version (currentColor).
  'brand/emblem-light.svg': svg(64, 64, emblem(C.burgundy)),
  'brand/emblem-dark.svg': svg(64, 64, emblem(C.gold)),
  'brand/emblem-mono.svg': svg(64, 64, emblem('currentColor', 'currentColor')),
  // Horizontal logo for headers.
  'brand/logo-horizontal-light.svg': svg(248, 64, `${emblem(C.burgundy)}${word(74, 42, 30, C.charcoal)}`),
  'brand/logo-horizontal-dark.svg': svg(248, 64, `${emblem(C.gold)}${word(74, 42, 30, C.darkText)}`),
  'brand/logo-horizontal-mono.svg': svg(248, 64, `${emblem('currentColor', 'currentColor')}${word(74, 42, 30, 'currentColor')}`),
  // Primary (stacked) logo.
  'brand/logo-primary-light.svg': svg(240, 150, `<g transform="translate(80 4) scale(1.25)">${emblem(C.burgundy)}</g>${word(120, 132, 32, C.charcoal, 'middle')}`),
  'brand/logo-primary-dark.svg': svg(240, 150, `<g transform="translate(80 4) scale(1.25)">${emblem(C.gold)}</g>${word(120, 132, 32, C.darkText, 'middle')}`),
  // App icon and favicon: gold emblem on a burgundy tile.
  'icon.svg': svg(64, 64, `${tile()}<g transform="translate(4.5 3.8) scale(0.86)">${emblem(C.gold)}</g>`),
};

const pub = resolve('public');
mkdirSync(join(pub, 'brand'), { recursive: true });
for (const [name, content] of Object.entries(files)) writeFileSync(join(pub, name), content);
console.log(`Wrote ${Object.keys(files).length} SVGs.`);

// PNG icons. iOS and Android maskable icons are full-bleed squares (the system rounds them), with the
// emblem kept inside the central safe zone.
const square = (scale) => svg(64, 64, `<rect width="64" height="64" fill="${C.burgundy}"/><g transform="translate(${32 - 32 * scale} ${32 - 32 * scale - 1}) scale(${scale})">${emblem(C.gold)}</g>`);
const pngs = [
  ['icons/icon-192.png', files['icon.svg'], 192],
  ['icons/icon-512.png', files['icon.svg'], 512],
  ['icons/icon-1024.png', files['icon.svg'], 1024],
  ['icons/apple-touch-icon.png', square(0.82), 180],
  ['icons/icon-maskable-512.png', square(0.62), 512],
];
// Native app assets: Android launcher icons (square, round and the adaptive-icon foreground on the
// burgundy background colour), the iOS app icon, and the splash screens of both apps.
const fg = svg(108, 108, `<g transform="translate(23 22) scale(0.97)">${emblem(C.gold)}</g>`);
const round = svg(64, 64, `<circle cx="32" cy="32" r="32" fill="${C.burgundy}"/><g transform="translate(9.6 8.6) scale(0.7)">${emblem(C.gold)}</g>`);
const splash = (w, h) => {
  const e = Math.min(w, h) * 0.26;
  return svg(w, h, `<defs><radialGradient id="s" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#7A2E3A"/><stop offset="1" stop-color="${C.deep}"/></radialGradient></defs>`
    + `<rect width="${w}" height="${h}" fill="url(#s)"/>`
    + `<g transform="translate(${(w - e) / 2} ${h / 2 - e * 0.72}) scale(${e / 64})">${emblem(C.gold)}</g>`
    + word(w / 2, h / 2 + e * 0.62, e * 0.36, C.champagne, 'middle'));
};
const res = 'android/app/src/main/res';
const DENSITY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const native = [];
for (const [d, k] of Object.entries(DENSITY)) {
  native.push([`${res}/mipmap-${d}/ic_launcher.png`, files['icon.svg'], 48 * k, 48 * k]);
  native.push([`${res}/mipmap-${d}/ic_launcher_round.png`, round, 48 * k, 48 * k]);
  native.push([`${res}/mipmap-${d}/ic_launcher_foreground.png`, fg, 108 * k, 108 * k]);
}
for (const [dir, w, h] of [['drawable', 480, 320], ['drawable-land-mdpi', 480, 320], ['drawable-land-hdpi', 800, 480], ['drawable-land-xhdpi', 1280, 720], ['drawable-land-xxhdpi', 1600, 960], ['drawable-land-xxxhdpi', 1920, 1280],
  ['drawable-port-mdpi', 320, 480], ['drawable-port-hdpi', 480, 800], ['drawable-port-xhdpi', 720, 1280], ['drawable-port-xxhdpi', 960, 1600], ['drawable-port-xxxhdpi', 1280, 1920]]) {
  native.push([`${res}/${dir}/splash.png`, splash(w, h), w, h]);
}
const ios = 'ios/App/App/Assets.xcassets';
native.push([`${ios}/AppIcon.appiconset/AppIcon-512@2x.png`, square(0.84), 1024, 1024]);
for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) native.push([`${ios}/Splash.imageset/${f}`, splash(2732, 2732), 2732, 2732]);
// The adaptive icon's background colour.
writeFileSync(`${res}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${C.burgundy}</color>\n</resources>\n`);

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (!existsSync(chrome)) {
  console.log('Google Chrome not found — PNG icons were not regenerated.');
} else {
  mkdirSync(join(pub, 'icons'), { recursive: true });
  const work = mkdtempSync(join(tmpdir(), 'brand-'));
  const render = (content, w, h, out) => {
    const html = join(work, 'icon.html');
    writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent"><img style="display:block;width:${w}px;height:${h}px" src="data:image/svg+xml;base64,${Buffer.from(content).toString('base64')}"></body></html>`);
    execFileSync(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, '--default-background-color=00000000', `--screenshot=${out}`, `file://${html}`], { stdio: 'ignore' });
  };
  try {
    for (const [name, content, size] of pngs) render(content, size, size, join(pub, name));
    for (const [out, content, w, h] of native) render(content, w, h, resolve(out));
    console.log(`Rendered ${pngs.length} web icons and ${native.length} native icons and splash screens.`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
