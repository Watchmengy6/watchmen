-- ===========================================================
-- 00032 — Native push scaffolding (APNs/FCM-ready)
-- ===========================================================
-- Prep for the Capacitor wrap. Once we ship native iOS / Android
-- builds, those clients register a device token instead of a web-push
-- subscription. We tag each push_subscriptions row with `platform` so
-- the server dispatcher can route correctly. Web subscriptions keep
-- working unchanged.
--
-- Web subscriptions have an `endpoint` + p256dh/auth keys. Native
-- subscriptions only need a `device_token` (APNs token or FCM token).
-- Both schemes live on the same table to keep sendPushToUser simple.

do $$ begin
  create type push_platform as enum ('web', 'ios', 'android');
exception when duplicate_object then null; end $$;

alter table public.push_subscriptions
  add column if not exists platform push_platform not null default 'web',
  add column if not exists device_token text;

-- Web rows keep `endpoint` unique; native rows use `device_token`
-- which should also be unique per device. Index for fast dispatch.
create unique index if not exists push_subscriptions_device_token_unique
  on public.push_subscriptions(device_token)
  where device_token is not null;

create index if not exists push_subscriptions_user_platform_idx
  on public.push_subscriptions(user_id, platform);
