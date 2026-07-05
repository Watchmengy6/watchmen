-- 00050 — Comment likes + single-level comment replies (July 2026).
--
-- 1. post_comment_likes — mirrors post_likes exactly (composite PK,
--    approved-read / self-insert / self-delete RLS).
-- 2. post_comments.parent_comment_id — one level of threading. A reply
--    always points at a TOP-LEVEL comment (the server action flattens
--    replies-to-replies onto the original parent, Instagram-style), so
--    render logic never recurses. on delete cascade: deleting a parent
--    comment removes its replies; deleting a comment removes its likes.

-- ===========================================================
-- 1. COMMENT LIKES
-- ===========================================================
create table if not exists public.post_comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists post_comment_likes_user_idx
  on public.post_comment_likes(user_id);

alter table public.post_comment_likes enable row level security;

drop policy if exists "comment_likes approved read" on public.post_comment_likes;
create policy "comment_likes approved read" on public.post_comment_likes
  for select using (public.is_approved());

drop policy if exists "comment_likes self insert" on public.post_comment_likes;
create policy "comment_likes self insert" on public.post_comment_likes
  for insert with check (
    public.is_approved() and user_id = public.current_profile_id()
  );

drop policy if exists "comment_likes self delete" on public.post_comment_likes;
create policy "comment_likes self delete" on public.post_comment_likes
  for delete using (user_id = public.current_profile_id());

-- ===========================================================
-- 2. COMMENT REPLIES (single level)
-- ===========================================================
alter table public.post_comments
  add column if not exists parent_comment_id uuid
    references public.post_comments(id) on delete cascade;

create index if not exists post_comments_parent_idx
  on public.post_comments(parent_comment_id);
