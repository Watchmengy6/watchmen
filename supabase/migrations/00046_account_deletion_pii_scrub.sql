-- ===========================================================
-- 00046 — account deletion: scrub remaining identifier PII
-- ===========================================================
-- soft_delete_self_profile() (00019) already nulled most profile PII on
-- self-delete, but LEFT three identifier columns populated: email,
-- username, and invite_code. This recreates the function to also scrub
-- those so a deleted member leaves no recoverable identity, making the
-- privacy policy accurate.
--
-- Why tombstone values instead of NULL:
--   * profiles.email is NOT NULL
--   * profiles.invite_code is UNIQUE NOT NULL
--   * profiles.username is used for @mentions and is effectively unique
-- So each is set to a per-profile-id tombstone that satisfies NOT NULL +
-- UNIQUE rather than NULL (which would violate the constraints).
--
-- Everything else is unchanged from 00019: status -> rejected,
-- deleted_at = now(), profile kept as a tombstone so retained
-- posts/comments/messages don't orphan, push subscriptions dropped.
-- (Avatar storage files are removed separately in the server action,
-- src/lib/account/actions.ts — chat/post images are intentionally kept
-- because they're attached to retained conversation history.)

create or replace function public.soft_delete_self_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null then
    raise exception 'Not signed in';
  end if;
  update public.profiles
    set
      deleted_at = now(),
      status = 'rejected',
      full_name = 'Deleted member',
      bio = null,
      profile_photo_url = null,
      birthday = null,
      phone = null,
      occupation = null,
      company = null,
      spouse = null,
      kids = null,
      venmo_username = null,
      cashapp_username = null,
      instagram_url = null,
      -- Identifier PII scrub (NOT NULL / UNIQUE → tombstone, not null):
      email = 'deleted+' || v_profile_id::text || '@deleted.invalid',
      username = 'deleted_' || replace(v_profile_id::text, '-', ''),
      invite_code = 'deleted_' || replace(v_profile_id::text, '-', '')
    where id = v_profile_id;
  -- Drop their push subscriptions so they stop getting pushes.
  delete from public.push_subscriptions where user_id = v_profile_id;
end;
$$;
