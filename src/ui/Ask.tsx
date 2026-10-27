import { useEffect, useRef, useState } from 'react';
import { answer, type Answer } from '../assistant/answer';
import { getState } from '../data/store';
import { useText } from '../i18n';
import { ASK_TEXT, SUGGESTION_QUERIES, type SuggestionKey } from '../locales/ask';
import { AnswerView, Card } from './components';
import { go } from './router';

const SUGGESTIONS = Object.keys(SUGGESTION_QUERIES) as SuggestionKey[];

interface Turn { q: string; a: Answer }

export function AskScreen({ initial }: { initial?: string }) {
  const { lang, x, t } = useText(ASK_TEXT);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState('');
  const asked = useRef<string | undefined>(undefined);
  const end = useRef<HTMLDivElement>(null);

  // `shown` is what the user sees in their language; `query` is what the parser reads.
  const ask = (shown: string, query = shown) => {
    const text = shown.trim();
    if (!text) return;
    let a: Answer;
    try {
      a = answer(query.trim(), getState());
    } catch (err) {
      console.error(err);
      a = { title: x('sorryTitle'), lines: [x('sorryBody')] };
    }
    setTurns((ts) => [...ts, { q: text, a }]);
    setQ('');
  };

  useEffect(() => {
    if (initial && asked.current !== initial) { asked.current = initial; ask(initial); }
  }, [initial]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns.length]);

  return (
    <>
      <Card title={x('title')}>
        <p className="small muted">{x('intro')}{lang !== 'en' && ` ${x('langNote')}`}</p>
        <form className="ask-box" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <label className="sr-only" htmlFor="ask">{x('question')}</label>
          <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('askPlaceholder')} autoFocus />
          <button className="btn primary round" type="submit">{t('ask')}</button>
        </form>
        {turns.length === 0 && (
          <div className="chips">{SUGGESTIONS.map((k) => <button key={k} className="chip" onClick={() => ask(x(k), SUGGESTION_QUERIES[k])}>{x(k)}</button>)}</div>
        )}
      </Card>
      <div className="chat" aria-live="polite">
        {turns.map((turn, i) => (
          <div key={i} className="chat">
            <div className="bubble user">{turn.q}</div>
            <AnswerView a={turn.a}
              onDraft={turn.a.draft ? () => go({ tab: 'events', id: 'new', draft: JSON.stringify(turn.a.draft) }) : undefined}
              onEvent={(id) => go({ tab: 'events', id })} />
          </div>
        ))}
        <div ref={end} />
      </div>
      {turns.length > 0 && <div className="chips">{SUGGESTIONS.slice(0, 4).map((k) => <button key={k} className="chip" onClick={() => ask(x(k), SUGGESTION_QUERIES[k])}>{x(k)}</button>)}</div>}
    </>
  );
}
