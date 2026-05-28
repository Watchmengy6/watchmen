-- ===========================================================
-- 00013 — Personal/family fields on profiles
-- ===========================================================
-- Mock data showed spouse, kids, and birthday for members. The live
-- profile editor / detail page expect these fields too — add them.

alter table public.profiles
  add column if not exists birthday date,
  add column if not exists spouse text,
  add column if not exists kids text,
  add column if not exists membership_date date;

-- Grant SELECT on the new safe columns to authenticated (others can see
-- a brother's family/birthday — these are part of the public bio).
grant select (birthday, spouse, kids, membership_date) on public.profiles to authenticated;
