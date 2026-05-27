# The Watchman

Private invite-only networking app for the St. Pete / Tampa Bay men's group.
Mobile-first PWA built on Next.js 14 + Supabase. Apple-inspired, black + gold,
dark mode first.

## Quick start

```bash
# 1. install
npm install

# 2. configure env
cp .env.example .env.local
#    fill in SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY, SITE_URL

# 3. run the database migrations against your Supabase project
#    (Supabase Studio → SQL editor → paste each file in order)
supabase/migrations/00001_initial_schema.sql
supabase/migrations/00002_rls_policies.sql
supabase/migrations/00003_functions_and_triggers.sql
supabase/migrations/00004_storage_buckets.sql

# 4. sign Dustin up via /signup, then run 00005 (replacing the email)
supabase/migrations/00005_seed_admin.sql

# 5. dev server
npm run dev
# open http://localhost:3000
```

## Architecture

- **Frontend**: Next.js 14 App Router, React Server Components for reads,
  server actions for writes, Tailwind for styling.
- **Auth**: Supabase Auth with `@supabase/ssr` cookie handling. Middleware
  refreshes the session and gates `/app/*` (approved members) and `/admin/*`
  (admin/super_admin) on every request.
- **Database**: Postgres on Supabase. Row Level Security on every table.
  All point awards and moderator actions go through `SECURITY DEFINER`
  functions so members can't write to the ledger directly.
- **Realtime**: Supabase Realtime (Postgres CDC) for chat messages,
  reactions, polls, votes, and notifications.
- **Storage**: three public buckets — `avatars`, `chat-media`, `event-images`.
  Folder-prefix policies enforce per-user write scope.
- **PWA**: `manifest.webmanifest` served from `/manifest.webmanifest`,
  Apple meta tags in `layout.tsx`. Add icon PNGs to `public/` before launch.

## Database tables

| Table              | Purpose                                                    |
|--------------------|------------------------------------------------------------|
| profiles           | One row per member, linked to `auth.users`                 |
| invites            | Optional one-time codes (member's permanent link lives on profile) |
| events             | Admin-created events                                       |
| event_rsvps        | RSVP + check-in (geolocation, timestamp)                   |
| chats              | Singleton main chat + one per event (auto-created)         |
| messages           | Chat messages with optional image/video media              |
| message_reactions  | One row per (message, user, type)                          |
| polls / poll_options / poll_votes | Polls in main or event chats               |
| points_ledger      | Append-only audit log of every point award                 |
| notifications      | In-app notifications (per user)                            |
| shops              | Placeholder for future Shopify integration                 |

### Helper functions (SECURITY DEFINER)

- `award_points(user, action, points, …, daily_cap)` — central award API,
  also updates `profiles.points_total`.
- `approve_member(profile)` / `reject_member(profile)` — admin-only.
- `rsvp_event(event, status)` — handles RSVP + awards.
- `check_in_event(event, lat, lng)` — handles check-in, auto-RSVPs.
- `set_role(profile, role)` — super_admin only.

### Points system

| Action                     | Points | Daily cap |
|---------------------------|-------:|----------:|
| Text message              | +1     | 30        |
| Image post                | +3     | 30        |
| Video post                | +5     | 30        |
| Reaction                  | +1     | 30        |
| Poll created              | +3     | 5         |
| Poll vote                 | +1     | 20        |
| RSVP "going" (event)      | +5     | — (once per event) |
| Check-in at event         | +25    | — (once per event) |
| Meetup RSVP "going"       | +2     | 10/day             |
| Meetup check-in           | +10    | — (once per meetup) |
| Invite approved (inviter) | +50    | unlimited |
| Profile completed         | +10    | once      |
| Add Instagram             | +5     | once      |

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL       # https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  # safe to expose
SUPABASE_SERVICE_ROLE_KEY      # NEVER expose. Server-only.
NEXT_PUBLIC_SITE_URL           # e.g. https://thewatchman.app
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add the four env vars above (mark `SUPABASE_SERVICE_ROLE_KEY` as secret).
4. Set `NEXT_PUBLIC_SITE_URL` to your custom domain (Dustin's domain).
5. In Supabase Auth settings, add the production URL to allowed redirects.

## What's built (MVP)

- Auth + invite-only signup w/ inviter tracking
- Pending approval screen + admin approve/reject
- Profile editor with avatar upload, Instagram, interests
- Member directory + member profile pages
- Personal invite link with copy/share + impact stats
- Realtime main chat: text, images, videos, reactions, polls
- Events list, detail, RSVP, geolocation check-in
- Auto-generated event chat (gated by RSVP)
- Polls in any chat
- Points ledger with daily caps + automatic awards via triggers
- Leaderboard preview on home + full admin leaderboard
- Admin dashboard: pending, members, events CRUD, leaderboard, settings
- In-app notifications + unread bell on home
- PWA manifest + Apple add-to-home-screen meta

## What's left for next batches

- Replace `MapPreview` placeholder with a real Google Maps embed (just plug an API key into the component).
- Web push notifications (Service Worker + VAPID keys + subscriptions table). Hooks are in place; pick a provider.
- Native iOS shell (Capacitor or React Native wrap) once the PWA is stable.
- Shopify integration — `shops` table + read access exist; add a Shop tab once a store is ready.
- Generated TypeScript DB types via `supabase gen types typescript --linked` (replace the hand-written `src/types/database.ts`).
- App icons in `public/` — see `public/README.txt`.
- Push hooks for: new event, event updated, mention in event chat, approval accepted, points earned.
- Per-event location vote (the polls system is generic; just create a poll inside the event chat).

## Risks / limitations

- The middleware does a DB lookup on every request for `/app` and `/admin`.
  Fine for an MVP at this scale; if you grow to many concurrent users, cache
  status in a signed cookie or JWT custom claim.
- `chat-media` and `avatars` buckets are public. URLs aren't guessable but
  the underlying media is internet-reachable if someone shares a link. For
  a tighter community feel, switch buckets to private and use signed URLs.
- Storage RLS uses folder prefix `auth.uid()`. If you migrate users between
  buckets, write a one-time script — no UI for that yet.
- Geolocation check-in trusts the client. For real geofencing, add server-side
  distance check against `events.latitude/longitude`.

## Project structure

```
src/
  app/
    (app)/                 ← member-only routes (auth-gated layout)
      home/  chat/  events/  members/  profile/  invite/  notifications/
    (admin)/admin/         ← admin-only (role-gated layout)
      pending/ members/ events/ leaderboard/ settings/
    invite/[code]/         ← public landing for an invite link
    login/  signup/  pending/
    manifest.webmanifest/  ← PWA manifest route
  components/              ← UI primitives + feature pieces
    ui/  nav/  home/  chat/  events/  members/  polls/  profile/
  lib/
    supabase/              ← client / server / middleware / admin
    auth/                  ← actions + gates
    chat/  events/  polls/ profile/ notifications/ admin/
    utils/
  types/database.ts        ← TS types mirroring the schema
  middleware.ts            ← auth refresh + route protection
supabase/migrations/       ← run in numeric order
public/                    ← drop icons here
```
