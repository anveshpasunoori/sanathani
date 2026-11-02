// End-to-end check of the groups security rules against a local Supabase (supabase start).
// Creates four test devotees and walks through creating, finding, joining, events, chat, private messages,
// blocking and reporting — asserting what each person may and may not do. Run: node scripts/test-groups.mjs
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(execSync('supabase status -o env', { encoding: 'utf8' }).split('\n').filter((l) => l.includes('=')).map((l) => {
  const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
}));
const URL = env.API_URL, ANON = env.ANON_KEY, SERVICE = env.SERVICE_ROLE_KEY;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
let failures = 0;
const ok = (cond, what) => { console.log(`${cond ? '✓' : '✗'} ${what}`); if (!cond) failures++; };
const err = async (p) => (await p).error;
const fails = async (p, what) => { const r = await p; ok(!!r.error || (Array.isArray(r.data) && r.data.length === 0 && r.status !== 201) || r.data === null, what); return r; };

async function user(name) {
  const email = `${name}.${Date.now()}@test.local`, password = 'test-password-123';
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return { c, id: s.data.user.id, name };
}

const [A, B, C, D] = await Promise.all(['ravi', 'suresh', 'kumar', 'stranger'].map(user));

// A creates a listed group near Edison, NJ.
const g = (await A.c.rpc('create_group', { p_name: 'Edison Mandali', p_about: 'Mandala 2026', p_area: 'Edison, NJ', p_lat: 40.5187, p_lon: -74.4121, p_listed: true, p_display_name: 'Ravi Swami' })).data;
ok(g?.id && Math.abs(g.approx_lat - 40.5) < 0.0001, 'guruswami creates a group; its location is rounded (~5 km)');

// B finds it nearby — name, area, distance and size only.
const near = (await B.c.rpc('nearby_groups', { p_lat: 40.55, p_lon: -74.35, p_km: 50 })).data ?? [];
const found = near.find((x) => x.id === g.id);
ok(found && found.members === 1 && !('approx_lat' in found) && !('invite_code' in found), 'a nearby swami finds the listed group without coordinates or invite code');
ok(!(await createClient(URL, ANON).rpc('nearby_groups', { p_lat: 40.55, p_lon: -74.35 })).data?.length, 'not signed in: nearby search returns nothing');

// B asks to join; A approves.
ok(!(await B.c.from('join_requests').insert({ group_id: g.id, user_id: B.id, display_name: 'Suresh', note: 'From Edison' })).error, 'swami asks to join');
ok(((await A.c.from('join_requests').select('*').eq('group_id', g.id)).data ?? []).length === 1, 'guruswami sees the request');
ok(((await C.c.from('join_requests').select('*').eq('group_id', g.id)).data ?? []).length === 0, 'others do not see the request');
await fails(B.c.rpc('approve_request', { p_group: g.id, p_user: B.id }), 'the asker cannot approve themselves');
ok(!(await A.c.rpc('approve_request', { p_group: g.id, p_user: B.id })).error, 'guruswami approves');

// C joins with the invite code (read by A, the member).
const code = (await A.c.from('groups').select('invite_code').eq('id', g.id).single()).data.invite_code;
ok(!(await C.c.rpc('join_by_code', { p_code: code.toUpperCase(), p_display_name: 'Kumar' })).error, 'joining with the invite code works (any case)');
await fails(D.c.rpc('join_by_code', { p_code: 'nope', p_display_name: 'X' }), 'a wrong code does not join');

// Outsiders see nothing.
ok(((await D.c.from('groups').select('*').eq('id', g.id)).data ?? []).length === 0, 'a stranger cannot read the group');
ok(((await D.c.from('group_members').select('*').eq('group_id', g.id)).data ?? []).length === 0, 'a stranger cannot read the members');

// Events: a member adds, members read, strangers do not.
ok(!(await err(B.c.from('group_events').insert({ group_id: g.id, title: 'Irumudi kattu', starts_at: new Date(Date.now() + 86400000).toISOString(), created_by: B.id }))), 'a member adds an event');
ok(((await C.c.from('group_events').select('*').eq('group_id', g.id)).data ?? []).length === 1, 'another member sees the event');
ok(((await D.c.from('group_events').select('*').eq('group_id', g.id)).data ?? []).length === 0, 'a stranger does not see the event');
await fails(D.c.from('group_events').insert({ group_id: g.id, title: 'Spam', starts_at: new Date().toISOString(), created_by: D.id }), 'a stranger cannot add events');

