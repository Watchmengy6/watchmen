-- 00053 — Group creation becomes REQUEST + APPROVE (July 2026).
--
-- Dustin saw a member create a group unilaterally and wants control —
-- but instead of hard-locking creation to super admins, members can
-- REQUEST a group: it's created with status='pending', visible only to
-- its creator and admins, and goes live when an admin approves it in
-- the Command Room. Existing groups default to 'active' (unchanged).

alter table public.groups
  add column if not exists status text not null default 'active'
    check (status in ('pending', 'active'));

-- Visibility: active groups behave exactly as before; pending groups
-- are visible ONLY to their creator (so they can see "waiting for
-- approval") and to admins (so they can review).
drop policy if exists "groups approved read" on public.groups;
create policy "groups approved read" on public.groups
  for select using (
    public.is_approved()
    and (
      status = 'active'
      or created_by = public.current_profile_id()
      or public.is_admin()
    )
  );

-- Insert stays open to all approved members (that IS the request);
-- update/delete policies (admin/owner) already cover approve + reject.
