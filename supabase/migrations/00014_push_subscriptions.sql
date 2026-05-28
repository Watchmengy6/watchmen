-- ===========================================================
-- 00014 — Web Push subscriptions (VAPID)
-- ===========================================================
-- Stores one row per browser/device the user has enabled push on.
-- Server uses the endpoint + keys to send messages via web-push.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Each user manages their own subscriptions only.
drop policy if exists "push_subs self select" on public.push_subscriptions;
create policy "push_subs self select" on public.push_subscriptions
  for select using (user_id = public.current_profile_id());

drop policy if exists "push_subs self insert" on public.push_subscriptions;
create policy "push_subs self insert" on public.push_subscriptions
  for insert with check (user_id = public.current_profile_id());

drop policy if exists "push_subs self delete" on public.push_subscriptions;
create policy "push_subs self delete" on public.push_subscriptions
  for delete using (user_id = public.current_profile_id());
