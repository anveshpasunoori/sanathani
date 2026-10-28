-- Sanathani: security hardening on top of 0001_user_state.sql.

-- 1. Cap each person's cloud copy at ~2 MB so one account cannot fill the database.
alter table public.user_state
  add constraint user_state_size check (pg_column_size(state) < 2000000);

-- 2. The server sets updated_at; a client cannot backdate or future-date it.
create or replace function public.user_state_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists user_state_touch on public.user_state;
create trigger user_state_touch before insert or update on public.user_state
  for each row execute function public.user_state_touch();

-- 3. Lets a signed-in person delete their own account (required by the App Store and Play Store).
-- Removing the auth user also removes their user_state row (on delete cascade).
-- It only ever acts on auth.uid(), so nobody can delete someone else's account.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end; $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
