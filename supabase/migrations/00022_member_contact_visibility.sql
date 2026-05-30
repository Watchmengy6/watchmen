-- ===========================================================
-- 00022 — Email + phone visible on member profiles
-- ===========================================================
-- Per Dustin: every brother should be able to see another brother's
-- email and phone directly from their profile. The room is invite-only
-- and admin-vetted, so this is acceptable. Migration 00011 had revoked
-- these columns from `authenticated`; we grant them back.
--
-- invite_code stays revoked — that's still personal-only (used to
-- generate share links from /app/profile). The me_full() RPC continues
-- to surface it for the self view.

grant select (email, phone) on public.profiles to authenticated;
