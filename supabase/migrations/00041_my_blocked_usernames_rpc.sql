-- ===========================================================
-- 00041 — get_my_blocked_usernames() RPC
-- ===========================================================
--
-- Lightweight helper that returns ONLY the usernames of profiles
-- the caller has blocked (bidirectional — both directions of
-- user_blocks are considered, matching is_blocked_either_way()).
--
-- Use case: server-rendered post/comment bodies parse @username
-- mentions in `RichText`. Without knowing which mentions point to
-- blocked profiles, the chip renders as a clickable gold link.
-- Tapping it deep-links to a member-search page that correctly
-- returns no results (RLS hides the blocked profile), so it's not
-- broken — but it's also not polished. With this helper, the page
-- that renders FeedPost can pass `blockedUsernames` down and the
-- RichText component renders those mentions as plain text instead.
--
-- Why a separate RPC vs extending get_my_blocked_profiles():
-- - Smaller payload (one text per row, vs joined profile row)
-- - Doesn't change the return shape of get_my_blocked_profiles —
--   the BlockedListPage's column expectations stay byte-stable
-- - Can be cached per-request independently if home-page load
--   shaping later needs it
--
-- Security: SECURITY DEFINER bypasses RLS (so we CAN see blocked
-- usernames even when the profile RLS would hide them), but the
-- WHERE clause hard-pins the result set to rows where the CALLER
-- is one half of the block pair. No arguments are accepted, so
-- there's no way to widen the scope.

create or replace function public.get_my_blocked_usernames()
returns table (username text)
language sql
stable
security definer
set search_path = public
as $$
  -- Pull the OTHER profile's username for every block the caller is
  -- on either side of. Distinct because the same target could in
  -- theory show up twice via a mutual block pair.
  select distinct p.username
  from public.user_blocks ub
  join public.profiles p
    on p.id = case
                when ub.blocker_id = public.current_profile_id() then ub.blocked_id
                else ub.blocker_id
              end
  where (
          ub.blocker_id = public.current_profile_id()
       or ub.blocked_id = public.current_profile_id()
        )
    and p.username is not null;
$$;

revoke all on function public.get_my_blocked_usernames() from public;
grant execute on function public.get_my_blocked_usernames() to authenticated;
