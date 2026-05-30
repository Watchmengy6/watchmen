-- ===========================================================
-- 00023 — Watchmen Member Number
-- ===========================================================
-- A sequential number assigned to each approved member based on join
-- order. Dustin = #001 (earliest approval), Aaron = #002, and so on.
--
-- We compute on read rather than materialize a column so the number
-- can't drift if someone is deleted or admin's adjust membership_date
-- after the fact. If the member has membership_date set we sort by
-- that (admin can backdate to honor original founding members);
-- otherwise fall back to created_at.
--
-- SECURITY DEFINER so the function can see all approved profiles even
-- if blocked-user RLS hides one from the caller.

create or replace function public.watchmen_member_number(p_profile_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      id,
      row_number() over (
        order by coalesce(membership_date, created_at::date), created_at
      ) as n
    from public.profiles
    where status = 'approved' and deleted_at is null
  )
  select n::integer from ranked where id = p_profile_id;
$$;

grant execute on function public.watchmen_member_number(uuid) to authenticated;
