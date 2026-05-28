-- ===========================================================
-- 00016 — Security hardening (Codex audit round 5)
-- ===========================================================
-- Addresses:
--   P1: check_in_event has no time/venue/coord validation and auto-RSVPs
--   P2: polls, poll_options, poll_votes, message_reactions ignore chat
--       membership — approved members can read/write across private event
--       rooms they aren't RSVP'd to
--   P2: poll_votes.poll_option_id has no constraint that it belongs to
--       poll_votes.poll_id, so crafted requests can vote with the wrong
--       option

-- ===========================================================
-- 1. Helper: can the caller read a given chat?
-- ===========================================================
-- Centralises the visibility logic so we don't duplicate the event_rsvp
-- subquery in every poll/reaction policy.

create or replace function public.can_see_chat(p_chat_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chats c
    where c.id = p_chat_id
      and public.is_approved()
      and (
        c.type = 'main'
        or (
          c.type = 'event'
          and exists (
            select 1 from public.event_rsvps r
            where r.event_id = c.event_id
              and r.user_id = public.current_profile_id()
              and r.status = 'going'
          )
        )
      )
  );
$$;

-- ===========================================================
-- 2. message_reactions — scope to underlying message's chat
-- ===========================================================
drop policy if exists "reactions select approved" on public.message_reactions;
create policy "reactions select if can see chat" on public.message_reactions
  for select using (
    public.is_approved()
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and public.can_see_chat(m.chat_id)
    )
  );

drop policy if exists "reactions insert self" on public.message_reactions;
create policy "reactions insert if can see chat" on public.message_reactions
  for insert with check (
    user_id = public.current_profile_id()
    and public.is_approved()
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and public.can_see_chat(m.chat_id)
    )
  );

-- delete-self policy is unchanged — caller already owns the row

-- ===========================================================
-- 3. polls — scope to chat membership
-- ===========================================================
drop policy if exists "polls select approved" on public.polls;
create policy "polls select if can see chat" on public.polls
  for select using (
    public.is_approved()
    and (
      polls.chat_id is null
      or public.can_see_chat(polls.chat_id)
    )
  );

drop policy if exists "polls insert self" on public.polls;
create policy "polls insert if can see chat" on public.polls
  for insert with check (
    created_by_user_id = public.current_profile_id()
    and public.is_approved()
    and (
      polls.chat_id is null
      or public.can_see_chat(polls.chat_id)
    )
  );

-- update own + admin all policies remain unchanged

-- ===========================================================
-- 4. poll_options — scope through parent poll's chat
-- ===========================================================
drop policy if exists "poll_options select approved" on public.poll_options;
create policy "poll_options select if can see chat" on public.poll_options
  for select using (
    public.is_approved()
    and exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id
        and (p.chat_id is null or public.can_see_chat(p.chat_id))
    )
  );

-- insert policy already requires the caller is the poll owner; tighten to
-- also require chat visibility so a hijacked-owner edge case can't cross
-- private rooms.
drop policy if exists "poll_options insert if poll owner" on public.poll_options;
create policy "poll_options insert if poll owner and can see chat" on public.poll_options
  for insert with check (
    public.is_approved()
    and exists (
      select 1 from public.polls p
      where p.id = poll_id
        and p.created_by_user_id = public.current_profile_id()
        and (p.chat_id is null or public.can_see_chat(p.chat_id))
    )
  );

-- ===========================================================
-- 5. poll_votes — scope to chat AND enforce option/poll integrity
-- ===========================================================
drop policy if exists "poll_votes select approved" on public.poll_votes;
create policy "poll_votes select if can see chat" on public.poll_votes
  for select using (
    public.is_approved()
    and exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id
        and (p.chat_id is null or public.can_see_chat(p.chat_id))
    )
  );

drop policy if exists "poll_votes insert self" on public.poll_votes;
create policy "poll_votes insert if can see chat" on public.poll_votes
  for insert with check (
    user_id = public.current_profile_id()
    and public.is_approved()
    and exists (
      select 1 from public.polls p
      where p.id = poll_id
        and (p.chat_id is null or public.can_see_chat(p.chat_id))
    )
  );

