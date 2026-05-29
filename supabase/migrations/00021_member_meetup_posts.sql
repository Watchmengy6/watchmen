-- ===========================================================
-- 00021 — Member "meetup" feed posts
-- ===========================================================
-- Dustin: "Lets add the meet up function directly into the posting feed
-- where people can make meet up but its just a feed post."
--
-- Official meetups (in the Meetups tab) are admin-only. Member meetups
-- are just feed posts with structured when/where data, rendered as an
-- inline card. No RSVP table, no points — interest = like.

alter table public.posts
  add column if not exists meetup_when_at timestamptz,
  add column if not exists meetup_location text;

-- Index for "find feed-meetups happening soon" queries later.
create index if not exists posts_meetup_when_idx
  on public.posts(meetup_when_at)
  where meetup_when_at is not null;
