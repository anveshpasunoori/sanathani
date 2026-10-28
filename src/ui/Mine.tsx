import { useState } from 'react';
import { deleteMine, saveMine, uid, useStore } from '../data/store';
import { shareText } from '../data/shopping';
import type { MyPooja, MySong } from '../data/types';
import { useText } from '../i18n';
import { MINE_TEXT } from '../locales/mine';
import { pickName, SONG_DEITY_NAMES } from '../locales/poojaNames';
import { Card, DeityPic } from './components';
import { go } from './router';
import { SONG_DEITIES } from './Songs';

// The user's own songs and poojas: written on the phone, kept with their family events (and synced
// with them when signed in), shared only when they press Share. Nothing here is reviewed or published.

const NONE: MySong[] = [];
const NO_POOJAS: MyPooja[] = [];
export const useMySongs = () => useStore((s) => s.mySongs ?? NONE);
export const useMyPoojas = () => useStore((s) => s.myPoojas ?? NO_POOJAS);

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

function DeitySelect({ value, onChange, optional }: { value: string; onChange: (v: string) => void; optional?: boolean }) {
  const { x, lang } = useText(MINE_TEXT);
  return (
    <label className="field">{x('deity')}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {optional && <option value="">{x('noDeity')}</option>}
        {SONG_DEITIES.map((d) => <option key={d.id} value={d.id}>{pickName(d, lang, SONG_DEITY_NAMES, d.id)}</option>)}
      </select>
    </label>
  );
}

/** Edit, Delete and Share for one of the user's own items. */
export function MineActions({ name, share, onEdit, onDelete }: { name: string; share: () => string; onEdit: () => void; onDelete: () => void }) {
  const { x } = useText(MINE_TEXT);
  const [result, setResult] = useState<'shared' | 'copied' | 'failed'>();
  return (
    <>
      <div className="row">
        <button className="btn primary" onClick={async () => setResult(await shareText(name, share()))}>{x('share')}</button>
        <button className="btn" onClick={onEdit}>{x('edit')}</button>
        <button className="btn danger" onClick={() => { if (confirm(x('confirmDelete', { name }))) onDelete(); }}>{x('delete')}</button>
      </div>
      {result === 'copied' && <p className="small muted" role="status">{x('copied')}</p>}
      {result === 'failed' && <p className="small" role="alert">{x('shareFailed')}</p>}
      <p className="tiny muted">🔒 {x('ownNote')}</p>
    </>
  );
}

