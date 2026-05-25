-- ============================================================
-- The Watchman — Seed: promote Dustin to super_admin
-- ============================================================
-- Run this AFTER Dustin signs up for the first time so his
-- auth.users row exists. Replace the email below.
-- ============================================================

-- 1) Approve Dustin and make him super_admin.
update public.profiles
set role = 'super_admin', status = 'approved'
where email = 'REPLACE_WITH_DUSTIN_EMAIL@example.com';

-- 2) Optional: also approve yourself for testing.
-- update public.profiles set status = 'approved' where email = 'you@example.com';