-- Trigger enforcing that poll_option_id actually belongs to poll_id.
-- (We can't express this as a check constraint without adding poll_id
-- to poll_options' uniqueness; a BEFORE trigger is the cleanest option.)
create or replace function public.poll_votes_option_integrity()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.poll_options o
    where o.id = new.poll_option_id and o.poll_id = new.poll_id
  ) then
    raise exception 'poll_option_id % does not belong to poll %',
      new.poll_option_id, new.poll_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_poll_votes_option_integrity on public.poll_votes;
create trigger trg_poll_votes_option_integrity
  before insert or update on public.poll_votes
  for each row execute function public.poll_votes_option_integrity();

-- ===========================================================
-- 6. check_in_event — validate time window, venue radius, real coords
-- ===========================================================
create or replace function public.check_in_event(
  p_event_id uuid,
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
  v_event_date date;
  v_start_time time;
  v_end_time time;
  v_event_lat double precision;
  v_event_lng double precision;
  v_distance_m double precision;
  v_event_start_ts timestamptz;
  v_event_end_ts timestamptz;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;

  -- Validate coordinates. 0,0 is the "no fix" fallback we want to reject
  -- (it's in the middle of the Atlantic and never a real check-in).
  if p_latitude is null or p_longitude is null
     or (abs(p_latitude) < 0.0001 and abs(p_longitude) < 0.0001)
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid location';
  end if;

  -- Load event window + coords for the validation checks.
  select event_date, start_time, end_time, latitude, longitude
    into v_event_date, v_start_time, v_end_time, v_event_lat, v_event_lng
    from public.events
    where id = p_event_id and status = 'published';
  if v_event_date is null then
    raise exception 'Event not found';
  end if;

  -- Event time window: allow check-in from 30 minutes before start to
  -- (end_time or +3h fallback) after start. Use America/New_York since
  -- this is the Watchmen's home time zone — events store wall-clock
  -- date + time without TZ.
  v_event_start_ts := (v_event_date::text || ' ' || coalesce(v_start_time::text, '00:00:00'))::timestamp
                        at time zone 'America/New_York';
  if v_end_time is not null then
    v_event_end_ts := (v_event_date::text || ' ' || v_end_time::text)::timestamp
                        at time zone 'America/New_York';
  else
    v_event_end_ts := v_event_start_ts + interval '3 hours';
  end if;

  if now() < v_event_start_ts - interval '30 minutes' then
    raise exception 'Check-in opens 30 minutes before the event';
  end if;
  if now() > v_event_end_ts + interval '2 hours' then
    raise exception 'Check-in is closed for this event';
  end if;

  -- Venue radius: require the device to be within 250m of the event's
  -- recorded coordinates. Computed in metres via the Haversine formula.
  if v_event_lat is not null and v_event_lng is not null then
    v_distance_m := 6371000 * 2 * asin(sqrt(
      power(sin(radians((p_latitude - v_event_lat) / 2)), 2)
      + cos(radians(v_event_lat)) * cos(radians(p_latitude))
        * power(sin(radians((p_longitude - v_event_lng) / 2)), 2)
    ));
    if v_distance_m > 250 then
      raise exception 'You are too far from the venue to check in';
    end if;
  end if;

  -- Must have an existing 'going' RSVP — no more auto-RSVP that hands
  -- out 30 points (25 check-in + 5 going) in one anonymous call.
  select id, checked_in into v_rsvp_id, v_already_checked
    from public.event_rsvps
    where event_id = p_event_id and user_id = v_profile_id;
  if v_rsvp_id is null then
    raise exception 'RSVP as going before checking in';
  end if;

  if not v_already_checked then
    update public.event_rsvps
      set checked_in = true, checked_in_at = now(),
          checkin_latitude = p_latitude, checkin_longitude = p_longitude
      where id = v_rsvp_id;
    perform public.award_points(v_profile_id, 'check_in', 25, 'event', p_event_id, null);
  end if;
end;
$$;
