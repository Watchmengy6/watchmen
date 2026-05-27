-- ============================================================
-- The Watchman — Meetups + check-in extensions
-- ============================================================
-- Adds member-created meetups (lighter than events), their RSVPs,
-- and a check_in_meetup SECURITY DEFINER function that awards points.
-- Run after 00005.
-- ============================================================

-- ---------- meetup category enum ----------
do $$ begin
  create type meetup_category as enum ('Coffee','Workout','Drinks','Outdoors','Food','Other');
exception when duplicate_object then null; end $$;

-- ---------- meetups (member-created get-togethers) ----------
create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  when_at timestamptz not null,
  duration_min integer not null default 60,
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,
  category meetup_category not null default 'Other',
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetups_when_idx on public.meetups(when_at);
create index if not exists meetups_host_idx on public.meetups(host_user_id);

drop trigger if exists meetups_touch_updated_at on public.meetups;
create trigger meetups_touch_updated_at
  before update on public.meetups
  for each row execute function public.touch_updated_at();

-- ---------- meetup_rsvps (going + check-in) ----------
create table if not exists public.meetup_rsvps (
  id uuid primary key default gen_random_uuid(),
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  going boolean not null default true,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  checkin_latitude double precision,
  checkin_longitude double precision,
  created_at timestamptz not null default now(),
  unique (meetup_id, user_id)
);

create index if not exists meetup_rsvps_meetup_idx on public.meetup_rsvps(meetup_id);
create index if not exists meetup_rsvps_user_idx on public.meetup_rsvps(user_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.meetups enable row level security;
alter table public.meetup_rsvps enable row level security;

-- All approved members see all meetups.
drop policy if exists "meetups approved select" on public.meetups;
create policy "meetups approved select" on public.meetups
  for select using (public.is_approved());

-- Any approved member can host (create) a meetup.
drop policy if exists "meetups approved insert" on public.meetups;
create policy "meetups approved insert" on public.meetups
  for insert with check (
    host_user_id = public.current_profile_id() and public.is_approved()
  );

-- Hosts can edit / delete their own meetups; admins can too.
drop policy if exists "meetups host update" on public.meetups;
create policy "meetups host update" on public.meetups
  for update using (host_user_id = public.current_profile_id() or public.is_admin())
  with check (host_user_id = public.current_profile_id() or public.is_admin());

drop policy if exists "meetups host delete" on public.meetups;
create policy "meetups host delete" on public.meetups
  for delete using (host_user_id = public.current_profile_id() or public.is_admin());

-- RSVPs: anyone approved can read; only self can write.
drop policy if exists "meetup_rsvps approved select" on public.meetup_rsvps;
create policy "meetup_rsvps approved select" on public.meetup_rsvps
  for select using (public.is_approved());

drop policy if exists "meetup_rsvps self insert" on public.meetup_rsvps;
create policy "meetup_rsvps self insert" on public.meetup_rsvps
  for insert with check (user_id = public.current_profile_id() and public.is_approved());

drop policy if exists "meetup_rsvps self update" on public.meetup_rsvps;
create policy "meetup_rsvps self update" on public.meetup_rsvps
  for update using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());

drop policy if exists "meetup_rsvps self delete" on public.meetup_rsvps;
create policy "meetup_rsvps self delete" on public.meetup_rsvps
  for delete using (user_id = public.current_profile_id());

-- ============================================================
-- RSVP helper (mirrors rsvp_event, lighter — no status enum)
-- ============================================================
create or replace function public.rsvp_meetup(
  p_meetup_id uuid,
  p_going boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_was_going boolean;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;

  select going into v_was_going from public.meetup_rsvps
    where meetup_id = p_meetup_id and user_id = v_profile_id;

  insert into public.meetup_rsvps (meetup_id, user_id, going)
  values (p_meetup_id, v_profile_id, p_going)
  on conflict (meetup_id, user_id) do update set going = excluded.going;

  -- Light points (+2) when first going to a meetup, capped at 10/day to prevent spam
  if (v_was_going is null or v_was_going = false) and p_going = true then
    perform public.award_points(
      v_profile_id, 'meetup_going', 2, 'meetup', p_meetup_id, 10
    );
  end if;
end;
$$;

-- ============================================================
-- Check-in helper — awards +10 points
-- ============================================================
create or replace function public.check_in_meetup(
  p_meetup_id uuid,
  p_latitude double precision,
  p_longitude double precision
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_rsvp_id uuid;
  v_already_checked boolean;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;

  select id, checked_in into v_rsvp_id, v_already_checked
    from public.meetup_rsvps
    where meetup_id = p_meetup_id and user_id = v_profile_id;

  if v_rsvp_id is null then
    -- auto-RSVP on check-in
    insert into public.meetup_rsvps (
      meetup_id, user_id, going, checked_in, checked_in_at,
      checkin_latitude, checkin_longitude
    ) values (
      p_meetup_id, v_profile_id, true, true, now(),
      p_latitude, p_longitude
    );
    perform public.award_points(v_profile_id, 'meetup_checkin', 10, 'meetup', p_meetup_id, null);
    perform public.award_points(v_profile_id, 'meetup_going', 2, 'meetup', p_meetup_id, 10);
  elsif not v_already_checked then
    update public.meetup_rsvps
      set checked_in = true, checked_in_at = now(),
          checkin_latitude = p_latitude, checkin_longitude = p_longitude
      where id = v_rsvp_id;
    perform public.award_points(v_profile_id, 'meetup_checkin', 10, 'meetup', p_meetup_id, null);
  end if;
end;
$$;

-- ============================================================
-- Realtime publication
-- ============================================================
do $$
declare
  v_tables text[] := array['meetups','meetup_rsvps'];
  v_table text;
begin
  foreach v_table in array v_tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end $$;
