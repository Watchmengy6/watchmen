-- ===========================================================
-- 00037 — Collapse Hobby kind into Group
-- ===========================================================
-- Dustin's call: hobbies are just groups with a specific topic
-- (cars, golfers, etc) — no reason to keep two separate categories.
-- The Category field on each group already covers what made a Hobby
-- distinct, and dropping the kind frees up screen space on the
-- filter chip row.
--
-- Strategy: flip every existing kind='hobby' row to kind='group'
-- in-place. No data is lost — only the discriminator changes. The
-- check constraint is dropped + recreated so the enum no longer
-- accepts 'hobby' going forward.

update public.groups set kind = 'group' where kind = 'hobby';

-- The kind column was defined as a CHECK-constrained text in
-- migration 00029. Drop the old check, install one that only
-- allows the two remaining values.
alter table public.groups
  drop constraint if exists groups_kind_check;

alter table public.groups
  add constraint groups_kind_check
  check (kind in ('group', 'meetup'));
