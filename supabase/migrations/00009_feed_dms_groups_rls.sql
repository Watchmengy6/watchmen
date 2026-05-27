-- ===========================================================
-- 00009 — RLS for posts/likes/comments, groups, threads, messages
-- ===========================================================

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_mentions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.threads enable row level security;
alter table public.thread_members enable row level security;
alter table public.thread_messages enable row level security;

-- ===========================================================
-- POSTS — feed is visible to all approved members
-- ===========================================================
drop policy if exists "posts approved read" on public.posts;
create policy "posts approved read" on public.posts
  for select using (public.is_approved());

drop policy if exists "posts author insert" on public.posts;
create policy "posts author insert" on public.posts
  for insert with check (
    public.is_approved() and author_id = public.current_profile_id()
  );

drop policy if exists "posts author update" on public.posts;
create policy "posts author update" on public.posts
  for update using (author_id = public.current_profile_id() or public.is_admin())
  with check (author_id = public.current_profile_id() or public.is_admin());

drop policy if exists "posts author delete" on public.posts;
create policy "posts author delete" on public.posts
  for delete using (author_id = public.current_profile_id() or public.is_admin());

-- ===========================================================
-- POST LIKES
-- ===========================================================
drop policy if exists "post_likes approved read" on public.post_likes;
create policy "post_likes approved read" on public.post_likes
  for select using (public.is_approved());

drop policy if exists "post_likes self insert" on public.post_likes;
create policy "post_likes self insert" on public.post_likes
  for insert with check (
    public.is_approved() and user_id = public.current_profile_id()
  );

drop policy if exists "post_likes self delete" on public.post_likes;
create policy "post_likes self delete" on public.post_likes
  for delete using (user_id = public.current_profile_id());

-- ===========================================================
-- POST COMMENTS
-- ===========================================================
drop policy if exists "post_comments approved read" on public.post_comments;
create policy "post_comments approved read" on public.post_comments
  for select using (public.is_approved());

drop policy if exists "post_comments author insert" on public.post_comments;
create policy "post_comments author insert" on public.post_comments
  for insert with check (
    public.is_approved() and author_id = public.current_profile_id()
  );

drop policy if exists "post_comments author delete" on public.post_comments;
create policy "post_comments author delete" on public.post_comments
  for delete using (author_id = public.current_profile_id() or public.is_admin());

-- ===========================================================
-- POST MENTIONS
-- ===========================================================
drop policy if exists "post_mentions approved read" on public.post_mentions;
create policy "post_mentions approved read" on public.post_mentions
  for select using (public.is_approved());

drop policy if exists "post_mentions any insert" on public.post_mentions;
create policy "post_mentions any insert" on public.post_mentions
  for insert with check (public.is_approved());

-- ===========================================================
-- GROUPS
-- ===========================================================
drop policy if exists "groups approved read" on public.groups;
create policy "groups approved read" on public.groups
  for select using (public.is_approved());

drop policy if exists "groups approved create" on public.groups;
create policy "groups approved create" on public.groups
  for insert with check (public.is_approved());

drop policy if exists "groups admin/owner update" on public.groups;
create policy "groups admin/owner update" on public.groups
  for update using (
    public.is_admin() or created_by = public.current_profile_id()
  );

drop policy if exists "groups admin/owner delete" on public.groups;
create policy "groups admin/owner delete" on public.groups
  for delete using (
    public.is_admin() or created_by = public.current_profile_id()
  );

-- ===========================================================
-- GROUP MEMBERS
-- ===========================================================
drop policy if exists "group_members approved read" on public.group_members;
create policy "group_members approved read" on public.group_members
  for select using (public.is_approved());

drop policy if exists "group_members self insert" on public.group_members;
create policy "group_members self insert" on public.group_members
  for insert with check (
    public.is_approved() and user_id = public.current_profile_id()
  );

drop policy if exists "group_members self update" on public.group_members;
create policy "group_members self update" on public.group_members
  for update using (user_id = public.current_profile_id());

drop policy if exists "group_members self delete" on public.group_members;
create policy "group_members self delete" on public.group_members
  for delete using (user_id = public.current_profile_id() or public.is_admin());

-- ===========================================================
-- THREADS (DMs / Groups / Events)
-- ===========================================================
-- Helper: am I a member of this thread?
create or replace function public.is_thread_member(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.thread_members
    where thread_id = p_thread_id and user_id = public.current_profile_id()
  );
$$;

drop policy if exists "threads member read" on public.threads;
create policy "threads member read" on public.threads
  for select using (public.is_approved() and public.is_thread_member(id));

drop policy if exists "threads approved create" on public.threads;
create policy "threads approved create" on public.threads
  for insert with check (public.is_approved());

drop policy if exists "threads member update" on public.threads;
create policy "threads member update" on public.threads
  for update using (public.is_thread_member(id));

-- ===========================================================
-- THREAD MEMBERS
-- ===========================================================
drop policy if exists "thread_members member read" on public.thread_members;
create policy "thread_members member read" on public.thread_members
  for select using (public.is_approved() and public.is_thread_member(thread_id));

drop policy if exists "thread_members self insert" on public.thread_members;
create policy "thread_members self insert" on public.thread_members
  for insert with check (
    public.is_approved() and (
      user_id = public.current_profile_id()
      or public.is_thread_member(thread_id)  -- thread members can add others
    )
  );

drop policy if exists "thread_members self update" on public.thread_members;
create policy "thread_members self update" on public.thread_members
  for update using (user_id = public.current_profile_id());

drop policy if exists "thread_members self delete" on public.thread_members;
create policy "thread_members self delete" on public.thread_members
  for delete using (user_id = public.current_profile_id());

-- ===========================================================
-- THREAD MESSAGES
-- ===========================================================
drop policy if exists "thread_messages member read" on public.thread_messages;
create policy "thread_messages member read" on public.thread_messages
  for select using (
    public.is_approved() and public.is_thread_member(thread_id)
  );

drop policy if exists "thread_messages author insert" on public.thread_messages;
create policy "thread_messages author insert" on public.thread_messages
  for insert with check (
    public.is_approved()
    and author_id = public.current_profile_id()
    and public.is_thread_member(thread_id)
  );

drop policy if exists "thread_messages author update" on public.thread_messages;
create policy "thread_messages author update" on public.thread_messages
  for update using (author_id = public.current_profile_id());

drop policy if exists "thread_messages author delete" on public.thread_messages;
create policy "thread_messages author delete" on public.thread_messages
  for delete using (author_id = public.current_profile_id() or public.is_admin());
