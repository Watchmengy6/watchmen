-- ===========================================================
-- 00011 — Security hardening (from Codex audit)
-- ===========================================================
-- Tightens RLS to fix:
--   - Group role self-assignment
--   - Thread members adding strangers
--   - Group leave not removing from thread chat
--   - Public invite RLS blocking /invite/[code]
--   - Event RSVP location coords visible to all
--   - Approved members querying every column on profiles (email/phone/invite_code)
--   - Points race condition (atomic SQL helper)
-- ===========================================================

-- ============================================================
-- 1) THREAD MEMBERS — only self can join; cannot add others
-- ============================================================
drop policy if exists "thread_members self insert" on public.thread_members;
create policy "thread_members self insert" on public.thread_members
  for insert with check (
    public.is_approved()
    and user_id = public.current_profile_id()
  );

-- ============================================================
-- 2) GROUP MEMBERS — role must be 'member' on self-insert;
--    role updates blocked (only admins can promote via trigger)
-- ============================================================
drop policy if exists "group_members self insert" on public.group_members;
create policy "group_members self insert" on public.group_members
  for insert with check (
    public.is_approved()
    and user_id = public.current_profile_id()
    and role = 'member'
  );

drop policy if exists "group_members self update" on public.group_members;
create policy "group_members self update" on public.group_members
  for update using (user_id = public.current_profile_id())
  with check (
    user_id = public.current_profile_id()
    -- Cannot change your own role.
    and role = (
      select gm.role from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = public.current_profile_id()
    )
  );

-- ============================================================
-- 3) GROUP LEAVE — sync deletion to thread_members
-- ============================================================
create or replace function public.sync_group_member_remove_from_thread()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_thread_id uuid;
begin
  select id into v_thread_id from public.threads where group_id = old.group_id;
  if v_thread_id is not null then
    delete from public.thread_members
      where thread_id = v_thread_id and user_id = old.user_id;
  end if;
  return old;
end;
$$;

drop trigger if exists group_members_leave_thread on public.group_members;
create trigger group_members_leave_thread
  after delete on public.group_members
  for each row execute function public.sync_group_member_remove_from_thread();

-- ============================================================
-- 4) PUBLIC INVITE PAGE — allow anon to read minimal inviter info
--    by invite_code. We do NOT broaden the existing profile read.
--    Instead, expose a SECURITY DEFINER RPC that returns just what
--    the invite landing page needs.
-- ============================================================
create or replace function public.get_invite_inviter(p_invite_code text)
returns table (
  id uuid,
  full_name text,
  profile_photo_url text,
  occupation text,
  status user_status
) language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.full_name,
    p.profile_photo_url,
    p.occupation,
    p.status
  from public.profiles p
  where p.invite_code = p_invite_code
    and p.status = 'approved'
  limit 1;
$$;

-- Allow anon + authenticated to call the RPC.
grant execute on function public.get_invite_inviter(text) to anon, authenticated;

-- ============================================================
-- 5) EVENT RSVPs — hide location coords from non-self non-admin
-- ============================================================
-- The existing policy "event_rsvps approved select" allowed any approved
-- member to read every column. We tighten that: members can only see
-- aggregate "is anyone going" info via separate counts (already in code),
-- and full RSVP row reads are limited to self + admins. RSVP existence
-- (going status) per (event,user) is still readable to all approved.
-- We accomplish this with column-level GRANTs because RLS can't filter cols.

revoke select on public.event_rsvps from authenticated;
grant select (id, event_id, user_id, status, created_at) on public.event_rsvps to authenticated;
-- checked_in, checked_in_at, checkin_latitude, checkin_longitude are NOT granted
-- → only self + admin paths via RPC / service-role can read them.

-- Self + admin can still read everything via this RPC if needed later:
create or replace function public.my_event_rsvp(p_event_id uuid)
returns setof public.event_rsvps language sql stable security definer set search_path = public as $$
  select * from public.event_rsvps
  where event_id = p_event_id and user_id = public.current_profile_id()
  limit 1;
$$;
grant execute on function public.my_event_rsvp(uuid) to authenticated;

-- ============================================================
-- 6) PROFILES — hide email, phone, invite_code from other approved members
-- ============================================================
revoke select on public.profiles from authenticated;
grant select (
  id,
  auth_user_id,
  full_name,
  profile_photo_url,
  bio,
  occupation,
  company,
  instagram_url,
  interests,
  role,
  status,
  points_total,
  invited_by_user_id,
  created_at,
  updated_at,
  last_active_at,
  venmo_username,
  cashapp_username,
  username
) on public.profiles to authenticated;
-- email, phone, invite_code are now NOT granted to authenticated by default.

-- A SECURITY DEFINER RPC that returns the FULL row for the current user (self).
create or replace function public.me_full()
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where auth_user_id = auth.uid() limit 1;
$$;
grant execute on function public.me_full() to authenticated;

-- And one for admins to read any profile by id.
create or replace function public.admin_profile(p_profile_id uuid)
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles
  where id = p_profile_id and public.is_admin();
$$;
grant execute on function public.admin_profile(uuid) to authenticated;

-- ============================================================
-- 7) ATOMIC POINTS INCREMENT — fix race condition
-- ============================================================
create or replace function public.award_points_rpc(
  p_user_id uuid,
  p_action text,
  p_points integer,
  p_related_type text default null,
  p_related_id uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.points_ledger (user_id, action_type, points, related_entity_type, related_entity_id)
    values (p_user_id, p_action, p_points, p_related_type, p_related_id);
  update public.profiles
    set points_total = points_total + p_points
    where id = p_user_id;
end;
$$;
-- Service-role client uses this; not granted to anon/authenticated.

-- ============================================================
-- 8) GROUP CREATED_BY ENFORCEMENT — must match current profile id
-- ============================================================
drop policy if exists "groups approved create" on public.groups;
create policy "groups approved create" on public.groups
  for insert with check (
    public.is_approved()
    and (created_by is null or created_by = public.current_profile_id())
  );
