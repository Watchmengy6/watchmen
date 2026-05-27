-- ===========================================================
-- 00010 — Triggers + helper RPCs for feed/dms/groups
-- ===========================================================

-- Touch updated_at on posts/comments/groups.
drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

drop trigger if exists groups_touch_updated_at on public.groups;
create trigger groups_touch_updated_at
  before update on public.groups
  for each row execute function public.touch_updated_at();

-- ===========================================================
-- Maintain thread.last_message_at + preview on new messages.
-- ===========================================================
create or replace function public.update_thread_last_message()
returns trigger language plpgsql as $$
begin
  update public.threads
  set
    last_message_at = new.created_at,
    last_message_preview = left(coalesce(new.body, ''), 140)
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists thread_messages_bump_last on public.thread_messages;
create trigger thread_messages_bump_last
  after insert on public.thread_messages
  for each row execute function public.update_thread_last_message();

-- ===========================================================
-- Auto-add the group creator as the first (admin) member.
-- ===========================================================
create or replace function public.add_group_creator_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id, role)
      values (new.id, new.created_by, 'admin')
      on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_add_creator on public.groups;
create trigger groups_add_creator
  after insert on public.groups
  for each row execute function public.add_group_creator_as_member();

-- ===========================================================
-- Auto-create + sync a group's thread row when a group is created.
-- ===========================================================
create or replace function public.create_group_thread()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_thread_id uuid;
begin
  insert into public.threads (kind, group_id, title)
    values ('group', new.id, new.name)
    returning id into v_thread_id;
  -- Add the creator as a thread member.
  if new.created_by is not null then
    insert into public.thread_members (thread_id, user_id)
      values (v_thread_id, new.created_by)
      on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_create_thread on public.groups;
create trigger groups_create_thread
  after insert on public.groups
  for each row execute function public.create_group_thread();

-- ===========================================================
-- When a user joins a group, add them to the thread too.
-- ===========================================================
create or replace function public.sync_group_member_to_thread()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_thread_id uuid;
begin
  select id into v_thread_id from public.threads where group_id = new.group_id;
  if v_thread_id is not null then
    insert into public.thread_members (thread_id, user_id)
      values (v_thread_id, new.user_id)
      on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_join_thread on public.group_members;
create trigger group_members_join_thread
  after insert on public.group_members
  for each row execute function public.sync_group_member_to_thread();

-- ===========================================================
-- find_or_create_dm: returns the (single) DM thread between
-- the current user and another user, creating it if needed.
-- ===========================================================
create or replace function public.find_or_create_dm(p_other_profile_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.current_profile_id();
  v_thread_id uuid;
begin
  if v_me is null then
    raise exception 'Not signed in';
  end if;
  if v_me = p_other_profile_id then
    raise exception 'Cannot DM yourself';
  end if;

  -- Look for an existing 2-member DM thread.
  select t.id into v_thread_id
  from public.threads t
  where t.kind = 'dm'
    and (
      select count(*) from public.thread_members tm where tm.thread_id = t.id
    ) = 2
    and exists (select 1 from public.thread_members where thread_id = t.id and user_id = v_me)
    and exists (select 1 from public.thread_members where thread_id = t.id and user_id = p_other_profile_id)
  limit 1;

  if v_thread_id is not null then
    return v_thread_id;
  end if;

  -- Create a fresh DM thread + add both members.
  insert into public.threads (kind) values ('dm') returning id into v_thread_id;
  insert into public.thread_members (thread_id, user_id) values
    (v_thread_id, v_me),
    (v_thread_id, p_other_profile_id);
  return v_thread_id;
end;
$$;

-- ===========================================================
-- Enable Realtime on the message + post tables (for live UI)
-- ===========================================================
do $$ begin
  alter publication supabase_realtime add table public.thread_messages;
exception when duplicate_object then null; when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null; when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.post_likes;
exception when duplicate_object then null; when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.post_comments;
exception when duplicate_object then null; when others then null; end $$;
