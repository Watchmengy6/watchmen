-- 00051 — check_in_event must require an RSVP with status = 'going'
-- (Codex pre-launch audit, July 2026). The 00016 version's comment
-- claimed "must have an existing 'going' RSVP" but the code only
-- checked that ANY rsvp row existed — a member with a 'maybe' or
-- 'not_going' RSVP who passed the GPS/time gates could still check in
-- and earn the 25 points. Full recreate, signature unchanged.

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
  v_rsvp_status text;
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

  -- Must have an existing RSVP AND it must be status = 'going' — the
  -- points are for showing up to something you committed to.
  select id, status, checked_in
    into v_rsvp_id, v_rsvp_status, v_already_checked
    from public.event_rsvps
    where event_id = p_event_id and user_id = v_profile_id;
  if v_rsvp_id is null or v_rsvp_status is distinct from 'going' then
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