export function MySongForm({ initial, deity, onDone }: { initial?: MySong; deity?: string; onDone: (saved?: MySong) => void }) {
  const { x } = useText(MINE_TEXT);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [d, setD] = useState(initial?.deity ?? deity ?? SONG_DEITIES[0].id);
  const [text, setText] = useState(initial?.text ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [error, setError] = useState(false);
  function save() {
    if (!title.trim()) { setError(true); return; }
    const now = new Date().toISOString();
    const song: MySong = { id: initial?.id ?? `my-${uid()}`, deity: d, title: title.trim(), text: text.replace(/\n{3,}/g, '\n\n').trim(), source: source.trim() || undefined, createdAt: initial?.createdAt ?? now, updatedAt: now };
    saveMine('mySongs', song);
    onDone(song);
  }
  return (
    <Card title={x(initial ? 'editSong' : 'newSong')}>
      <label className="field">{x('songTitle')}
        <input value={title} onChange={(e) => { setTitle(e.target.value); setError(false); }} aria-invalid={error} autoFocus={!initial} />
      </label>
      {error && <p className="small" role="alert">{x('needTitle')}</p>}
      <DeitySelect value={d} onChange={setD} />
      <label className="field">{x('songText')}
        <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <p className="tiny muted" style={{ marginTop: 0 }}>{x('songTextHint')}</p>
      <label className="field">{x('source')}
        <input value={source} onChange={(e) => setSource(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn primary" onClick={save}>{x('save')}</button>
        <button className="btn ghost" onClick={() => onDone()}>{x('cancel')}</button>
      </div>
      <p className="tiny muted">🔒 {x('ownNote')}</p>
    </Card>
  );
}

export function MyPoojaForm({ initial, onDone }: { initial?: MyPooja; onDone: (saved?: MyPooja) => void }) {
  const { x } = useText(MINE_TEXT);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [deity, setDeity] = useState(initial?.deity ?? '');
  const [when, setWhen] = useState(initial?.when ?? '');
  const [samagri, setSamagri] = useState((initial?.samagri ?? []).join('\n'));
  const [steps, setSteps] = useState(initial?.steps.length ? initial.steps : [{ title: '', text: '' }]);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState(false);
  const setStep = (i: number, patch: Partial<MyPooja['steps'][number]>) => setSteps((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  function save() {
    if (!title.trim()) { setError(true); return; }
    const now = new Date().toISOString();
    const pooja: MyPooja = {
      id: initial?.id ?? `my-${uid()}`, title: title.trim(), deity, when: when.trim() || undefined, samagri: lines(samagri),
      steps: steps.map((s) => ({ title: s.title.trim(), text: s.text.trim() })).filter((s) => s.title || s.text),
      notes: notes.trim() || undefined, createdAt: initial?.createdAt ?? now, updatedAt: now,
    };
    saveMine('myPoojas', pooja);
    onDone(pooja);
  }
  return (
    <Card title={x(initial ? 'editPooja' : 'newPooja')}>
      <label className="field">{x('poojaTitle')}
        <input value={title} onChange={(e) => { setTitle(e.target.value); setError(false); }} aria-invalid={error} autoFocus={!initial} />
      </label>
      {error && <p className="small" role="alert">{x('needTitle')}</p>}
      <DeitySelect value={deity} onChange={setDeity} optional />
      <label className="field">{x('when')}
        <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder={x('whenPh')} />
      </label>
      <label className="field">{x('samagri')}
        <textarea rows={5} value={samagri} onChange={(e) => setSamagri(e.target.value)} />
      </label>
      <p className="tiny muted" style={{ marginTop: 0 }}>{x('samagriHint')}</p>
      <h3 className="small">{x('steps')}</h3>
      {steps.map((s, i) => (
        <fieldset key={i} className="my-step">
          <legend className="small">{x('stepN', { n: i + 1 })}</legend>
          <input value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} placeholder={x('stepTitlePh')} aria-label={x('stepTitlePh')} />
          <textarea rows={3} value={s.text} onChange={(e) => setStep(i, { text: e.target.value })} placeholder={x('stepTextPh')} aria-label={x('stepTextPh')} />
          {steps.length > 1 && <button className="btn ghost small" onClick={() => setSteps((all) => all.filter((_, j) => j !== i))}>{x('removeStep')}</button>}
        </fieldset>
      ))}
      <button className="btn small" onClick={() => setSteps((all) => [...all, { title: '', text: '' }])}>{x('addStep')}</button>
      <label className="field">{x('notes')}
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="row">
        <button className="btn primary" onClick={save}>{x('save')}</button>
        <button className="btn ghost" onClick={() => onDone()}>{x('cancel')}</button>
      </div>
      <p className="tiny muted">🔒 {x('ownNote')}</p>
    </Card>
  );
}

/** One of the user's own poojas: when, what to keep ready, the steps and notes. */
export function MyPoojaView({ pooja, back }: { pooja: MyPooja; back: string }) {
  const { x } = useText(MINE_TEXT);
  const [editing, setEditing] = useState(false);
  const pic = SONG_DEITIES.find((d) => d.id === pooja.deity)?.image;
  if (editing) return <MyPoojaForm initial={pooja} onDone={() => setEditing(false)} />;
  const share = () => [
    `🪔 ${pooja.title}`, pooja.when ?? '',
    pooja.samagri.length ? `\n${x('samagri')}:\n${pooja.samagri.map((s) => `• ${s}`).join('\n')}` : '',
    pooja.steps.length ? `\n${x('steps')}:\n${pooja.steps.map((s, i) => `${i + 1}. ${[s.title, s.text].filter(Boolean).join(' — ')}`).join('\n')}` : '',
    pooja.notes ? `\n${pooja.notes}` : '', '\n— Sanathani',
  ].filter(Boolean).join('\n');
  return (
    <>
      <button className="btn ghost" onClick={() => go({ tab: 'pooja' })}>← {back}</button>
      <Card className="hero">
        <div className="pooja-hero">
          {pic && <DeityPic id={pic} className="hero-pic" />}
          <div className="grow">
            <h2 style={{ margin: 0 }}>{pooja.title}</h2>
            <div className="small muted">{x('yours')}{pooja.when ? ` · ${pooja.when}` : ''}</div>
          </div>
        </div>
      </Card>
      {pooja.samagri.length > 0 && (
        <Card title={x('samagri')}>
          <ul className="my-samagri">{pooja.samagri.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Card>
      )}
      {pooja.steps.length > 0 && (
        <Card title={x('steps')}>
          <ol className="my-steps">
            {pooja.steps.map((s, i) => <li key={i}>{s.title && <strong>{s.title}</strong>}{s.text && <p style={{ whiteSpace: 'pre-line' }}>{s.text}</p>}</li>)}
          </ol>
        </Card>
      )}
      {pooja.notes && <Card title={x('notes')}><p style={{ whiteSpace: 'pre-line', margin: 0 }}>{pooja.notes}</p></Card>}
      <MineActions name={pooja.title} share={share} onEdit={() => setEditing(true)} onDelete={() => { deleteMine('myPoojas', pooja.id); go({ tab: 'pooja' }); }} />
    </>
  );
}

/** "Your poojas" on the pooja list: the user's own, and the button to add one. */
export function MyPoojasCard() {
  const { x } = useText(MINE_TEXT);
  const mine = useMyPoojas();
  return (
    <Card title={x('myPoojas')}>
      {mine.length ? (
        <ul className="stotra-list">
          {mine.map((p) => {
            const pic = SONG_DEITIES.find((d) => d.id === p.deity)?.image;
            return (
              <li key={p.id}>
                <button onClick={() => go({ tab: 'pooja', id: p.id })}>
                  {pic ? <DeityPic id={pic} className="stotra-pic" /> : <span className="stotra-pic my-pic" aria-hidden="true">🪔</span>}
                  <span className="grow"><strong>{p.title}</strong>{p.when && <span className="small muted">{p.when}</span>}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : <p className="small muted" style={{ marginTop: 0 }}>{x('myPoojasIntro')}</p>}
      <button className="btn" onClick={() => go({ tab: 'pooja', id: 'new' })}>{x('addPooja')}</button>
    </Card>
  );
}
