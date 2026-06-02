-- ===========================================================
-- 00026 — Fix find_or_create_dm race condition
-- ===========================================================
-- The old read-then-insert flow could fork two threads if both members
-- tapped DM at the same instant. Strategy: add a deterministic
-- "canonical pair key" column on threads (ordered concat of the two
-- user ids), back it with a unique index, and have the RPC do an
-- INSERT ON CONFLICT DO NOTHING then look up by the key.

-- ---------- canonical pair key ----------
alter table public.threads
  add column if not exists dm_pair_key text;

-- Backfill existing DM threads with their pair key based on the two
-- thread_members rows. We do this once; future inserts go through the
-- RPC which sets the key explicitly.
update public.threads t
set dm_pair_key = pair.pair_key
from (
  select
    tm1.thread_id,
    least(tm1.user_id::text, tm2.user_id::text) || ':' ||
    greatest(tm1.user_id::text, tm2.user_id::text) as pair_key
  from public.thread_members tm1
  join public.thread_members tm2
    on tm2.thread_id = tm1.thread_id and tm2.user_id <> tm1.user_id
  group by tm1.thread_id, pair_key
) pair
where t.id = pair.thread_id
  and t.kind = 'dm'
  and t.dm_pair_key is null;

-- Unique index on the pair key for dm threads only.
create unique index if not exists threads_dm_pair_unique
  on public.threads(dm_pair_key)
  where kind = 'dm' and dm_pair_key is not null;

-- ---------- new race-safe RPC ----------
create or replace function public.find_or_create_dm(p_other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid;
  v_pair_key text;
  v_thread_id uuid;
begin
  v_me := public.current_profile_id();
  if v_me is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;
  if v_me = p_other_profile_id then
    raise exception 'Cannot DM yourself';
  end if;

  -- Deterministic, order-independent pair key.
  v_pair_key := least(v_me::text, p_other_profile_id::text)
                || ':' ||
                greatest(v_me::text, p_other_profile_id::text);

  -- Try to find an existing thread with this pair key first.
  select id into v_thread_id
  from public.threads
  where kind = 'dm' and dm_pair_key = v_pair_key
  limit 1;
  if v_thread_id is not null then
    return v_thread_id;
  end if;

  -- Insert with ON CONFLICT so concurrent callers converge on the
  -- same row. Whoever wins the unique index gets the id we return.
  insert into public.threads (kind, dm_pair_key)
  values ('dm', v_pair_key)
  on conflict (dm_pair_key) where (kind = 'dm' and dm_pair_key is not null)
  do nothing
  returning id into v_thread_id;

  -- If we lost the race, look up the winning row.
  if v_thread_id is null then
    select id into v_thread_id
    from public.threads
    where kind = 'dm' and dm_pair_key = v_pair_key
    limit 1;
  end if;

  -- Ensure both members are added. Self-insert is fine for either
  -- caller; the second one's row is rejected by the unique index on
  -- thread_members(thread_id, user_id).
  insert into public.thread_members (thread_id, user_id)
  values (v_thread_id, v_me)
  on conflict do nothing;
  insert into public.thread_members (thread_id, user_id)
  values (v_thread_id, p_other_profile_id)
  on conflict do nothing;

  return v_thread_id;
end;
$$;
grant execute on function public.find_or_create_dm(uuid) to authenticated;