// Chat and announcements.
ok(!(await err(B.c.from('messages').insert({ group_id: g.id, body: 'Swamiye Saranam!', from_user: B.id }))), 'a member writes in the group chat');
ok(((await C.c.from('messages').select('*').eq('group_id', g.id)).data ?? []).length === 1, 'members read the chat');
ok(((await D.c.from('messages').select('*').eq('group_id', g.id)).data ?? []).length === 0, 'a stranger cannot read the chat');
await fails(B.c.from('messages').insert({ group_id: g.id, body: 'x', announcement: true, from_user: B.id }), 'only a guruswami sends announcements');
ok(!(await err(A.c.from('messages').insert({ group_id: g.id, body: 'Bhajan at 6', announcement: true, from_user: A.id }))), 'the guruswami sends an announcement');
await fails(B.c.from('messages').insert({ group_id: g.id, body: 'x', from_user: C.id }), 'nobody can write as someone else');

// Private messages: only between people who share a group.
ok(!(await err(B.c.from('messages').insert({ to_user: C.id, body: 'Hi Kumar', from_user: B.id }))), 'private message between fellow members');
ok(((await C.c.from('messages').select('*').eq('to_user', C.id)).data ?? []).length === 1, 'the recipient reads it');
ok(((await A.c.from('messages').select('*').eq('to_user', C.id)).data ?? []).length === 0, 'others cannot read it');
await fails(D.c.from('messages').insert({ to_user: B.id, body: 'hello', from_user: D.id }), 'a stranger cannot message a member privately');

// Blocking stops private messages both ways.
ok(!(await err(C.c.from('blocks').insert({ blocker: C.id, blocked: B.id }))), 'a member blocks another');
await fails(B.c.from('messages').insert({ to_user: C.id, body: 'again', from_user: B.id }), 'the blocked person cannot message privately');
await fails(C.c.from('messages').insert({ to_user: B.id, body: 'hi', from_user: C.id }), 'nor can the person who blocked');
ok(((await B.c.from('blocks').select('*')).data ?? []).length === 0, 'blocks are private to the person who made them');

// Roles and invite codes cannot be changed by plain updates.
await fails(B.c.from('group_members').update({ role: 'guruswami' }).eq('group_id', g.id).eq('user_id', B.id), 'a member cannot make themselves guruswami');
await fails(B.c.from('groups').update({ invite_code: 'mine' }).eq('id', g.id), 'the invite code cannot be overwritten');
const renamed = await B.c.from('group_members').update({ display_name: 'Suresh Swami' }).eq('group_id', g.id).eq('user_id', B.id).select();
ok(!renamed.error && renamed.data?.length === 1, 'a member renames themselves');
await fails(B.c.from('groups').update({ name: 'Taken over' }).eq('id', g.id).select(), 'a member cannot rename the group');

// Reports are filed but not readable by users.
ok(!(await err(C.c.from('reports').insert({ reporter: C.id, target_user: B.id, group_id: g.id, reason: 'test' }))), 'a report is filed');
ok(((await C.c.from('reports').select('*')).data ?? []).length === 0, 'reports are not readable in the app');

// Leaving, and the guruswami deleting the group.
ok(!(await C.c.from('group_members').delete().eq('group_id', g.id).eq('user_id', C.id)).error, 'a member leaves');
ok(((await C.c.from('group_events').select('*').eq('group_id', g.id)).data ?? []).length === 0, 'after leaving, events are no longer visible');
await fails(B.c.from('groups').delete().eq('id', g.id).select(), 'a member cannot delete the group');
ok(!(await A.c.from('groups').delete().eq('id', g.id)).error, 'the guruswami deletes the group');

// Clean up the test users.
await Promise.all([A, B, C, D].map((u) => admin.auth.admin.deleteUser(u.id)));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
