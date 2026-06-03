-- ===========================================================
-- 00035 — Guarantee every member has a username (for @mentions)
-- ===========================================================
-- The @mention system stores/parses mentions by `username`, and the
-- composer's picker resolves picks to a username. But usernames were
-- only ever backfilled (from email local-part) once, in 00008, and
-- handle_new_user() never assigns one — so every member who signed up
-- after 00008 has username = NULL and literally cannot be mentioned,
-- and the picker (which filters out null usernames) shows nothing.
--
-- This migration:
--   1. Adds a generator that derives a clean, unique handle.
--   2. Backfills every null/blank username from the member's full name.
--   3. Adds a BEFORE INSERT trigger so new signups always get a handle.

-- ---------- unique-handle generator ----------
-- Slugifies full_name (falling back to email local-part, then 'member'),
-- enforces the same 3–24 char shape the profile editor validates, and
-- appends a numeric suffix on collision. Case-insensitive uniqueness to
-- match the existing lower(username) unique index from 00008.
create or replace function public.generate_unique_username(
  p_full_name text,
  p_email text,
  p_exclude uuid default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := btrim(regexp_replace(lower(coalesce(p_full_name, '')), '[^a-z0-9]+', '-', 'g'), '-');
  if base is null or length(base) < 3 then
    base := btrim(regexp_replace(lower(split_part(coalesce(p_email, ''), '@', 1)), '[^a-z0-9]+', '-', 'g'), '-');
  end if;
  if base is null or length(base) < 3 then
    base := 'member';
  end if;
  base := left(base, 20);
  candidate := base;
  loop
    if not exists (
      select 1 from public.profiles
      where lower(username) = candidate
        and (p_exclude is null or id <> p_exclude)
    ) then
      return candidate;
    end if;
    n := n + 1;
    candidate := left(base, 18) || '-' || n::text;
  end loop;
end;
$$;

-- ---------- backfill existing members ----------
-- Row-by-row so each assignment sees the ones before it (a single UPDATE
-- would race because every row would see the same pre-update snapshot).
-- Only touches null/blank usernames — existing handles are left as-is.
do $$
declare
  r record;
  u text;
begin
  for r in
    select id, full_name, email
    from public.profiles
    where username is null or btrim(username) = ''
  loop
    u := public.generate_unique_username(r.full_name, r.email, r.id);
    update public.profiles set username = u where id = r.id;
  end loop;
end;
$$;

-- ---------- auto-assign on every new profile ----------
create or replace function public.ensure_profile_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is null or btrim(new.username) = '' then
    new.username := public.generate_unique_username(new.full_name, new.email, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_username on public.profiles;
create trigger profiles_ensure_username
  before insert on public.profiles
  for each row execute function public.ensure_profile_username();
