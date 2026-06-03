-- ===========================================================
-- 00036 — Block evicts both users from shared DM threads
-- ===========================================================
-- Audit round 2 (00033_audit_p1_p2_hardening) made `threads` read
-- policy hide DMs whose other member is blocked, and made
-- thread_messages read policy block-aware. That covers reads. This
-- migration closes the remaining gap: when a member blocks someone
-- they already share a DM with, evict BOTH users from that DM thread
-- so neither side can keep sending messages into it (writes go through
-- thread_members membership, not the threads read policy).
--
-- Group and event threads are intentionally NOT evicted — blocking one
-- person can't punt you out of a group/event you both belong to.

create or replace function public.user_blocks_evict_dm_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Remove both users from every kind='dm' thread they share.
  delete from public.thread_members tm
  where tm.user_id in (new.blocker_id, new.blocked_id)
    and tm.thread_id in (
      select tm1.thread_id
      from public.thread_members tm1
      join public.thread_members tm2
        on tm2.thread_id = tm1.thread_id
       and tm2.user_id <> tm1.user_id
      join public.threads t on t.id = tm1.thread_id
      where t.kind = 'dm'
        and tm1.user_id = new.blocker_id
        and tm2.user_id = new.blocked_id
    );
  return new;
end;
$$;

drop trigger if exists trg_user_blocks_evict_dm_members on public.user_blocks;
create trigger trg_user_blocks_evict_dm_members
  after insert on public.user_blocks
  for each row execute function public.user_blocks_evict_dm_members();
