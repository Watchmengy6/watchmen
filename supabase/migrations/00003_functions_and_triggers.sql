-- ============================================================
-- The Watchman — Functions & triggers
-- ============================================================
-- All point awards & moderation actions flow through SECURITY
-- DEFINER functions so RLS can deny direct ledger writes.
-- ============================================================

-- ---------- auto-create profile when an auth.users row is created ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_full_name text;
  v_invite_code text;
  v_inviter_id uuid;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_invite_code := new.raw_user_meta_data->>'invite_code';

  if v_invite_code is not null then
    select id into v_inviter_id from public.profiles where invite_code = v_invite_code limit 1;
  end if;

  insert into public.profiles (
    auth_user_id, full_name, email, phone, profile_photo_url, bio,
    occupation, company, instagram_url, interests, invited_by_user_id, status
  ) values (
    new.id,
    v_full_name,
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'profile_photo_url',
    new.raw_user_meta_data->>'bio',
    new.raw_user_meta_data->>'occupation',
    new.raw_user_meta_data->>'company',
    new.raw_user_meta_data->>'instagram_url',
    coalesce(
      (select array_agg(value::text) from jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'interests', '[]'::jsonb))),
      '{}'::text[]
    ),
    v_inviter_id,
    'pending'
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- updated_at touch trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists messages_touch_updated_at on public.messages;
create trigger messages_touch_updated_at
  before update on public.messages
  for each row execute function public.touch_updated_at();

-- ---------- auto-create event chat when event is created ----------
create or replace function public.create_event_chat()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chats (type, event_id, title)
  values ('event', new.id, new.title)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists events_create_chat on public.events;
create trigger events_create_chat
  after insert on public.events
  for each row execute function public.create_event_chat();

