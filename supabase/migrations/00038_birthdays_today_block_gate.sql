-- ===========================================================
-- 00038 — gate birthdays_today() on user_blocks
-- ===========================================================
-- The home banner that surfaces today's birthdays was discovered
-- in the post-camera-fix Codex audit to leak blocked members'
-- profiles. Every other discovery surface (member directory,
-- mention picker, feed authors) already filters on
-- public.is_blocked_either_way(), but birthdays_today() did not
-- because it predates the block system.
--
-- Adding the gate here means a brother who blocked another
-- brother (or was blocked by them) no longer sees their birthday
-- card or tap-through profile link on the home feed.

create or replace function public.birthdays_today()
returns table(id uuid, full_name text, profile_photo_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.profile_photo_url
  from public.profiles p
  where p.status = 'approved'
    and p.deleted_at is null
    and p.birthday is not null
    and extract(month from p.birthday) = extract(month from (now() at time zone 'America/New_York'))
    and extract(day from p.birthday)   = extract(day   from (now() at time zone 'America/New_York'))
    -- Hide blocked brothers in either direction so the home banner
    -- matches the rest of the app's block semantics.
    and not public.is_blocked_either_way(p.id);
$$;

grant execute on function public.birthdays_today() to authenticated;
