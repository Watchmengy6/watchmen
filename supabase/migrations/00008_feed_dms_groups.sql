-- ===========================================================
-- 00008 — Feed wall, DMs, Groups (the "real" app schema)
-- ===========================================================
-- This migration adds the tables behind:
--   - the Feed wall (/app/home)
--   - DMs inbox + threads (/app/dms)
--   - Groups w/ chat (/app/groups)
-- ===========================================================

-- ---------- profiles.username (needed for @mentions) ----------
-- Member-facing handle. Distinct from full_name. Lowercase, unique.
-- Backfilled from email local-part on first run; users can edit later.
alter table public.profiles
  add column if not exists username text;

-- Backfill any null usernames from email local-part (lowercased, alnum-only).
update public.profiles
  set username = regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9]', '', 'g')
  where username is null;

-- Ensure unique. If two users had the same local-part we suffix with 4 hex chars.
update public.profiles p
  set username = p.username || '-' || substring(replace(p.id::text, '-', '') from 1 for 4)
  from (
    select username
    from public.profiles
    where username is not null
    group by username
    having count(*) > 1
  ) dup
  where p.username = dup.username
    and p.id <> (
      select min(id) from public.profiles p2 where p2.username = dup.username
    );

create unique index if not exists profiles_username_unique_idx
  on public.profiles(lower(username))
  where username is not null;

-- ---------- enums ----------
do $$ begin
  create type post_kind as enum ('post', 'job', 'need', 'announcement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type thread_kind as enum ('dm', 'group', 'event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type group_category as enum (
    'business','fitness','faith','family','outdoors','finance','social','other'
  );
exception when duplicate_object then null; end $$;

-- ===========================================================
-- FEED WALL
-- ===========================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind post_kind not null default 'post',
  body text not null,
  -- Optional rich-content links:
  tagged_group_id uuid,           -- FK added below once groups exists
  tagged_event_id uuid references public.events(id) on delete set null,
  tagged_meetup_id uuid references public.meetups(id) on delete set null,
  media_url text,
  media_type media_type not null default 'none',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_author_idx on public.posts(author_id);
create index if not exists posts_kind_idx on public.posts(kind);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists post_likes_user_idx on public.post_likes(user_id);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at);

-- Mentions in posts/comments. We resolve @username -> profile_id client-side
-- and store the rendered link here for fast lookup of "where am I mentioned".
create table if not exists public.post_mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);
create index if not exists post_mentions_user_idx on public.post_mentions(mentioned_user_id);

-- ===========================================================
-- GROUPS
-- ===========================================================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category group_category not null default 'other',
  cover_url text,
  is_private boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists groups_category_idx on public.groups(category);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member', -- 'member' | 'admin'
  joined_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);

-- Now that groups exists we can wire the FK on posts.tagged_group_id.
do $$ begin
  alter table public.posts
    add constraint posts_tagged_group_id_fkey
    foreign key (tagged_group_id) references public.groups(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ===========================================================
-- DMs / Threads / Group chat (unified messaging table)
-- ===========================================================
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  kind thread_kind not null,
  -- Optional anchor for group/event threads:
  group_id uuid references public.groups(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  -- Optional human-readable title (group/event threads). Null for DMs.
  title text,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now()
);
create index if not exists threads_kind_idx on public.threads(kind);
create index if not exists threads_group_idx on public.threads(group_id);
create index if not exists threads_event_idx on public.threads(event_id);
create unique index if not exists threads_group_unique_idx on public.threads(group_id) where group_id is not null;
create unique index if not exists threads_event_unique_idx on public.threads(event_id) where event_id is not null;

create table if not exists public.thread_members (
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  muted boolean not null default false,
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);
create index if not exists thread_members_user_idx on public.thread_members(user_id);

create table if not exists public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media_url text,
  media_type media_type not null default 'none',
  -- Optional inline activity card (links to a meetup/event/group/post):
  ref_kind text,
  ref_id uuid,
  reply_to_id uuid references public.thread_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index if not exists thread_messages_thread_idx
  on public.thread_messages(thread_id, created_at desc);
create index if not exists thread_messages_author_idx on public.thread_messages(author_id);
