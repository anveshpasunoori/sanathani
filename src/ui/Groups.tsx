import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as api from '../groups/api';
import { refreshGroupEvents } from '../groups/cache';
import { shareText } from '../data/shopping';
import { useStore } from '../data/store';
import { LOCALE, useText } from '../i18n';
import { GROUPS_TEXT, type GroupsKey } from '../locales/groups';
import { useAccount } from '../sync/sync';
import { SignInForm } from './Account';
import { Card } from './components';
import { go } from './router';

// Deeksha groups: a guruswami creates a group and invites by code or link; listed groups can be found
// nearby (rough area only) and joined on approval. Members share events (each phone reminds its owner),
// talk in the group chat, and message fellow members privately — with block and report everywhere.
// Who may see and do what is enforced by the server (supabase/migrations/0003_groups.sql).

type X = (k: GroupsKey, v?: Record<string, string | number>) => string;

/** Loads data for a screen, with a way to reload after a change. */
function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): { data?: T; error?: string; reload: () => void } {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  const [n, setN] = useState(0);
  useEffect(() => {
    let on = true;
    fn().then((data) => on && setState({ data }), (e) => on && setState({ error: (e as Error).message }));
    return () => { on = false; };
  }, [...deps, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: useCallback(() => setN((v) => v + 1), []) };
}

/** Runs an action, showing its error; reloads (and refreshes reminders) after it succeeds. */
function useAction(x: X) {
  const [error, setError] = useState('');
  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    setError('');
    try { await fn(); after?.(); refreshGroupEvents(); } catch (e) { setError(x('error', { msg: (e as Error).message })); }
  };
  return { run, error: error ? <p className="small" role="alert">{error}</p> : null };
}

const inviteLink = (code: string) => `${location.origin}${location.pathname}#groups/join/${code}`;

export function GroupsScreen({ id, sub }: { id?: string; sub?: string }) {
  const { x } = useText(GROUPS_TEXT);
  const acc = useAccount();
  if (acc.status === 'disabled') return <Card title={x('groups')}><p>{x('intro')}</p><div className="note info small">{x('notSetUp')}</div></Card>;
  if (acc.status !== 'signed-in') return (
    <Card title={x('groups')}>
      <p style={{ marginTop: 0 }}>{x('intro')}</p>
      <p className="small muted">{x('signInFirst')}</p>
      <SignInForm compact />
    </Card>
  );
  const me = acc.user!.id;
  const myName = acc.user?.name ?? acc.user?.email?.split('@')[0] ?? '';
  if (id === 'new') return <CreateGroup myName={myName} />;
  if (id === 'join') return <JoinByCode code={sub} myName={myName} />;
  if (id === 'dm' && sub) return <DirectMessages other={sub} me={me} />;
  if (id === 'messages') return <Conversations me={me} />;
  if (id) return <GroupPage id={id} tab={sub ?? 'events'} me={me} />;
  return <GroupsHome myName={myName} />;
}

function Back({ to, label }: { to: Parameters<typeof go>[0]; label: string }) {
  return <button className="btn ghost" onClick={() => go(to)}>← {label}</button>;
}

