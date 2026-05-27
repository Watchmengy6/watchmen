-- ============================================================
-- The Watchman — Profile: payment handles
-- ============================================================
-- Adds Venmo + CashApp usernames so members can collect/send
-- money via tappable links from each other's profiles.
-- Store just the username (not the full URL) — the app builds the
-- link on render via src/lib/utils/socialLinks.ts.
-- ============================================================

alter table public.profiles
  add column if not exists venmo_username text,
  add column if not exists cashapp_username text;

comment on column public.profiles.venmo_username is
  'Bare Venmo username (no @ or URL). Rendered as https://venmo.com/u/<username>.';
comment on column public.profiles.cashapp_username is
  'Bare CashApp cashtag (no $ or URL). Rendered as https://cash.app/$<username>.';
