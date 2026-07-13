-- 00052 — Reopen meetup creation to every approved member (July 2026).
--
-- Reverses the 00020 "meetup lockdown": Dustin now wants brothers to
-- self-organize meetups (coffee / workouts / drinks) with the meetup
-- auto-posting to the feed. Official EVENTS remain admin-gated —
-- nothing here touches events policies.
--
-- Restores the original 00006 policy shape: you may only insert a
-- meetup you yourself host, and only while approved.

drop policy if exists "meetups admin insert" on public.meetups;
drop policy if exists "meetups approved insert" on public.meetups;
create policy "meetups approved insert" on public.meetups
  for insert with check (
    host_user_id = public.current_profile_id() and public.is_approved()
  );