function GroupsHome({ myName }: { myName: string }) {
  const { x } = useText(GROUPS_TEXT);
  const place = useStore((s) => s.settings.place);
  const [km, setKm] = useState(50);
  const mine = useLoad(api.myGroups, []);
  const near = useLoad(() => api.nearbyGroups(place.lat, place.lon, km), [place.lat, place.lon, km]);
  const [asking, setAsking] = useState<string>();
  return (
    <>
      <Card className="hero">
        <h2 style={{ margin: 0 }}>👥 {x('groups')}</h2>
        <p className="small muted">{x('intro')}</p>
        <div className="row">
          <button className="btn primary" onClick={() => go({ tab: 'groups', id: 'new' })}>{x('create')}</button>
          <button className="btn" onClick={() => go({ tab: 'groups', id: 'join' })}>{x('join')}</button>
          <button className="btn ghost" onClick={() => go({ tab: 'groups', id: 'messages' })}>✉️ {x('privateMessages')}</button>
        </div>
      </Card>
      <Card title={x('myGroups')}>
        {mine.error && <p className="small" role="alert">{x('error', { msg: mine.error })}</p>}
        {mine.data?.length ? (
          <ul className="list">
            {mine.data.map((g) => (
              <li key={g.id}><button className="item" onClick={() => go({ tab: 'groups', id: g.id })}>
                <span className="grow"><strong>{g.name}</strong><span className="small muted"> {g.area_name ?? ''}{g.role === 'guruswami' ? ` · ${x('guruswami')}` : ''}</span></span>
                <span aria-hidden="true">→</span>
              </button></li>
            ))}
          </ul>
        ) : mine.data && <p className="small muted" style={{ margin: 0 }}>{x('noGroups')}</p>}
      </Card>
      <Card title={x('nearby')} action={
        <select value={km} onChange={(e) => setKm(Number(e.target.value))} aria-label={x('within', { km, place: place.name })} style={{ width: 'auto' }}>
          {[10, 25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} km</option>)}
        </select>}>
        <p className="small muted" style={{ marginTop: 0 }}>{x('within', { km, place: place.name })} · {x('nearbyNote')}</p>
        {near.data?.length ? (
          <ul className="list">
            {near.data.map((g) => (
              <li key={g.id} className="stack" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="row">
                  <span className="grow"><strong>{g.name}</strong><br /><span className="small muted">{g.area_name ?? ''} · {x('km', { n: Math.max(1, g.distance_km) })} · {g.members === 1 ? x('oneMember') : x('members', { n: g.members })}</span></span>
                  {g.is_member ? <button className="btn small" onClick={() => go({ tab: 'groups', id: g.id })}>{x('open')}</button>
                    : g.requested ? <span className="small muted">{x('requested')}</span>
                    : <button className="btn small primary" onClick={() => setAsking(asking === g.id ? undefined : g.id)}>{x('askToJoin')}</button>}
                </div>
                {g.about && <p className="small" style={{ margin: '4px 0 0' }}>{g.about}</p>}
                {asking === g.id && <AskToJoin groupId={g.id} myName={myName} onDone={() => { setAsking(undefined); near.reload(); }} />}
              </li>
            ))}
          </ul>
        ) : near.data && <p className="small muted" style={{ margin: 0 }}>{x('noneNearby')}</p>}
      </Card>
      <p className="tiny muted">{x('conduct')}</p>
    </>
  );
}

function AskToJoin({ groupId, myName, onDone }: { groupId: string; myName: string; onDone: () => void }) {
  const { x } = useText(GROUPS_TEXT);
  const [name, setName] = useState(myName);
  const [note, setNote] = useState('');
  const { run, error } = useAction(x);
  return (
    <div className="stack" style={{ marginTop: 8 }}>
      <label className="field">{x('yourName')}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={x('yourNamePh')} /></label>
      <label className="field">{x('joinNote')}<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <button className="btn primary small" disabled={!name.trim()} onClick={() => run(() => api.requestJoin(groupId, name.trim(), note.trim()), onDone)}>{x('askToJoin')}</button>
      {error}
    </div>
  );
}

function CreateGroup({ myName }: { myName: string }) {
  const { x } = useText(GROUPS_TEXT);
  const place = useStore((s) => s.settings.place);
  const [f, setF] = useState({ name: '', about: '', area: place.name, listed: true, displayName: myName });
  const { run, error } = useAction(x);
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }));
  return (
    <>
      <Back to={{ tab: 'groups' }} label={x('back')} />
      <Card title={x('create')}>
        <label className="field">{x('name')}<input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={x('namePh')} autoFocus /></label>
        <label className="field">{x('about')}<textarea rows={3} value={f.about} onChange={(e) => set({ about: e.target.value })} /></label>
        <label className="field">{x('area')}<input value={f.area} onChange={(e) => set({ area: e.target.value })} /></label>
        <label className="radio"><input type="checkbox" checked={f.listed} onChange={(e) => set({ listed: e.target.checked })} /> {x('listed')}</label>
        <label className="field">{x('yourName')}<input value={f.displayName} onChange={(e) => set({ displayName: e.target.value })} placeholder={x('yourNamePh')} /></label>
        <div className="row">
          <button className="btn primary" disabled={f.name.trim().length < 2 || !f.displayName.trim()} onClick={() => run(async () => {
            const g = await api.createGroup({ ...f, name: f.name.trim(), displayName: f.displayName.trim(), lat: place.lat, lon: place.lon });
            go({ tab: 'groups', id: g.id });
          })}>{x('save')}</button>
          <button className="btn ghost" onClick={() => go({ tab: 'groups' })}>{x('cancel')}</button>
        </div>
        {error}
        <p className="tiny muted">{x('nearbyNote')}</p>
      </Card>
    </>
  );
}

