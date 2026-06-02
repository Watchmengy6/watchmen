-- ===========================================================
-- 00031 — Event rooms onto the thread infrastructure
-- ===========================================================
-- Event chat used to live on chats/messages/message_reactions/polls
-- (the legacy stack we partially dismantled when master chat went
-- away). Per Codex perf audit, those event-room pages still ran the
-- old multi-query hydration and had no load-older pagination. Migrate
-- them to threads/thread_messages so they get the same client as DMs
-- and group chats.
--
-- Strategy:
--   1. Backfill: for every published event, ensure a thread row with
--      kind='event', event_id set, title = event.title.
--   2. Trigger: any new event auto-creates its thread.
--   3. RSVP sync: any event_rsvps row with status='going' adds the
--      user to thread_members; status changing away removes them.
--   4. Trigger: backfill above logic for existing rsvps.

-- ---------- 1. backfill threads for existing events ----------
insert into public.threads (kind, event_id, title)
select 'event', e.id, e.title
from public.events e
where e.status in ('published', 'completed')
  and not exists (
    select 1 from public.threads t
    where t.kind = 'event' and t.event_id = e.id
  );

-- ---------- 2. auto-create thread on new event ----------
create or replace function public.events_create_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('published', 'completed') then
    insert into public.threads (kind, event_id, title)
    values ('event', new.id, new.title)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_events_create_thread on public.events;
create trigger trg_events_create_thread
  after insert on public.events
  for each row execute function public.events_create_thread();

-- ---------- 3. RSVP-going syncs to thread membership ----------
create or replace function public.event_rsvps_sync_thread_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_thread_id uuid;
begin
  select id into v_thread_id
    from public.threads
    where kind = 'event' and event_id = coalesce(new.event_id, old.event_id);
  if v_thread_id is null then return coalesce(new, old); end if;

  if tg_op = 'DELETE' then
    delete from public.thread_members
      where thread_id = v_thread_id and user_id = old.user_id;
    return old;
  end if;

  if new.status = 'going' then
    insert into public.thread_members (thread_id, user_id)
    values (v_thread_id, new.user_id)
    on conflict do nothing;
  else
    delete from public.thread_members
      where thread_id = v_thread_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_event_rsvps_sync_thread_member on public.event_rsvps;
create trigger trg_event_rsvps_sync_thread_member
  after insert or update of status or delete on public.event_rsvps
  for each row execute function public.event_rsvps_sync_thread_member();

-- ---------- 4. backfill thread_members from existing going RSVPs ----------
insert into public.thread_members (thread_id, user_id)
select t.id, r.user_id
from public.event_rsvps r
join public.threads t on t.kind = 'event' and t.event_id = r.event_id
where r.status = 'going'
on conflict do nothing;
