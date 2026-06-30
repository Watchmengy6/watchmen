-- ===========================================================
-- 00045 — event_going_counts + meetup_going_counts helpers
-- ===========================================================
-- Same pattern as group_member_counts (00025): replace "fetch every
-- rsvp row and count in JS" with a single grouped query, so the
-- /app/events and /app/meetups list payloads don't scale with total
-- RSVP volume as events fill up.
--
-- Returns one row per id in the input array (ids with zero going RSVPs
-- simply don't appear — the caller defaults missing ids to 0).
-- SECURITY DEFINER + is_approved() gate so only approved members can
-- read counts (events/meetups are visible to all approved members).

create or replace function public.event_going_counts(p_event_ids uuid[])
returns table(event_id uuid, going_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select er.event_id, count(*)::bigint as going_count
  from public.event_rsvps er
  where er.event_id = any(p_event_ids)
    and er.status = 'going'
    and public.is_approved()
  group by er.event_id;
$$;
grant execute on function public.event_going_counts(uuid[]) to authenticated;

create or replace function public.meetup_going_counts(p_meetup_ids uuid[])
returns table(meetup_id uuid, going_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select mr.meetup_id, count(*)::bigint as going_count
  from public.meetup_rsvps mr
  where mr.meetup_id = any(p_meetup_ids)
    and mr.going = true
    and public.is_approved()
  group by mr.meetup_id;
$$;
grant execute on function public.meetup_going_counts(uuid[]) to authenticated;
