-- ===========================================================
-- 00030 — birthdays_today() helper
-- ===========================================================
-- Pulls only members whose birthday month/day matches "today" in
-- America/New_York. Replaces the old "fetch every birthday and filter
-- in JS using server-local time" pattern on /app/home, which both
-- scaled with member count and drifted in non-Eastern server regions.

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
    and extract(day from p.birthday)   = extract(day   from (now() at time zone 'America/New_York'));
$$;

grant execute on function public.birthdays_today() to authenticated;
