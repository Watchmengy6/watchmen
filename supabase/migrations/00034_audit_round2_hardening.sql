-- ===========================================================
-- 00034 — Security/debug round 2 hardening
-- ===========================================================
-- Findings from the full audit pass:
--   1. Feed poll votes accepted any option_index < 10 with no check
--      against the post's actual option count (phantom-bucket / vote
--      stuffing). Add an integrity trigger.
--   2. Media-only DM/group messages leaked their literal body
--      (e.g. "[image]") into threads.last_message_preview. Make the
--      preview media-aware, and give the trigger a fixed search_path.
--   3. post_mentions insert was open to any approved member pointing a
--      mention at anyone on any post/comment (notification forging).
--      Require the inserter to own the referenced post/comment.

-- ===========================================================
-- 1. Feed poll vote option integrity
-- ===========================================================
create or replace function public.validate_post_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_opts text[];
  v_len int;
begin
  select poll_options into v_opts from public.posts where id = new.post_id;
  v_len := array_length(v_opts, 1);
  if v_len is null then
    raise exception 'Post % has no poll', new.post_id;
  end if;
  if new.option_index < 0 or new.option_index >= v_len then
    raise exception 'Invalid poll option % (poll has % options)', new.option_index, v_len;
  end if;
  return new;
end;
$$;

drop trigger if exists post_poll_votes_validate on public.post_poll_votes;
create trigger post_poll_votes_validate
  before insert or update on public.post_poll_votes
  for each row execute function public.validate_post_poll_vote();

-- ===========================================================
-- 2. Media-aware thread preview (+ fixed search_path)
-- ===========================================================
-- Photos/videos no longer dump a placeholder body into the inbox
-- preview; text messages still show the first 140 chars.
create or replace function public.update_thread_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.threads
  set
    last_message_at = new.created_at,
    last_message_preview = case
      when new.media_type = 'video' then '🎥 Video'
      when new.media_type = 'image' then '📷 Photo'
      else left(coalesce(new.body, ''), 140)
    end
  where id = new.thread_id;
  return new;
end;
$$;

-- ===========================================================
-- 3. post_mentions — only the post/comment author may mention
-- ===========================================================
drop policy if exists "post_mentions any insert" on public.post_mentions;
drop policy if exists "post_mentions author insert" on public.post_mentions;
create policy "post_mentions author insert" on public.post_mentions
  for insert with check (
    public.is_approved()
    and (
      (post_mentions.post_id is not null and exists (
        select 1 from public.posts p
        where p.id = post_mentions.post_id
          and p.author_id = public.current_profile_id()
      ))
      or
      (post_mentions.comment_id is not null and exists (
        select 1 from public.post_comments c
        where c.id = post_mentions.comment_id
          and c.author_id = public.current_profile_id()
      ))
    )
  );
