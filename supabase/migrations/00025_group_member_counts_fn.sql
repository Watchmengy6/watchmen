-- ===========================================================
-- 00025 — group_member_counts helper
-- ===========================================================
-- Replaces "fetch every group_members row and count in JS" with a
-- single grouped query. Returns one row per group_id in the input
-- array. Used by /app/groups so the payload doesn't scale with total
-- memberships.

create or replace function public.group_member_counts(p_group_ids uuid[])
returns table(group_id uuid, member_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select gm.group_id, count(*)::bigint as member_count
  from public.group_members gm
  where gm.group_id = any(p_group_ids)
  group by gm.group_id;
$$;

grant execute on function public.group_member_counts(uuid[]) to authenticated;
