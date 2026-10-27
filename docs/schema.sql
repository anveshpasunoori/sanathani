-- Sanathani — PostgreSQL / Supabase schema for the sync stage.
-- The v0.1 app stores the same shapes locally (src/data/types.ts).

create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  lang text not null default 'te' check (lang in ('te','en','hi','ta','kn','ml','mr')),
  tradition text not null default 'te-ap',
  place_name text not null,
  lat double precision not null,
  lon double precision not null,
  tz text not null,                         -- IANA zone, e.g. 'America/New_York'
  reminder_time time not null default '07:00',
  created_at timestamptz not null default now()
);

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now()
);

create table family_members (
  family_id uuid references families on delete cascade,
  user_id uuid references profiles on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  primary key (family_id, user_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer')),
  token_hash text not null,                 -- store a hash, never the raw token
  expires_at timestamptz not null,
  accepted_at timestamptz
);

create table events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  family_id uuid references families on delete set null,  -- null = private
  person_name text not null,
  relationship text not null,
  category text not null check (category in ('birthday','marriage','death','shraddha','engagement','naming','housewarming','religious','custom')),
  title text,
  original_date date not null,
  original_time time,
  original_place_name text,
  original_lat double precision,
  original_lon double precision,
  original_tz text,
  recurrence text not null check (recurrence in ('thithi','gregorian','none')),
  lunar_month smallint check (lunar_month between 0 and 11),   -- 0 = Chaitra
  lunar_adhika boolean,
  lunar_tithi smallint check (lunar_tithi between 0 and 29),   -- 0 = Shukla Pratipada, 29 = Amavasya
  lunar_source text check (lunar_source in ('computed','user')),
  nakshatra smallint check (nakshatra between 0 and 26),
  tradition text not null,
  observance_rule text not null check (observance_rule in ('sunrise','aparahna','madhyahna','pradosha','nishita','moonrise')),
  adhika_policy text not null default 'nija' check (adhika_policy in ('nija','both')),
  notes text,
  rituals text,
  photo_path text,                          -- storage bucket path, private
  privacy text not null default 'private' check (privacy in ('private','family')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recurrence <> 'thithi' or (lunar_month is not null and lunar_tithi is not null and lunar_adhika is not null))
);

-- Computed observances with provenance; recomputed by a scheduled job.
create table occurrences (
  event_id uuid references events on delete cascade,
  observance_date date not null,
  reason text not null,
  caution text,
  place_key text not null,                  -- lat,lon,tz used for the calculation
  engine_version text not null,
  computed_at timestamptz not null default now(),
  superseded_by date,                       -- set when a recalculation moved the date
  primary key (event_id, observance_date)
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  user_id uuid not null references profiles on delete cascade,   -- shared reminders: one row per recipient
  days_before smallint not null check (days_before between 0 and 365),
  local_time time not null,
  channels text[] not null default '{push}'
);

-- Idempotent delivery log: the unique key prevents duplicate notifications.
create table deliveries (
  reminder_id uuid references reminders on delete cascade,
  observance_date date not null,
  channel text not null,
  fire_at timestamptz not null,             -- computed from local_time in the user's tz at scheduling time
  status text not null check (status in ('pending','sent','failed','skipped')),
  attempts smallint not null default 0,
  sent_at timestamptz,
  primary key (reminder_id, observance_date, channel)
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

-- Row-level security: private by default, family visibility only when shared.
alter table profiles enable row level security;
alter table events enable row level security;
alter table occurrences enable row level security;
alter table reminders enable row level security;
alter table deliveries enable row level security;
alter table family_members enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid());

create function is_member(f uuid, roles text[]) returns boolean language sql stable security definer as $$
  select exists (select 1 from family_members m where m.family_id = f and m.user_id = auth.uid() and m.role = any(roles));
$$;

create policy "read own or shared" on events for select using (
  owner_id = auth.uid() or (privacy = 'family' and family_id is not null and is_member(family_id, array['owner','editor','viewer']))
);
create policy "insert own" on events for insert with check (owner_id = auth.uid());
create policy "update own or editor" on events for update using (
  owner_id = auth.uid() or (privacy = 'family' and is_member(family_id, array['owner','editor']))
);
create policy "delete own" on events for delete using (owner_id = auth.uid());

create policy "occurrences follow events" on occurrences for select using (
  exists (select 1 from events e where e.id = event_id)
);
create policy "own reminders" on reminders for all using (user_id = auth.uid());
create policy "own deliveries" on deliveries for select using (
  exists (select 1 from reminders r where r.id = reminder_id and r.user_id = auth.uid())
);
create policy "see own memberships" on family_members for select using (user_id = auth.uid() or is_member(family_id, array['owner']));

create index on events (owner_id);
create index on events (family_id) where family_id is not null;
create index on deliveries (status, fire_at);
