-- ===========================================================
-- 00017 — Main Room is admin-write-only
-- ===========================================================
-- The singleton chats(type='main') room is meant to be leadership's
-- broadcast pulpit. Approved members can READ it, but can't post raw
-- messages there — they post on the feed instead. Auto-broadcasts from
-- meetup/event creation bypass this rule by using the service-role
-- client in the server action, which is not subject to RLS.

drop policy if exists "messages insert self" on public.messages;
create policy "messages insert if can write to chat" on public.messages
  for insert with check (
    user_id = public.current_profile_id()
    and public.is_approved()
    and exists (
      select 1 from public.chats c
      where c.id = chat_id
        and (
          -- Main room: admin-only direct writes.
          (c.type = 'main' and public.is_admin())
          -- Event room: any RSVP'd-going approved member.
          or (
            c.type = 'event'
            and exists (
              select 1 from public.event_rsvps r
              where r.event_id = c.event_id
                and r.user_id = public.current_profile_id()
                and r.status = 'going'
            )
          )
        )
    )
  );
