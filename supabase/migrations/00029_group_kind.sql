-- ===========================================================
-- 00029 — Groups: 3-category model
-- ===========================================================
-- Per Dustin: Groups become a hub for three flavors of sub-units.
--   - 'group'  : ongoing groups (Run Club, Bible Study)        [gold]
--   - 'meetup' : scheduled one-off gatherings (a concert, hike) [emerald]
--   - 'hobby'  : interest-based clubs (gun shooting, cooking)   [violet]
-- The existing `groups.category` text column is repurposed as the
-- free-form label users pick; this migration adds a `kind` column for
-- the higher-level color-coded flavor. Existing rows default to
-- 'group' so the UI keeps working pre-backfill.

do $$ begin
  create type group_kind as enum ('group', 'meetup', 'hobby');
exception when duplicate_object then null; end $$;

alter table public.groups
  add column if not exists kind group_kind not null default 'group';

create index if not exists groups_kind_idx on public.groups(kind);
