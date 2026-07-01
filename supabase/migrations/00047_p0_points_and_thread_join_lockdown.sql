-- ===========================================================
-- 00047 — P0 security: lock points RPCs + close thread self-join
-- ===========================================================
-- From the fix-and-harden audit (WATCHMAN_FIX_PROMPT.md), P0.1 + P0.4.
-- Forward-only, idempotent.

-- -----------------------------------------------------------
-- P0.1 — Points privilege / forgery.
-- award_points (00003) and award_points_rpc (00011) are SECURITY DEFINER
-- and, despite the 00011 comment claiming otherwise, were never revoked —
-- so they kept Postgres's default PUBLIC execute grant. Any authenticated
-- user could POST /rest/v1/rpc/award_points(_rpc) and forge their own (or
-- tank a rival's) leaderboard points.
--
-- The ONLY legitimate caller is the service-role client in
-- src/lib/points/award.ts (svc()), plus internal triggers — both bypass
-- grants, so revoking client access does NOT break point-awarding.
-- -----------------------------------------------------------
revoke execute on function
  public.award_points(uuid, text, integer, text, uuid, integer)
  from public, authenticated;

revoke execute on function
  public.award_points_rpc(uuid, text, integer, text, uuid)
  from public, authenticated;

-- -----------------------------------------------------------
-- P0.4 — Thread self-join.
-- The "thread_members self insert" policy (00011) only checked
-- `is_approved() AND user_id = current_profile_id()`, so any approved
-- member who learned a thread UUID could insert themselves into ANY DM /
-- group / event thread and read its messages.
--
-- Every LEGITIMATE membership insert happens through a SECURITY DEFINER
-- path that bypasses RLS:
--   * create_group_thread + sync_group_member_to_thread (00010 triggers)
--   * find_or_create_dm (00026) for DMs
--   * the event-RSVP → thread sync (00031) for event rooms
-- and NO application code inserts into thread_members via the authenticated
-- client (verified: only selects/updates/deletes). So we drop the
-- permissive INSERT policy entirely. With no INSERT policy present, the
-- authenticated role cannot self-insert, while the definer paths keep
-- working untouched.
-- -----------------------------------------------------------
drop policy if exists "thread_members self insert" on public.thread_members;
