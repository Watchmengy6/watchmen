-- ============================================================
-- The Watchman — Storage buckets & policies
-- ============================================================

-- avatars (public for direct CDN URLs in member directory)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- chat-media (public read; uploads gated by RLS)
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- event-images (public read; admin upload)
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- ---------- storage policies ----------

-- avatars: any authenticated approved user can read; user can write their own folder
drop policy if exists "avatars read approved" on storage.objects;
create policy "avatars read approved" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars write own" on storage.objects;
create policy "avatars write own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and public.is_approved()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- chat-media: read for everyone (bucket is public); write only for approved members
drop policy if exists "chat-media read" on storage.objects;
create policy "chat-media read" on storage.objects
  for select using (bucket_id = 'chat-media');

drop policy if exists "chat-media write approved" on storage.objects;
create policy "chat-media write approved" on storage.objects
  for insert with check (
    bucket_id = 'chat-media'
    and public.is_approved()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chat-media delete own" on storage.objects;
create policy "chat-media delete own" on storage.objects
  for delete using (
    bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- event-images: read everyone; admin-only write
drop policy if exists "event-images read" on storage.objects;
create policy "event-images read" on storage.objects
  for select using (bucket_id = 'event-images');

drop policy if exists "event-images admin write" on storage.objects;
create policy "event-images admin write" on storage.objects
  for insert with check (bucket_id = 'event-images' and public.is_admin());

drop policy if exists "event-images admin update" on storage.objects;
create policy "event-images admin update" on storage.objects
  for update using (bucket_id = 'event-images' and public.is_admin());

drop policy if exists "event-images admin delete" on storage.objects;
create policy "event-images admin delete" on storage.objects
  for delete using (bucket_id = 'event-images' and public.is_admin());
