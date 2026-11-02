-- Sanathani: groups for devotees keeping a deeksha together (an Ayyappa mandala, a bhajan group…).
-- A guruswami creates a group and invites members by code; listed groups can be found by others nearby
-- (by rough area only) and joined on the guruswami's approval. Members share events (each member's phone
-- reminds them), talk in the group chat, and send private messages to people they share a group with.
-- Anyone can block another person (no private messages either way) and report a message or person.
-- Row Level Security on every table; changes that need checks across tables go through functions below.

create extension if not exists pgcrypto with schema extensions;

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  about       text check (char_length(about) <= 500),
  area_name   text check (char_length(area_name) <= 80),
  -- For "nearby groups": rounded to about 5 km, so no one's exact place is ever stored.
  approx_lat  double precision,
  approx_lon  double precision,
  listed      boolean not null default false,
  invite_code text not null unique default encode(extensions.gen_random_bytes(5), 'hex'),
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id     uuid not null references public.groups (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('guruswami', 'member')),
  display_name text not null check (char_length(display_name) between 1 and 60),
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.join_requests (
  group_id     uuid not null references public.groups (id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  note         text check (char_length(note) <= 300),
  created_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_events (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 120),
  notes          text check (char_length(notes) <= 1000),
  place_name     text check (char_length(place_name) <= 120),
  starts_at      timestamptz not null,
  remind_minutes integer not null default 60 check (remind_minutes between 0 and 10080),
  created_by     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now()
);

-- Group chat (group_id set) or a private message (to_user set) — never both.
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references public.groups (id) on delete cascade,
  to_user      uuid references auth.users (id) on delete cascade,
  from_user    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  announcement boolean not null default false,
  created_at   timestamptz not null default now(),
  check ((group_id is null) <> (to_user is null)),
  check (not announcement or group_id is not null)
);
create index messages_group_idx on public.messages (group_id, created_at);
create index messages_dm_idx on public.messages (to_user, from_user, created_at);

create table public.blocks (
  blocker    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

-- Reports are read by the app owner in the Supabase dashboard; users can only file them.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_user uuid references auth.users (id) on delete set null,
  message_id  uuid references public.messages (id) on delete set null,
  group_id    uuid references public.groups (id) on delete set null,
  reason      text check (char_length(reason) <= 500),
  created_at  timestamptz not null default now()
);

-- ---- Helpers (security definer, so policies can look across tables without recursion) ----

create function public.is_member(g uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid());
$$;

create function public.is_guruswami(g uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid() and role = 'guruswami');
$$;

create function public.is_listed(g uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = g and listed);
$$;

