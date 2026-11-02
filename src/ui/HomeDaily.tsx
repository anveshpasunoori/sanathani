import { useEffect, useMemo, useState } from 'react';
import { shareText } from '../data/shopping';
import { POOJAS } from '../data/poojas';
import type { CalendarObservance as Observance } from '../engine/observances';
import { addDays, type CivilDate } from '../engine/tz';
import { useScript, useText } from '../i18n';
import { festivalName } from '../locales/festivals';
import { DAILY_TEXT } from '../locales/daily';
import { Card, relativeDay } from './components';
import { DeekshaCard, useSadhana } from './Deeksha';
import { go } from './router';
import { GROUPS_TEXT } from '../locales/groups';
import { useStore } from '../data/store';
import { LOCALE } from '../i18n';
import { cloudEnabled } from '../sync/supabase';

// The Home screen's daily cards: the reader's practice (deekshas running, the japa counter), a verse of the
// day from the stotrams, and a nudge to get ready a few days before a festival that has a pooja guide.

/** "Your daily practice": running deekshas with today's checklist, and the way to the japa counter. */
export function DailyPracticeCard() {
  const { x, lang } = useText(DAILY_TEXT);
  const { x: gx } = useText(GROUPS_TEXT);
  const { items } = useSadhana();
  // The next two events of the reader's deeksha groups.
  const groupEvents = useStore((s) => s.groupEvents);
  const soon = (groupEvents ?? []).filter((e) => Date.parse(e.startsAt) > Date.now() - 3600000).slice(0, 2);
  return (
    <>
      {items.filter((a) => !a.p.done).map((a) => <DeekshaCard key={a.kind} kind={a.kind} startDate={a.start} compact />)}
      <Card title={x('dailyPractice')}>
        <div className="row">
          <button className="btn small" onClick={() => go({ tab: 'japa' })}>📿 {x('openJapa')}</button>
          <button className="btn small" onClick={() => go({ tab: 'deeksha' })}>🪔 {x('startDeeksha')}</button>
          {cloudEnabled && <button className="btn small" onClick={() => go({ tab: 'groups' })}>👥 {gx('groups')}</button>}
        </div>
        {soon.length > 0 && (
          <ul className="list" style={{ marginTop: 8 }}>
            {soon.map((e) => (
              <li key={e.id}><button className="item" onClick={() => go({ tab: 'groups', id: e.groupId })}>
                <span className="grow"><strong>{e.title}</strong><br /><span className="small muted">{e.groupName} · {new Date(e.startsAt).toLocaleString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{e.place ? ` · ${e.place}` : ''}</span></span>
              </button></li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

// Festivals whose pooja guide is in the app, by observance id.
const FESTIVAL_POOJA: Record<string, string> = {
  'vinayaka-chavithi': 'ganapathi', deepavali: 'lakshmi', 'maha-shivaratri': 'shiva', 'rama-navami': 'rama', janmashtami: 'krishna',
  navaratri: 'durga', 'vasant-panchami': 'saraswati', 'ananta-chaturdashi': 'ananta-chaturdashi', 'narasimha-jayanti': 'narasimha',
  'hanuman-jayanti': 'hanuman', 'datta-jayanti': 'dattatreya', 'ratha-saptami': 'surya', 'subrahmanya-shashthi': 'subrahmanya',
  'skanda-sashti': 'subrahmanya', ugadi: 'ugadi', 'gudi-padwa': 'ugadi', 'nav-samvatsar': 'ugadi', 'mahalaya-amavasya': 'pinda',
};

/** "Get ready": a festival with a pooja guide within the next three days. */
export function GetReadyCard({ observances, today }: { observances: Observance[]; today: CivilDate }) {
  const { x, lang } = useText(DAILY_TEXT);
  const next = observances.find((o) => o.date <= addDays(today, 3) && FESTIVAL_POOJA[o.id] && POOJAS.some((p) => p.id === FESTIVAL_POOJA[o.id]));
  if (!next) return null;
  return (
    <Card className="get-ready">
      <strong>🛕 {x('getReady', { name: festivalName(next, lang), when: relativeDay(today, next.date, lang) })}</strong>
      <p className="small muted" style={{ margin: '4px 0 8px' }}>{x('getReadyText')}</p>
      <button className="btn primary small" onClick={() => go({ tab: 'pooja', id: FESTIVAL_POOJA[next.id] })}>{x('openGuide')} →</button>
    </Card>
  );
}

interface Stotra { id: string; title: { te: string; en: string }; sections: Array<{ verses: string[][]; lang?: string }> }
// Verses for the verse of the day: the shorter stotrams, read in the reader's own script.
const VERSE_FROM = ['ganesha-pancharatnam', 'mahalakshmi-ashtakam', 'aditya-hridayam', 'shivananda-lahari', 'soundarya-lahari', 'harivarasanam', 'lalitha-sahasranamam'];
let loaded: Promise<Stotra[]> | undefined;
const loadVerses = () => (loaded ??= import('../data/stotras.json').then((m) => (m.default as { stotras: Stotra[] }).stotras.filter((s) => VERSE_FROM.includes(s.id))));

/** One verse a day, the same for everyone that day, with a way to the whole stotram and to share it. */
export function VerseOfDayCard({ today }: { today: CivilDate }) {
  const { x } = useText(DAILY_TEXT);
  const { lang, sa, saTitle } = useScript();
  const [stotras, setStotras] = useState<Stotra[]>();
  useEffect(() => { let on = true; loadVerses().then((s) => on && setStotras(s)); return () => { on = false; }; }, []);
  const pick = useMemo(() => {
    if (!stotras?.length) return undefined;
    const all = stotras.flatMap((s) => s.sections.filter((sec) => !sec.lang).flatMap((sec) => sec.verses.map((v) => ({ s, v }))));
    const day = Math.round(Date.parse(today) / 86400000);
    return all[day % all.length];
  }, [stotras, today]);
  const [shared, setShared] = useState<string>();
  if (!pick) return null;
  const title = lang === 'en' ? pick.s.title.en : lang === 'te' ? pick.s.title.te : saTitle(pick.s.title.te);
  const lines = pick.v.map((l) => sa(l));
  return (
    <Card title={x('verseOfDay')}>
      <div className="verse-of-day">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>
      <p className="small muted" style={{ margin: '6px 0' }}>— {title}</p>
      <div className="row">
        <button className="btn small" onClick={() => go({ tab: 'stotram', id: pick.s.id })}>🔊 {x('readFull')}</button>
        <button className="btn small" onClick={async () => setShared(await shareText(title, `${lines.join('\n')}\n— ${title}\n\n— Sanathani`))}>📤</button>
        {shared === 'copied' && <span className="small muted">✓</span>}
      </div>
    </Card>
  );
}
