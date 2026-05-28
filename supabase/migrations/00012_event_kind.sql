-- ===========================================================
-- 00012 — Event kind (watchmen vs sponsored)
-- ===========================================================
-- The /app/events tab has 3 segments: Watchmen, Meetups, Sponsored.
-- Meetups already have their own table. We add a `kind` to events so
-- admins can mark certain events as sponsored placements.

do $$ begin
  create type event_kind as enum ('watchmen', 'sponsored');
exception when duplicate_object then null; end $$;

alter table public.events
  add column if not exists kind event_kind not null default 'watchmen';

create index if not exists events_kind_idx on public.events(kind);