create function public.shares_group(other uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

create function public.blocked_between(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;

-- ---- Row Level Security ----

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.join_requests enable row level security;
alter table public.group_events  enable row level security;
alter table public.messages      enable row level security;
alter table public.blocks        enable row level security;
alter table public.reports       enable row level security;

-- Groups: members see their groups; the guruswami edits or deletes. Creating goes through create_group().
create policy "members read group"     on public.groups for select using (public.is_member(id));
create policy "guruswami edits group"  on public.groups for update using (public.is_guruswami(id)) with check (public.is_guruswami(id));
create policy "guruswami deletes group" on public.groups for delete using (public.is_guruswami(id));
-- The invite code, rough location and creator never change by a plain update.
revoke update on public.groups from authenticated;
grant update (name, about, area_name, listed) on public.groups to authenticated;

-- Members: visible to fellow members; anyone may leave, the guruswami may remove. Only the display name is
-- editable directly (roles change through make_guruswami()).
create policy "members read members" on public.group_members for select using (public.is_member(group_id));
create policy "leave or remove"      on public.group_members for delete using (user_id = auth.uid() or public.is_guruswami(group_id));
create policy "edit own name"        on public.group_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.group_members from authenticated;
grant update (display_name) on public.group_members to authenticated;

-- Join requests: to listed groups only; seen by the asker and the group's guruswami.
create policy "ask to join" on public.join_requests for insert with check (
  user_id = auth.uid() and not public.is_member(group_id) and public.is_listed(group_id)
);
create policy "see requests"      on public.join_requests for select using (user_id = auth.uid() or public.is_guruswami(group_id));
create policy "withdraw or decline" on public.join_requests for delete using (user_id = auth.uid() or public.is_guruswami(group_id));

-- Events: any member adds; the author or the guruswami edits and deletes.
create policy "members read events" on public.group_events for select using (public.is_member(group_id));
create policy "members add events"  on public.group_events for insert with check (public.is_member(group_id) and created_by = auth.uid());
create policy "author edits event"  on public.group_events for update using (created_by = auth.uid() or public.is_guruswami(group_id)) with check (public.is_member(group_id));
create policy "author deletes event" on public.group_events for delete using (created_by = auth.uid() or public.is_guruswami(group_id));

-- Messages: group chat for members (announcements by the guruswami); private messages only between people
-- who share a group and have not blocked each other.
create policy "read messages" on public.messages for select using (
  (group_id is not null and public.is_member(group_id)) or from_user = auth.uid() or to_user = auth.uid()
);
create policy "send messages" on public.messages for insert with check (
  from_user = auth.uid() and (
    (group_id is not null and public.is_member(group_id) and (not announcement or public.is_guruswami(group_id)))
    or (to_user is not null and to_user <> auth.uid() and public.shares_group(to_user) and not public.blocked_between(auth.uid(), to_user))
  )
);
create policy "delete messages" on public.messages for delete using (
  from_user = auth.uid() or (group_id is not null and public.is_guruswami(group_id))
);

create policy "own blocks"      on public.blocks for select using (blocker = auth.uid());
create policy "block someone"   on public.blocks for insert with check (blocker = auth.uid());
create policy "unblock someone" on public.blocks for delete using (blocker = auth.uid());

create policy "file a report" on public.reports for insert with check (reporter = auth.uid());

-- ---- Functions ----

/** Creates a group with the caller as its guruswami; the location is rounded to about 5 km. */
create function public.create_group(p_name text, p_about text, p_area text, p_lat double precision, p_lon double precision, p_listed boolean, p_display_name text)
returns public.groups language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into groups (name, about, area_name, approx_lat, approx_lon, listed, created_by)
  values (p_name, p_about, p_area, round((p_lat / 0.05)::numeric) * 0.05, round((p_lon / 0.05)::numeric) * 0.05, coalesce(p_listed, false), auth.uid())
  returning * into g;
  insert into group_members (group_id, user_id, role, display_name) values (g.id, auth.uid(), 'guruswami', p_display_name);
  return g;
end $$;

/** Joins a group with its invite code. */
create function public.join_by_code(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id into gid from groups where invite_code = lower(trim(p_code));
  if gid is null then raise exception 'invalid invite code'; end if;
  insert into group_members (group_id, user_id, display_name) values (gid, auth.uid(), p_display_name)
  on conflict (group_id, user_id) do nothing;
  delete from join_requests where group_id = gid and user_id = auth.uid();
  return gid;
end $$;

/** The guruswami approves a join request. */
create function public.approve_request(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r join_requests;
begin
  if not is_guruswami(p_group) then raise exception 'only the guruswami can approve'; end if;
  select * into r from join_requests where group_id = p_group and user_id = p_user;
  if r is null then raise exception 'no such request'; end if;
  insert into group_members (group_id, user_id, display_name) values (p_group, p_user, r.display_name) on conflict do nothing;
  delete from join_requests where group_id = p_group and user_id = p_user;
end $$;

/** The guruswami shares the role with another member (a group can have several). */
create function public.make_guruswami(p_group uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_guruswami(p_group) then raise exception 'only a guruswami can do this'; end if;
  update group_members set role = 'guruswami' where group_id = p_group and user_id = p_user;
end $$;

/** A new invite code (when the old one was shared too widely). */
create function public.new_invite_code(p_group uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text := encode(extensions.gen_random_bytes(5), 'hex');
begin
  if not is_guruswami(p_group) then raise exception 'only a guruswami can do this'; end if;
  update groups set invite_code = c where id = p_group;
  return c;
end $$;

/** Listed groups within p_km of a place: name, area, distance (rounded) and size — never coordinates. */
create function public.nearby_groups(p_lat double precision, p_lon double precision, p_km double precision default 50)
returns table (id uuid, name text, about text, area_name text, distance_km integer, members integer, is_member boolean, requested boolean)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.about, g.area_name, d.km::integer,
         (select count(*)::integer from group_members m where m.group_id = g.id),
         exists (select 1 from group_members m where m.group_id = g.id and m.user_id = auth.uid()),
         exists (select 1 from join_requests r where r.group_id = g.id and r.user_id = auth.uid())
  from groups g
  cross join lateral (select 6371 * 2 * asin(sqrt(
    power(sin(radians(g.approx_lat - p_lat) / 2), 2) +
    cos(radians(p_lat)) * cos(radians(g.approx_lat)) * power(sin(radians(g.approx_lon - p_lon) / 2), 2))) as km) d
  where g.listed and g.approx_lat is not null and d.km <= least(p_km, 300) and auth.uid() is not null
  order by d.km
  limit 50;
$$;

revoke all on function public.create_group, public.join_by_code, public.approve_request, public.make_guruswami,
  public.new_invite_code, public.nearby_groups from anon;

-- Live chat and events in the app.
alter publication supabase_realtime add table public.messages, public.group_events, public.join_requests, public.group_members;
