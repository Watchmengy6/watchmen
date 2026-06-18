-- ===========================================================
-- 00039 — get_my_blocked_profiles() RPC for the blocked-members
-- settings page (/app/profile/blocked).
-- ===========================================================
--
-- Background: blocked-members list page was always empty for any user
-- who had actually blocked someone. Cause: the page joined user_blocks
-- to profiles to show the blocked user's name + avatar. But the
-- is_blocked_either_way RLS policy on profiles (correctly) hides
-- blocked users from the blocker. So the join returned null for every
-- row and the page filtered them all out.
--
-- The block itself works as designed — RLS hides the blocked user's
-- posts, comments, and DMs from the blocker. The bug was only in the
-- management UI where the user needs to SEE who they've blocked to
-- unblock them.
--
-- Fix: a SECURITY DEFINER RPC that returns the display info of users
-- the CALLER has blocked. The function joins on current_profile_id()
-- internally so callers can ONLY see their own block list — they
-- cannot read anyone else's blocks even with a crafted query. The
-- RLS bypass is bounded to this single ownership-checked path.
--
-- Caller pattern (in /app/profile/blocked/page.tsx):
--   const { data: rows } = await supabase.rpc('get_my_blocked_profiles');
--   // rows: [{ block_id, blocked_id, full_name, profile_photo_url, blocked_at }, ...]
--
-- Returns rows in reverse chronological order (most recently blocked
-- first) so the user sees their most recent action at the top.

create or replace function public.get_my_blocked_profiles()
returns table (
  block_id uuid,
  blocked_id uuid,
  full_name text,
  profile_photo_url text,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  -- The where clause is the safety boundary: even though this function
  -- runs with elevated permissions (SECURITY DEFINER), it only returns
  -- rows where the user_blocks.blocker_id matches the caller's profile.
  -- A caller cannot pass arguments to widen this scope — there are
  -- no arguments.
  select
    ub.id              as block_id,
    ub.blocked_id      as blocked_id,
    p.full_name        as full_name,
    p.profile_photo_url as profile_photo_url,
    ub.created_at      as blocked_at
  from public.user_blocks ub
  join public.profiles p on p.id = ub.blocked_id
  where ub.blocker_id = public.current_profile_id()
  order by ub.created_at desc;
$$;

-- Lock down: only authenticated users (anon role denied).
revoke all on function public.get_my_blocked_profiles() from public;
grant execute on function public.get_my_blocked_profiles() to authenticated;
