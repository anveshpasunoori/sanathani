// Pooja guides (steps, samagri, timings, regional customs) are written in English, with Telugu for
// titles and samagri. The other languages read them through a catalog made once on the Mac with
// `npm run translate-poojas` (scripts/translate-poojas.ts) and bundled in src/data/poojaText/<lang>.json:
// English text → translation, keyed by a hash of the English so a changed step simply falls back to
// English until the script is run again. Mantras are Sanskrit and are never translated.
import { useEffect, useState } from 'react';
import type { Lang } from '../engine/names';
import { NEW_YEAR_WHEN } from '../locales/poojaNames';
import { POOJA_NOTE, POOJAS, REGIONAL_POOJA_NOTE, poojaForTradition, shortSteps, type Pooja } from './poojas';
import { REGIONAL_CUSTOMS } from './regionalCustoms';
import { TRADITIONS } from './traditions';
import { voiceKey } from './voice';

export type PoojaCatalog = Record<string, string>;

/** Catalog key for an English string (the same stable hash as the voice files). */
export const textKey = (en: string) => voiceKey(en);

/** Every English string the pooja screens show, for every regional version of each pooja. */
export function poojaStrings(): string[] {
  const out = new Set<string>([POOJA_NOTE, REGIONAL_POOJA_NOTE, ...Object.values(NEW_YEAR_WHEN).map((w) => w.en)]);
  const add = (s?: string) => { if (s && /[A-Za-z]/.test(s)) out.add(s); };
  const addPooja = (p: Pooja) => {
    add(p.when.en); add(p.action?.label.en); add(p.note);
    p.samagri.forEach((s) => add(s.en));
    p.naivedyam.forEach((n) => add(n.en));
    for (const st of [...p.steps, ...shortSteps(p)]) { add(st.title.en); add(st.text); }
  };
  for (const p of POOJAS) {
    addPooja(p);
    for (const t of TRADITIONS) if (p.byTradition?.[t.id]) addPooja(poojaForTradition(p, t.id));
  }
  for (const byRegion of Object.values(REGIONAL_CUSTOMS)) {
    for (const c of Object.values(byRegion)) {
      if (!c) continue;
      add(c.name.en); add(c.dateNote?.en);
      [...c.customs, ...(c.samagri ?? []), ...(c.naivedyam ?? [])].forEach((t) => add(t.en));
    }
  }
  return [...out];
}

const files = import.meta.glob<PoojaCatalog>('./poojaText/*.json', { import: 'default' });
const loaded = new Map<string, PoojaCatalog>();

/** The bundled catalog for a language, or null when it hasn't been made yet. */
async function loadCatalog(lang: Lang): Promise<PoojaCatalog | null> {
  if (loaded.has(lang)) return loaded.get(lang)!;
  const load = files[`./poojaText/${lang}.json`];
  if (!load) return null;
  const c = await load();
  loaded.set(lang, c);
  return c;
}

/**
 * `t(en, te?)` gives a pooja text in the reader's language: the hand-written Telugu where the
 * data has it, else the catalog's translation, else the English. `english` shows the original.
 */
export function usePoojaText(lang: Lang, english: boolean) {
  const [catalog, setCatalog] = useState<PoojaCatalog | null>(() => loaded.get(lang) ?? null);
  useEffect(() => {
    let live = true;
    setCatalog(loaded.get(lang) ?? null);
    loadCatalog(lang).then((c) => { if (live) setCatalog(c); }).catch(() => {});
    return () => { live = false; };
  }, [lang]);
  const t = (en: string, te?: string): string => {
    if (lang === 'en' || english) return en;
    if (lang === 'te' && te) return te;
    return catalog?.[textKey(en)] ?? en;
  };
  return { t, translated: lang !== 'en' && !!catalog };
}