function JoinByCode({ code: initial, myName }: { code?: string; myName: string }) {
  const { x } = useText(GROUPS_TEXT);
  const [code, setCode] = useState(initial ?? '');
  const [name, setName] = useState(myName);
  const { run, error } = useAction(x);
  return (
    <>
      <Back to={{ tab: 'groups' }} label={x('back')} />
      <Card title={x('join')}>
        <label className="field">{x('code')}<input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="none" /></label>
        <label className="field">{x('yourName')}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={x('yourNamePh')} /></label>
        <button className="btn primary" disabled={!code.trim() || !name.trim()} onClick={() => run(async () => {
          const gid = await api.joinByCode(code.trim(), name.trim());
          go({ tab: 'groups', id: gid });
        })}>{x('join')}</button>
        {error}
      </Card>
    </>
  );
}

function GroupPage({ id, tab, me }: { id: string; tab: string; me: string }) {
  const { x } = useText(GROUPS_TEXT);
  const group = useLoad(() => api.getGroup(id), [id]);
  const people = useLoad(() => api.members(id), [id]);
  const blocks = useLoad(api.myBlocks, []);
  const mine = people.data?.find((m) => m.user_id === me);
  const isGuru = mine?.role === 'guruswami';
  const requests = useLoad(() => (isGuru ? api.joinRequests(id) : Promise.resolve([])), [id, isGuru]);
  const names = useMemo(() => new Map((people.data ?? []).map((m) => [m.user_id, m.display_name])), [people.data]);
  const g = group.data;
  if (group.error) return <><Back to={{ tab: 'groups' }} label={x('back')} /><p role="alert">{x('error', { msg: group.error })}</p></>;
  if (!g) return <Back to={{ tab: 'groups' }} label={x('back')} />;
  const tabs: Array<[string, string]> = [['events', x('events')], ['chat', x('chat')], ['members', x('membersTab')]];
  if (isGuru && requests.data?.length) tabs.push(['requests', x('requests', { n: requests.data.length })]);
  return (
    <>
      <Back to={{ tab: 'groups' }} label={x('back')} />
      <Card className="hero">
        <h2 style={{ margin: 0 }}>{g.name}</h2>
        <div className="small muted">{[g.area_name, people.data && (people.data.length === 1 ? x('oneMember') : x('members', { n: people.data.length }))].filter(Boolean).join(' · ')}</div>
        {g.about && <p className="small" style={{ marginBottom: 0 }}>{g.about}</p>}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn small" onClick={() => shareText(g.name, x('inviteText', { name: g.name, link: inviteLink(g.invite_code), code: g.invite_code }))}>📤 {x('invite')}</button>
          <span className="small muted">{x('code')}: <strong>{g.invite_code}</strong></span>
        </div>
      </Card>
      <div className="segmented" role="tablist">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-pressed={tab === k} onClick={() => go({ tab: 'groups', id, sub: k })}>{label}</button>)}
      </div>
      {tab === 'events' && <GroupEvents groupId={id} me={me} isGuru={isGuru} names={names} />}
      {tab === 'chat' && <Chat groupId={id} me={me} isGuru={isGuru} names={names} blocked={blocks.data ?? new Set()} />}
      {tab === 'members' && <Members groupId={id} me={me} isGuru={isGuru} people={people.data ?? []} blocked={blocks.data ?? new Set()} reload={() => { people.reload(); blocks.reload(); }} group={g} />}
      {tab === 'requests' && <Requests groupId={id} list={requests.data ?? []} reload={() => { requests.reload(); people.reload(); }} />}
    </>
  );
}

