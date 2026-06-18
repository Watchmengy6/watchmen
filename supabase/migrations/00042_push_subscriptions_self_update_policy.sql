-- ===========================================================
-- 00042 — push_subscriptions self-update RLS policy
-- ===========================================================
--
-- Background: registerNativeDeviceTokenAction (src/lib/push/native.ts)
-- does an upsert keyed on device_token. Before this migration, the
-- table only had SELECT / INSERT / DELETE policies (from migration
-- 00014 + native scaffold in 00032). On a fresh insert path, RLS
-- allowed the row — but ANY upsert that hit the conflict branch
-- (UPDATE) was silently blocked with no row written or modified.
--
-- This matters because:
--   1. The same iOS device on a repeat install can return a token
--      that already exists in user_blocks — the upsert tries to
--      reassign user_id, which is an UPDATE, which RLS rejected.
--   2. Capacitor's PushNotifications.register() can fire multiple
--      times during normal app lifecycle. The second call's upsert
--      ran into the same wall.
--   3. The action returned `success: true` even when the upsert
--      silently no-op'd, because Postgres doesn't error on
--      RLS-blocked UPDATEs in this path — it just affects zero rows.
--
-- Found during the 1.0.2 pre-submission Codex audit. The 1.0.2
-- AppDelegate fix solves the FIRST insert case. This migration
-- solves the REPEAT insert / token-reassignment case so future
-- testing + cross-account reinstalls don't silently fail.
--
-- Scope: a member can only update their OWN push subscription rows.
-- They cannot reassign a token to a different user_id (the
-- `with check` clause locks the post-update row to the caller's
-- profile too).

create policy "push_subs self update" on public.push_subscriptions
  for update
  using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());
