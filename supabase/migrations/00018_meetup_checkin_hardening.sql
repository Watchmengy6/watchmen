-- ===========================================================
-- 00018 — Harden check_in_meetup (mirrors 00016 for events)
-- ===========================================================
-- Before: anyone approved could call check_in_meetup with any coords
-- (including 0,0) and instantly bank 10 points + auto-RSVP themselves.
-- After: validates real coords, enforces a venue radius (250m) when
-- the meetup has location coords, enforces a time window (opens at
-- when_at, closes when_at + duration + 30min grace), and requires an
-- existing 'going' RSVP — no more auto-RSVP loophole.

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
  v_was_going boolean;
  v_already_checked boolean;
  v_when_at timestamptz;
  v_duration_min integer;
  v_meetup_lat double precision;
  v_meetup_lng double precision;
  v_distance_m double precision;
  v_window_end timestamptz;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;

  -- Validate coords. Reject null, 0,0 fallback, and out-of-range.
  if p_latitude is null or p_longitude is null
     or (abs(p_latitude) < 0.0001 and abs(p_longitude) < 0.0001)
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid location';
  end if;

  -- Load meetup window + venue coords.
  select when_at, duration_min, latitude, longitude
    into v_when_at, v_duration_min, v_meetup_lat, v_meetup_lng
    from public.meetups
    where id = p_meetup_id;
  if v_when_at is null then
    raise exception 'Meetup not found';
  end if;

  -- Time window. Open at when_at (the host said the meetup starts then),
  -- close at when_at + duration + 30 min grace. We deliberately do NOT
  -- allow early check-ins for meetups — they're meant to be informal
  -- "I'm here right now" pings.
  v_window_end := v_when_at + (coalesce(v_duration_min, 60) || ' minutes')::interval
                  + interval '30 minutes';
  if now() < v_when_at then
    raise exception 'Check-in opens when the meetup starts';
  end if;
  if now() > v_window_end then
    raise exception 'Check-in is closed for this meetup';
  end if;

  -- Venue radius. Only enforced when the meetup actually has coords.
  if v_meetup_lat is not null and v_meetup_lng is not null then
    v_distance_m := 6371000 * 2 * asin(sqrt(
      power(sin(radians((p_latitude - v_meetup_lat) / 2)), 2)
      + cos(radians(v_meetup_lat)) * cos(radians(p_latitude))
        * power(sin(radians((p_longitude - v_meetup_lng) / 2)), 2)
    ));
    if v_distance_m > 250 then
      raise exception 'You are too far from the meetup to check in';
    end if;
  end if;

  -- Must already be RSVP'd as going. No more silent auto-RSVP that
  -- handed out 12 free points (10 check-in + 2 going) in one call.
  select id, going, checked_in
    into v_rsvp_id, v_was_going, v_already_checked
    from public.meetup_rsvps
    where meetup_id = p_meetup_id and user_id = v_profile_id;
  if v_rsvp_id is null or v_was_going is not true then
    raise exception 'Mark yourself going before checking in';
  end if;

  -- One award per check-in.
  if not v_already_checked then
    update public.meetup_rsvps
      set checked_in = true, checked_in_at = now(),
          checkin_latitude = p_latitude, checkin_longitude = p_longitude
      where id = v_rsvp_id;
    perform public.award_points(
      v_profile_id, 'meetup_checkin', 10, 'meetup', p_meetup_id, null
    );
  end if;
end;
$$;
