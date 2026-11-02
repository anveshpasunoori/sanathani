// Groups for devotees keeping a deeksha together: the calls to Supabase (tables and functions in
// supabase/migrations/0003_groups.sql, where Row Level Security decides who may see and do what).
// Everything here needs an account; the rest of the app works without one.
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../sync/supabase';

export interface Group { id: string; name: string; about: string | null; area_name: string | null; listed: boolean; invite_code: string; created_at: string }
export interface Member { group_id: string; user_id: string; role: 'guruswami' | 'member'; display_name: string; joined_at: string }
export interface MyGroup extends Group { role: Member['role']; display_name: string }
export interface GroupEvent { id: string; group_id: string; title: string; notes: string | null; place_name: string | null; starts_at: string; remind_minutes: number; created_by: string }
export interface Message { id: string; group_id: string | null; to_user: string | null; from_user: string; body: string; announcement: boolean; created_at: string }
export interface JoinRequest { group_id: string; user_id: string; display_name: string; note: string | null; created_at: string }
export interface NearbyGroup { id: string; name: string; about: string | null; area_name: string | null; distance_km: number; members: number; is_member: boolean; requested: boolean }

function db() {
  if (!supabase) throw new Error('Accounts are not set up in this build');
  return supabase;
}
async function uid(): Promise<string> {
  const { data } = await db().auth.getUser();
  if (!data.user) throw new Error('Sign in first');
  return data.user.id;
}
function check<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export async function myGroups(): Promise<MyGroup[]> {
  const me = await uid();
  const rows = check(await db().from('group_members').select('role, display_name, groups(*)').eq('user_id', me)) as unknown as Array<{ role: Member['role']; display_name: string; groups: Group }>;
  return rows.filter((r) => r.groups).map((r) => ({ ...r.groups, role: r.role, display_name: r.display_name })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGroup(id: string): Promise<Group | null> {
  return check(await db().from('groups').select('*').eq('id', id).maybeSingle()) as Group | null;
}

export async function createGroup(p: { name: string; about: string; area: string; lat: number; lon: number; listed: boolean; displayName: string }): Promise<Group> {
  return check(await db().rpc('create_group', { p_name: p.name, p_about: p.about || null, p_area: p.area || null, p_lat: p.lat, p_lon: p.lon, p_listed: p.listed, p_display_name: p.displayName })) as Group;
}
export async function updateGroup(id: string, patch: Partial<Pick<Group, 'name' | 'about' | 'area_name' | 'listed'>>) {
  check(await db().from('groups').update(patch).eq('id', id));
}
export async function deleteGroup(id: string) { check(await db().from('groups').delete().eq('id', id)); }
export async function newInviteCode(id: string): Promise<string> { return check(await db().rpc('new_invite_code', { p_group: id })) as string; }
export async function joinByCode(code: string, displayName: string): Promise<string> {
  return check(await db().rpc('join_by_code', { p_code: code, p_display_name: displayName })) as string;
}

export async function nearbyGroups(lat: number, lon: number, km: number): Promise<NearbyGroup[]> {
  return (check(await db().rpc('nearby_groups', { p_lat: lat, p_lon: lon, p_km: km })) ?? []) as NearbyGroup[];
}
export async function requestJoin(groupId: string, displayName: string, note: string) {
  check(await db().from('join_requests').insert({ group_id: groupId, user_id: await uid(), display_name: displayName, note: note || null }));
}
export async function joinRequests(groupId: string): Promise<JoinRequest[]> {
  return check(await db().from('join_requests').select('*').eq('group_id', groupId).order('created_at')) as JoinRequest[];
}
export async function approveRequest(groupId: string, userId: string) { check(await db().rpc('approve_request', { p_group: groupId, p_user: userId })); }
export async function declineRequest(groupId: string, userId: string) { check(await db().from('join_requests').delete().eq('group_id', groupId).eq('user_id', userId)); }

export async function members(groupId: string): Promise<Member[]> {
  return check(await db().from('group_members').select('*').eq('group_id', groupId).order('joined_at')) as Member[];
}
export async function removeMember(groupId: string, userId: string) { check(await db().from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)); }
export async function leaveGroup(groupId: string) { await removeMember(groupId, await uid()); }
export async function makeGuruswami(groupId: string, userId: string) { check(await db().rpc('make_guruswami', { p_group: groupId, p_user: userId })); }
export async function renameMe(groupId: string, displayName: string) {
  check(await db().from('group_members').update({ display_name: displayName }).eq('group_id', groupId).eq('user_id', await uid()));
}

export async function groupEvents(groupId?: string): Promise<GroupEvent[]> {
  let q = db().from('group_events').select('*').gte('starts_at', new Date(Date.now() - 86400000).toISOString()).order('starts_at');
  if (groupId) q = q.eq('group_id', groupId);
  return check(await q) as GroupEvent[];
}
export async function addEvent(e: Pick<GroupEvent, 'group_id' | 'title' | 'notes' | 'place_name' | 'starts_at' | 'remind_minutes'>) {
  check(await db().from('group_events').insert({ ...e, created_by: await uid() }));
}
export async function deleteEvent(id: string) { check(await db().from('group_events').delete().eq('id', id)); }

export async function groupMessages(groupId: string): Promise<Message[]> {
  const rows = check(await db().from('messages').select('*').eq('group_id', groupId).order('created_at', { ascending: false }).limit(200)) as Message[];
  return rows.reverse();
}
export async function directMessages(other: string): Promise<Message[]> {
  const me = await uid();
  const rows = check(await db().from('messages').select('*')
    .or(`and(from_user.eq.${me},to_user.eq.${other}),and(from_user.eq.${other},to_user.eq.${me})`)
    .order('created_at', { ascending: false }).limit(200)) as Message[];
  return rows.reverse();
}
/** People the reader has private messages with, newest first. */
export async function conversations(): Promise<Array<{ user: string; last: Message }>> {
  const me = await uid();
  const rows = check(await db().from('messages').select('*').not('to_user', 'is', null).order('created_at', { ascending: false }).limit(300)) as Message[];
  const seen = new Map<string, Message>();
  for (const m of rows) { const other = m.from_user === me ? m.to_user! : m.from_user; if (!seen.has(other)) seen.set(other, m); }
  return [...seen].map(([user, last]) => ({ user, last }));
}
export async function sendToGroup(groupId: string, body: string, announcement = false) {
  check(await db().from('messages').insert({ group_id: groupId, body, announcement, from_user: await uid() }));
}
export async function sendDirect(to: string, body: string) {
  check(await db().from('messages').insert({ to_user: to, body, from_user: await uid() }));
}
export async function deleteMessage(id: string) { check(await db().from('messages').delete().eq('id', id)); }

/** Names of everyone the reader shares a group with (for private messages), by user id. */
export async function knownPeople(): Promise<Map<string, string>> {
  const rows = check(await db().from('group_members').select('user_id, display_name')) as Array<{ user_id: string; display_name: string }>;
  return new Map(rows.map((r) => [r.user_id, r.display_name]));
}

export async function myBlocks(): Promise<Set<string>> {
  return new Set((check(await db().from('blocks').select('blocked')) as Array<{ blocked: string }>).map((r) => r.blocked));
}
export async function block(userId: string) { check(await db().from('blocks').insert({ blocker: await uid(), blocked: userId })); }
export async function unblock(userId: string) { check(await db().from('blocks').delete().eq('blocked', userId)); }
export async function report(p: { userId?: string; messageId?: string; groupId?: string; reason: string }) {
  check(await db().from('reports').insert({ reporter: await uid(), target_user: p.userId ?? null, message_id: p.messageId ?? null, group_id: p.groupId ?? null, reason: p.reason }));
}

/** Calls back on new messages (in a group, or private ones to the reader) while subscribed. */
export function onMessages(filter: { groupId?: string; toMe?: string }, cb: (m: Message) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const f = filter.groupId ? `group_id=eq.${filter.groupId}` : `to_user=eq.${filter.toMe}`;
  let ch: RealtimeChannel | undefined;
  let closed = false;
  // Hand the current session to the live connection first: right after signing in it may not have it yet,
  // and the server only sends rows the session is allowed to read.
  client.auth.getSession().then(({ data }) => {
    if (closed) return;
    if (data.session) client.realtime.setAuth(data.session.access_token);
    ch = client.channel(`messages:${f}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: f }, (p) => cb(p.new as Message))
      .subscribe();
  });
  return () => { closed = true; if (ch) client.removeChannel(ch); };
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  return (await supabase.auth.getUser()).data.user?.id ?? null;
}