-- ---------- centralized points award (server-side only) ----------
create or replace function public.award_points(
  p_user_id uuid,
  p_action_type text,
  p_points integer,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_daily_cap integer default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_count integer;
begin
  if p_user_id is null or p_points = 0 then
    return;
  end if;

  -- optional daily cap per action_type
  if p_daily_cap is not null then
    select count(*) into v_today_count
      from public.points_ledger
      where user_id = p_user_id
        and action_type = p_action_type
        and created_at > now() - interval '1 day';
    if v_today_count >= p_daily_cap then
      return;
    end if;
  end if;

  insert into public.points_ledger (user_id, action_type, points, related_entity_type, related_entity_id)
  values (p_user_id, p_action_type, p_points, p_related_entity_type, p_related_entity_id);

  update public.profiles set points_total = points_total + p_points where id = p_user_id;
end;
$$;

-- ---------- approve / reject member (admin only) ----------
create or replace function public.approve_member(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_inviter_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve members';
  end if;

  update public.profiles set status = 'approved' where id = p_target_profile_id;

  select invited_by_user_id into v_inviter_id from public.profiles where id = p_target_profile_id;

  -- inviter earns +50 for successful approval
  if v_inviter_id is not null then
    perform public.award_points(
      v_inviter_id, 'invite_approved', 50, 'profile', p_target_profile_id, null
    );
    insert into public.notifications (user_id, type, title, body, related_entity_type, related_entity_id)
    values (
      v_inviter_id, 'invite_approved', 'Your invite was approved',
      'A brother you invited just joined The Watchman.',
      'profile', p_target_profile_id
    );
  end if;

  -- welcome notification to approved member
  insert into public.notifications (user_id, type, title, body)
  values (
    p_target_profile_id, 'approved', 'You''re in',
    'Welcome to The Watchman. The main room is open.'
  );
end;
$$;

create or replace function public.reject_member(p_target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject members';
  end if;
  update public.profiles set status = 'rejected' where id = p_target_profile_id;
end;
$$;

-- ---------- set role (super_admin only) ----------
create or replace function public.set_role(p_target_profile_id uuid, p_new_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select role from public.profiles where auth_user_id = auth.uid()) <> 'super_admin' then
    raise exception 'Only super_admin can change roles';
  end if;
  update public.profiles set role = p_new_role where id = p_target_profile_id;
end;
$$;

-- ---------- RSVP with points ----------
create or replace function public.rsvp_event(p_event_id uuid, p_status rsvp_status default 'going')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_existing rsvp_status;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;

  select status into v_existing from public.event_rsvps
    where event_id = p_event_id and user_id = v_profile_id;

  insert into public.event_rsvps (event_id, user_id, status)
  values (p_event_id, v_profile_id, p_status)
  on conflict (event_id, user_id) do update set status = excluded.status;

  -- award once per event when first going
  if (v_existing is null or v_existing <> 'going') and p_status = 'going' then
    perform public.award_points(v_profile_id, 'rsvp_going', 5, 'event', p_event_id, null);
  end if;
end;
$$;

-- ---------- check-in with geolocation + points ----------
create or replace function public.check_in_event(
  p_event_id uuid,
  p_latitude double precision,
  p_longitude double precision
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_rsvp_id uuid;
  v_already_checked boolean;
begin
  v_profile_id := public.current_profile_id();
  if v_profile_id is null or not public.is_approved() then
    raise exception 'Not approved';
  end if;

  select id, checked_in into v_rsvp_id, v_already_checked
    from public.event_rsvps
    where event_id = p_event_id and user_id = v_profile_id;

  if v_rsvp_id is null then
    -- auto-RSVP on check-in
    insert into public.event_rsvps (event_id, user_id, status, checked_in, checked_in_at, checkin_latitude, checkin_longitude)
    values (p_event_id, v_profile_id, 'going', true, now(), p_latitude, p_longitude);
    perform public.award_points(v_profile_id, 'check_in', 25, 'event', p_event_id, null);
    perform public.award_points(v_profile_id, 'rsvp_going', 5, 'event', p_event_id, null);
  elsif not v_already_checked then
    update public.event_rsvps
      set checked_in = true, checked_in_at = now(),
          checkin_latitude = p_latitude, checkin_longitude = p_longitude
      where id = v_rsvp_id;
    perform public.award_points(v_profile_id, 'check_in', 25, 'event', p_event_id, null);
  end if;
end;
$$;

-- ---------- award points for message / reaction / poll / vote ----------
-- Called via after-insert triggers with small daily caps to prevent farming.

create or replace function public.points_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pts integer; v_action text;
begin
  if new.media_type = 'video' then v_pts := 5; v_action := 'message_video';
  elsif new.media_type = 'image' then v_pts := 3; v_action := 'message_image';
  else v_pts := 1; v_action := 'message_text';
  end if;
  perform public.award_points(new.user_id, v_action, v_pts, 'message', new.id, 30);
  return new;
end; $$;

drop trigger if exists messages_award_points on public.messages;
create trigger messages_award_points
  after insert on public.messages
  for each row execute function public.points_on_message();

create or replace function public.points_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_points(new.user_id, 'reaction', 1, 'message', new.message_id, 30);
  return new;
end; $$;

drop trigger if exists reactions_award_points on public.message_reactions;
create trigger reactions_award_points
  after insert on public.message_reactions
  for each row execute function public.points_on_reaction();

create or replace function public.points_on_poll_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_points(new.created_by_user_id, 'poll_created', 3, 'poll', new.id, 5);
  return new;
end; $$;

drop trigger if exists polls_award_points on public.polls;
create trigger polls_award_points
  after insert on public.polls
  for each row execute function public.points_on_poll_created();

create or replace function public.points_on_poll_vote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_points(new.user_id, 'poll_vote', 1, 'poll', new.poll_id, 20);
  return new;
end; $$;

drop trigger if exists poll_votes_award_points on public.poll_votes;
create trigger poll_votes_award_points
  after insert on public.poll_votes
  for each row execute function public.points_on_poll_vote();

-- ---------- profile completion bonuses (idempotent) ----------
create or replace function public.points_on_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_has_completed boolean;
  v_has_instagram boolean;
begin
  v_has_completed := coalesce(new.bio, '') <> ''
    and coalesce(new.occupation, '') <> ''
    and array_length(new.interests, 1) >= 1
    and coalesce(new.profile_photo_url, '') <> '';

  if v_has_completed and not (
    coalesce(old.bio, '') <> ''
    and coalesce(old.occupation, '') <> ''
    and coalesce(array_length(old.interests, 1), 0) >= 1
    and coalesce(old.profile_photo_url, '') <> ''
  ) then
    perform public.award_points(new.id, 'profile_completed', 10, 'profile', new.id, null);
  end if;

  v_has_instagram := coalesce(new.instagram_url, '') <> '';
  if v_has_instagram and coalesce(old.instagram_url, '') = '' then
    perform public.award_points(new.id, 'profile_instagram', 5, 'profile', new.id, null);
  end if;

  return new;
end; $$;

drop trigger if exists profiles_award_completion on public.profiles;
create trigger profiles_award_completion
  after update on public.profiles
  for each row execute function public.points_on_profile_update();

-- ---------- realtime publication: chat + reactions + polls + notifications ----------
do $$
declare
  v_tables text[] := array[
    'messages','message_reactions','polls','poll_options',
    'poll_votes','notifications','event_rsvps'
  ];
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach v_table in array v_tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end $$;
