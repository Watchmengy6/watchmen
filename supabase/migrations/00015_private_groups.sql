-- ===========================================================
-- 00015 — Enforce groups.is_private
-- ===========================================================
-- Before: every approved member could SELECT every group and its
-- group_members row. is_private was a UI hint only — private groups
-- still leaked.
-- After: private groups are only readable by their own members + admins.
-- Same for the membership list of private groups.

-- Helper: is the caller a member of the given group?
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = public.current_profile_id()
  );
$$;

-- Replace the wide read on `groups` with a visibility-aware one.
drop policy if exists "groups approved read" on public.groups;
create policy "groups approved read" on public.groups
  for select using (
    public.is_approved()
    and (
      is_private = false
      or public.is_admin()
      or public.is_group_member(id)
    )
  );

-- Replace the wide read on `group_members` with the same gate.
drop policy if exists "group_members approved read" on public.group_members;
create policy "group_members approved read" on public.group_members
  for select using (
    public.is_approved()
    and (
      public.is_admin()
      or public.is_group_member(group_id)
      or exists (
        select 1 from public.groups g
        where g.id = group_id and g.is_private = false
      )
    )
  );