function GroupEvents({ groupId, me, isGuru, names }: { groupId: string; me: string; isGuru: boolean; names: Map<string, string> }) {
  const { x, lang } = useText(GROUPS_TEXT);
  const events = useLoad(() => api.groupEvents(groupId), [groupId]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: '', when: '', place: '', notes: '', remind: 60 });
  const { run, error } = useAction(x);
  const loc = LOCALE[lang];
  return (
    <Card title={x('events')} action={!adding && <button className="btn small primary" onClick={() => setAdding(true)}>+ {x('addEvent')}</button>}>
      {adding && (
        <div className="stack" style={{ marginBottom: 12 }}>
          <label className="field">{x('eventTitle')}<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={x('eventTitlePh')} autoFocus /></label>
          <label className="field">{x('when')}<input type="datetime-local" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></label>
          <label className="field">{x('place')}<input value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} /></label>
          <label className="field">{x('notes')}<textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          <label className="field">{x('remind')}
            <select value={f.remind} onChange={(e) => setF({ ...f, remind: Number(e.target.value) })}>
              {([[30, 'r30'], [60, 'r60'], [180, 'r180'], [1440, 'r1440']] as const).map(([m, k]) => <option key={m} value={m}>{x(k)}</option>)}
            </select>
          </label>
          <div className="row">
            <button className="btn primary" disabled={!f.title.trim() || !f.when} onClick={() => run(() => api.addEvent({ group_id: groupId, title: f.title.trim(), notes: f.notes.trim() || null, place_name: f.place.trim() || null, starts_at: new Date(f.when).toISOString(), remind_minutes: f.remind }), () => { setAdding(false); setF({ title: '', when: '', place: '', notes: '', remind: 60 }); events.reload(); })}>{x('save')}</button>
            <button className="btn ghost" onClick={() => setAdding(false)}>{x('cancel')}</button>
          </div>
        </div>
      )}
      {error}
      {events.data?.length ? (
        <ul className="list">
          {events.data.map((e) => (
            <li key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="row">
                <span className="grow">
                  <strong>{e.title}</strong><br />
                  <span className="small">{new Date(e.starts_at).toLocaleString(loc, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{e.place_name ? ` · ${e.place_name}` : ''}</span><br />
                  <span className="tiny muted">{x('addedBy', { name: e.created_by === me ? x('you') : names.get(e.created_by) ?? '' })}</span>
                </span>
                {(e.created_by === me || isGuru) && <button className="btn ghost small" onClick={() => { if (confirm(x('confirmDelete'))) run(() => api.deleteEvent(e.id), events.reload); }}>{x('delete')}</button>}
              </div>
              {e.notes && <p className="small" style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{e.notes}</p>}
            </li>
          ))}
        </ul>
      ) : events.data && !adding && <p className="small muted" style={{ margin: 0 }}>{x('noEvents')}</p>}
    </Card>
  );
}

