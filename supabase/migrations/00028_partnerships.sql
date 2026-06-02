-- ===========================================================
-- 00028 — Partnerships + Discounts
-- ===========================================================
-- Dustin: "Watchmen members get a free Chick-fil-A sandwich at
-- Chick-fil-A Gandy." Admin curates the list; members browse from
-- their profile. Logo URL points at an asset in storage (reuse the
-- avatars bucket — small + already public-readable).

create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blurb text,
  discount_details text not null,
  location_name text,
  address text,
  link_url text,
  logo_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partnerships_active_idx
  on public.partnerships(active, sort_order, created_at desc);

alter table public.partnerships enable row level security;

-- Read: any approved member can browse active partnerships.
drop policy if exists "partnerships approved read" on public.partnerships;
create policy "partnerships approved read" on public.partnerships
  for select using (public.is_approved() and active = true);

-- Admin read-all so the admin page can see inactive ones too.
drop policy if exists "partnerships admin read all" on public.partnerships;
create policy "partnerships admin read all" on public.partnerships
  for select using (public.is_admin());

-- Admins create / update / delete.
drop policy if exists "partnerships admin write" on public.partnerships;
create policy "partnerships admin write" on public.partnerships
  for all using (public.is_admin()) with check (public.is_admin());

-- Touch updated_at on any change.
drop trigger if exists partnerships_touch_updated_at on public.partnerships;
create trigger partnerships_touch_updated_at
  before update on public.partnerships
  for each row execute function public.touch_updated_at();
