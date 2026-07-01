-- ===========================================================
-- 00049 — composite index for keyset feed pagination (P1.1)
-- ===========================================================
-- OPTIONAL / non-urgent perf. The feed's keyset pagination
-- (loadMoreFeedAction) orders by (created_at desc, id desc) and filters
-- deleted_at is null. The existing single-column posts_created_idx (00008)
-- already prevents a full scan, but a composite partial index lets the
-- whole ORDER BY + keyset be satisfied from one index with no in-memory
-- sort and without fetching soft-deleted rows. Cheap; matters more as post
-- volume grows. Safe to run anytime.

create index if not exists posts_created_id_idx
  on public.posts (created_at desc, id desc)
  where deleted_at is null;