/** A message thread (group chat or private), live while open. */
function Thread({ load, subscribe, send, me, names, blocked, canAnnounce, onReport, onDelete, canDelete }: {
  load: () => Promise<api.Message[]>; subscribe: (cb: (m: api.Message) => void) => () => void; send: (body: string, announcement: boolean) => Promise<void>;
  me: string; names: Map<string, string>; blocked: Set<string>; canAnnounce?: boolean;
  onReport: (m: api.Message) => void; onDelete: (m: api.Message) => Promise<void>; canDelete: (m: api.Message) => boolean;
}) {
  const { x, lang } = useText(GROUPS_TEXT);
  const [list, setList] = useState<api.Message[]>([]);
  const [body, setBody] = useState('');
  const [announce, setAnnounce] = useState(false);
  const { run, error } = useAction(x);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let on = true;
    load().then((l) => on && setList(l));
    const off = subscribe((m) => setList((l) => (l.some((y) => y.id === m.id) ? l : [...l, m])));
    return () => { on = false; off(); };
  }, [load, subscribe]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [list.length]);
  const loc = LOCALE[lang];
  const shown = list.filter((m) => !blocked.has(m.from_user));
  return (
    <Card>
      <div className="thread">
        {shown.length === 0 && <p className="small muted">{x('noMessages')}</p>}
        {shown.map((m) => (
          <div key={m.id} className={`msg ${m.from_user === me ? 'mine' : ''} ${m.announcement ? 'announce' : ''}`}>
            <div className="tiny muted">{m.from_user === me ? x('you') : names.get(m.from_user) ?? ''} · {new Date(m.created_at).toLocaleString(loc, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{m.announcement ? ` · 📣 ${x('announcement')}` : ''}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
            <div className="msg-actions">
              {m.from_user !== me && <button className="linklike tiny" onClick={() => onReport(m)}>{x('report')}</button>}
              {canDelete(m) && <button className="linklike tiny" onClick={() => { if (confirm(x('confirmDelete'))) run(async () => { await onDelete(m); setList((l) => l.filter((y) => y.id !== m.id)); }); }}>{x('delete')}</button>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="row" style={{ marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); const b = body.trim(); if (!b) return; run(async () => { await send(b, announce); setBody(''); setAnnounce(false); setList(await load()); }); }}>
        <input className="grow" value={body} onChange={(e) => setBody(e.target.value)} placeholder={x('messagePh')} maxLength={2000} aria-label={x('messagePh')} />
        <button className="btn primary" type="submit" disabled={!body.trim()}>{x('send')}</button>
      </form>
      {canAnnounce && <label className="radio small"><input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} /> 📣 {x('announce')}</label>}
      {error}
    </Card>
  );
}

function useReport(x: X) {
  const [done, setDone] = useState(false);
  const report = async (p: { userId?: string; messageId?: string; groupId?: string }) => {
    const reason = prompt(x('reportPh'));
    if (reason === null) return;
    await api.report({ ...p, reason });
    setDone(true);
  };
  return { report, note: done ? <p className="small note good" role="status">{x('reported')}</p> : null };
}

function Chat({ groupId, me, isGuru, names, blocked }: { groupId: string; me: string; isGuru: boolean; names: Map<string, string>; blocked: Set<string> }) {
  const { x } = useText(GROUPS_TEXT);
  const { report, note } = useReport(x);
  const load = useCallback(() => api.groupMessages(groupId), [groupId]);
  const subscribe = useCallback((cb: (m: api.Message) => void) => api.onMessages({ groupId }, cb), [groupId]);
  return (
    <>
      {note}
      <Thread load={load} subscribe={subscribe} send={(b, a) => api.sendToGroup(groupId, b, a)} me={me} names={names} blocked={blocked} canAnnounce={isGuru}
        onReport={(m) => report({ userId: m.from_user, messageId: m.id, groupId })} onDelete={(m) => api.deleteMessage(m.id)} canDelete={(m) => m.from_user === me || isGuru} />
      <p className="tiny muted">{x('conduct')}</p>
    </>
  );
}

function Members({ groupId, me, isGuru, people, blocked, reload, group }: { groupId: string; me: string; isGuru: boolean; people: api.Member[]; blocked: Set<string>; reload: () => void; group: api.Group }) {
  const { x } = useText(GROUPS_TEXT);
  const { run, error } = useAction(x);
  const { report, note } = useReport(x);
  const [open, setOpen] = useState<string>();
  return (
    <Card title={x('membersTab')}>
      {note}
      <ul className="list">
        {people.map((m) => (
          <li key={m.user_id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <button className="item" onClick={() => setOpen(open === m.user_id ? undefined : m.user_id)} disabled={m.user_id === me}>
              <span className="grow"><strong>{m.display_name}</strong>{m.user_id === me && <span className="small muted"> ({x('you')})</span>}{m.role === 'guruswami' && <span className="badge"> {x('guruswami')}</span>}{blocked.has(m.user_id) && <span className="small muted"> · {x('block')}</span>}</span>
            </button>
            {open === m.user_id && (
              <div className="row" style={{ marginTop: 6 }}>
                {!blocked.has(m.user_id) && <button className="btn small primary" onClick={() => go({ tab: 'groups', id: 'dm', sub: m.user_id })}>✉️ {x('message')}</button>}
                {blocked.has(m.user_id)
                  ? <button className="btn small" onClick={() => run(() => api.unblock(m.user_id), reload)}>{x('unblock')}</button>
                  : <button className="btn small" onClick={() => { if (confirm(x('confirmBlock', { name: m.display_name }))) run(() => api.block(m.user_id), reload); }}>{x('block')}</button>}
                <button className="btn small" onClick={() => report({ userId: m.user_id, groupId })}>{x('report')}</button>
                {isGuru && m.role !== 'guruswami' && <button className="btn small" onClick={() => run(() => api.makeGuruswami(groupId, m.user_id), reload)}>{x('makeGuru')}</button>}
                {isGuru && <button className="btn small danger" onClick={() => { if (confirm(x('confirmRemove', { name: m.display_name }))) run(() => api.removeMember(groupId, m.user_id), reload); }}>{x('remove')}</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
      {error}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn ghost small" onClick={() => { if (confirm(x('confirmLeave'))) run(() => api.leaveGroup(groupId), () => go({ tab: 'groups' })); }}>{x('leave')}</button>
        {isGuru && <button className="btn ghost small" onClick={() => { if (confirm(x('newCodeConfirm'))) run(() => api.newInviteCode(groupId), () => location.reload()); }}>{x('newCode')}</button>}
        {isGuru && <button className="btn danger small" onClick={() => { if (confirm(x('confirmDeleteGroup'))) run(() => api.deleteGroup(groupId), () => go({ tab: 'groups' })); }}>{x('deleteGroup')}</button>}
      </div>
      <p className="tiny muted">{x('privateNote')}{group.listed ? '' : ''}</p>
    </Card>
  );
}

function Requests({ groupId, list, reload }: { groupId: string; list: api.JoinRequest[]; reload: () => void }) {
  const { x } = useText(GROUPS_TEXT);
  const { run, error } = useAction(x);
  return (
    <Card title={x('requests', { n: list.length })}>
      <ul className="list">
        {list.map((r) => (
          <li key={r.user_id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="row">
              <span className="grow"><strong>{r.display_name}</strong>{r.note && <><br /><span className="small">{r.note}</span></>}</span>
              <button className="btn small primary" onClick={() => run(() => api.approveRequest(groupId, r.user_id), reload)}>{x('approve')}</button>
              <button className="btn small" onClick={() => run(() => api.declineRequest(groupId, r.user_id), reload)}>{x('decline')}</button>
            </div>
          </li>
        ))}
      </ul>
      {error}
    </Card>
  );
}

function DirectMessages({ other, me }: { other: string; me: string }) {
  const { x } = useText(GROUPS_TEXT);
  const people = useLoad(api.knownPeople, []);
  const blocks = useLoad(api.myBlocks, []);
  const { report, note } = useReport(x);
  const { run, error } = useAction(x);
  const load = useCallback(() => api.directMessages(other), [other]);
  const subscribe = useCallback((cb: (m: api.Message) => void) => api.onMessages({ toMe: me }, (m) => { if (m.from_user === other) cb(m); }), [me, other]);
  const name = people.data?.get(other) ?? '';
  const isBlocked = blocks.data?.has(other);
  const names = people.data ?? new Map();
  return (
    <>
      <Back to={{ tab: 'groups', id: 'messages' }} label={x('privateMessages')} />
      <Card className="hero">
        <h2 style={{ margin: 0 }}>✉️ {name}</h2>
        <div className="row" style={{ marginTop: 6 }}>
          {isBlocked
            ? <button className="btn small" onClick={() => run(() => api.unblock(other), blocks.reload)}>{x('unblock')}</button>
            : <button className="btn small" onClick={() => { if (confirm(x('confirmBlock', { name }))) run(() => api.block(other), blocks.reload); }}>{x('block')}</button>}
          <button className="btn small" onClick={() => report({ userId: other })}>{x('report')}</button>
        </div>
        {error}{note}
      </Card>
      {isBlocked ? <p className="note small">{x('blocked')}</p> : (
        <Thread load={load} subscribe={subscribe} send={(b) => api.sendDirect(other, b)} me={me} names={names} blocked={new Set()}
          onReport={(m) => report({ userId: m.from_user, messageId: m.id })} onDelete={(m) => api.deleteMessage(m.id)} canDelete={(m) => m.from_user === me} />
      )}
      <p className="tiny muted">{x('privateNote')}</p>
    </>
  );
}

function Conversations({ me }: { me: string }) {
  const { x, lang } = useText(GROUPS_TEXT);
  const list = useLoad(api.conversations, []);
  const people = useLoad(api.knownPeople, []);
  const loc = LOCALE[lang];
  return (
    <>
      <Back to={{ tab: 'groups' }} label={x('back')} />
      <Card title={x('privateMessages')}>
        {list.data?.length ? (
          <ul className="list">
            {list.data.map((c) => (
              <li key={c.user}><button className="item" onClick={() => go({ tab: 'groups', id: 'dm', sub: c.user })}>
                <span className="grow"><strong>{people.data?.get(c.user) ?? ''}</strong><br />
                  <span className="small muted">{c.last.from_user === me ? `${x('you')}: ` : ''}{c.last.body.slice(0, 80)} · {new Date(c.last.created_at).toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</span></span>
                <span aria-hidden="true">→</span>
              </button></li>
            ))}
          </ul>
        ) : list.data && <p className="small muted" style={{ margin: 0 }}>{x('noConversations')}</p>}
        <p className="tiny muted">{x('privateNote')}</p>
      </Card>
    </>
  );
}

export function GroupsEntry(): ReactNode {
  const { x } = useText(GROUPS_TEXT);
  return <button className="btn" onClick={() => go({ tab: 'groups' })}>👥 {x('groups')}</button>;
}
