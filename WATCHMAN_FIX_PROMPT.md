# Watchman — Fix & Harden Prompt

Paste this into Codex / Claude Code running inside the Watchman repo. It's built from a three-pass audit (security, architecture, performance). Every item cites the real file so you can go straight to it.

---

You are hardening **Watchman**, a **live, App-Store-shipped** community app: Next.js 14 (App Router) + Supabase (Postgres + RLS + Realtime) + Capacitor 8 (iOS WebView shell). Real users are on it. Work carefully.

## Ground rules (do not skip)
1. **Never test destructive changes against production.** Use a staging Supabase project / branch DB. Take a DB backup (or snapshot) before running any migration.
2. **All schema/RLS/function changes are new, forward-only, numbered migrations** in `supabase/migrations/` (continue the `000XX_` sequence). Never edit past migrations. Make them idempotent (`if not exists`, `create or replace`, `drop policy if exists`).
3. **After each RLS/policy change, verify the effective policy** on the DB (`select * from pg_policies where tablename = '...'`) — the migration history has had a policy get silently reverted before (00033→00040→00044), so confirm the live state, don't trust the file order.
4. **Add tests as you go.** There is currently no test suite — that's why a security regression slipped through. Stand up a minimal harness (RLS policy tests + critical-path integration tests) and add a test for every P0/P1 fix so it can't regress.
5. Work in small PRs, one priority tier at a time. Explain what each change does and how you verified it.

---

## P0 — Security (do first)

**P0.1 — Lock down the points functions (privilege / data forgery).**
`award_points` (`supabase/migrations/00003_functions_and_triggers.sql:103`) and `award_points_rpc` (`00011_security_hardening.sql:168`) are `SECURITY DEFINER`, take `p_user_id` + `p_points` as parameters, have **no internal caller guard**, and inherit the default `PUBLIC` execute grant — so any authenticated user can call `/rest/v1/rpc/award_points` and forge their own (or wreck a rival's) leaderboard points.
→ New migration: `REVOKE EXECUTE` on both from `public, authenticated`. Better, do a blanket `revoke execute on all functions in schema public from public, authenticated;` then **re-grant execute only to the RPCs genuinely meant for clients** (`find_or_create_dm`, `home_feed_stats`, `birthdays_today`, `me_full`, `get_invite_inviter`, `rsvp_event`, `check_in_event`, and any others actually called from `src/`). Verify each client RPC still works after; verify `award_points` is now callable only by triggers / service-role.

**P0.2 — Make chat media private.**
`chat-media` bucket is `public = true` with a `select using (bucket_id='chat-media')` policy (`supabase/migrations/00004_storage_buckets.sql`), so any DM/group image is fetchable by URL with no auth.
→ Make the bucket private; serve via signed URLs, or add a `select` policy that checks the caller is a member of the thread the object belongs to. Leave `avatars` public (directory needs CDN URLs). Confirm image sending/loading still works in DMs and group chat after.

**P0.3 — Remove the loose Apple push key from disk.**
`AuthKey_4828J7FD29.p8` sits in the repo working directory. It's correctly gitignored and never entered git history (good), and runtime already reads the key from `APNS_P8_KEY_BASE64` (`src/lib/push/send.ts:39`), so the file isn't needed.
→ Delete it from the working tree; store it only in a secret manager. If there's any chance it leaked, revoke + reissue in the Apple Developer portal.

**P0.4 — Tighten thread self-join.**
`thread_members` self-insert only checks `user_id = current_profile_id()` (`00011_security_hardening.sql:18`) — a user who learns a thread UUID could insert themselves into an existing group/DM and read its messages.
→ Add a precondition (require an invite row, or restrict self-insert to controlled group-join via RPC). Add a test proving a non-invited user cannot join.

---

## P1 — Correctness & the biggest product gap

**P1.1 — Give the feed real pagination.**
Home feed is hard-capped at `.limit(50)` with no cursor (`src/app/app/home/page.tsx:95`, `src/lib/feed/actions.ts:803`); posts past #50 are unreachable and pull-to-refresh just re-fetches the top 50.
→ Add **keyset (cursor) pagination** on `(pinned, created_at desc, id)` + a "load more" / infinite scroll. Use keyset, not OFFSET. The `posts_created_idx` (`00008`) already supports it. Add an `id` tiebreak so equal timestamps don't drop/dupe.

**P1.2 — Generate and wire real database types.**
`src/types/database.ts` is hand-written, incomplete, and the `Database` generic is passed to **zero** clients — every `.from()` returns `any` (182 `any` occurrences across the codebase).
→ Run `supabase gen types typescript` into `src/types/database.ts`, then wire the generic into every Supabase client factory (`supabaseServer`, `supabaseBrowser`, `supabaseAdmin`, middleware). Remove `as any` / `: any` on query results and realtime payloads as the types light up. This is the single biggest maintainability win.

**P1.3 — Fix the reaction race.**
`toggleReactionAction` (`src/lib/chat/actions.ts:59-81`) is read-then-write with no `23505` (unique-violation) guard, unlike `toggleLikeAction` which handles it correctly (`src/lib/feed/actions.ts:857`).
→ Mirror the like-toggle pattern: rely on the DB unique constraint and swallow `23505` to make it idempotent.

**P1.4 — Route all service-role access through the sanctioned factory.**
Raw `createClient(URL, SERVICE_ROLE_KEY)` is copy-pasted ~8× (`src/lib/feed/actions.ts:282,369`, `src/lib/events/actions.ts:178`, `src/lib/moderation/actions.ts:137`, etc.) instead of the `server-only` `supabaseAdmin()` factory.
→ Replace all copies with `supabaseAdmin()` so the service key can never drift into a client bundle.

**P1.5 — Fix the native rough edges.**
- Android push is an unwired stub that stores tokens but delivers nothing (`src/lib/push/send.ts:128`) → either implement FCM delivery or clearly gate/hide Android push so it doesn't silently no-op.
- The AASA route falls back to the literal string `"TEAMID"` if the env var is unset (`src/app/.well-known/apple-app-site-association/route.ts:25`) → fail loudly / validate at boot; a wrong AASA silently kills Universal Links.
- Native push tokens are stuffed into legacy NOT-NULL web columns with placeholders (`endpoint:"ios:<token>"`, `p256dh:"native"`, `src/lib/push/native.ts:38-53`) → make those columns nullable or add a proper `platform`-aware token table.

---

## P2 — Performance & scale hygiene

**P2.1 — Stop re-authing and re-querying on every navigation.**
Everything under `/app/*` is `force-dynamic` (`src/app/app/layout.tsx:7`) with no caching, and middleware calls `supabase.auth.getUser()` (a network round-trip) on every protected navigation (`src/middleware.ts:80`).
→ Wrap the per-request auth/profile lookup in React `cache()` so components don't each re-hit auth; add short `revalidate` (30–60s) on read-mostly surfaces (events, members, groups). Keep home/chat dynamic.

**P2.2 — Paginate the groups list.**
`src/app/app/groups/page.tsx:42` is a hard `.limit(100)` with no fallback — new groups vanish past 100.
→ Add pagination before the community outgrows the cap.

**P2.3 — Use the counting RPC in admin.**
`src/app/(admin)/admin/events/page.tsx:34-39` tallies RSVPs in a JS loop; the member page correctly uses the `event_going_counts` RPC (`00045`).
→ Reuse `event_going_counts` in admin.

**P2.4 — Add the missing count indexes.**
Going-count RPCs filter `event_id = any(...) and status='going'` (`00045`) but there's no composite/partial index.
→ `create index on event_rsvps (event_id) where status='going';` and the meetup equivalent. Optional until events get large, but cheap.

---

## P3 — Cleanup & debt

- **Consolidate the two messaging stacks.** Legacy `chats`/`messages`/`polls` coexist with unified `threads`/`thread_messages` after the pivot (00020/00031). Pick the unified stack; migrate remaining event-room usage onto threads and deprecate the legacy tables. Same for the duplicate poll models (legacy `polls` vs `posts.poll_*`).
- **Split the God files:** `src/lib/feed/actions.ts` (988 lines — also has an inline OpenAI fetch at `:126` to extract), `src/components/feed/FeedPost.tsx` (746), `FeedComposer.tsx` (609), `ThreadChatClient.tsx` (494).
- **Move real domain types out of the mock file.** `src/lib/preview/mock.ts` (1,257 lines) holds types (`MockMeetup`, `EventCategory`) that production components import — relocate those to a real types module; keep `/preview` mock data isolated.
- **Realtime is INSERT-only** — deletes/edits don't propagate live (a deleted message lingers until reload). Add UPDATE/DELETE subscriptions where it matters (chat, feed).
- **Gate logging.** 64 `console.*` calls (7 `console.log` in the push subsystem, `src/lib/push/send.ts` / `nativeClient.ts`) will spam prod logs — put them behind a debug flag.
- **Add a CSP** (`next.config.mjs` has good headers but no Content-Security-Policy — the code comment already flags it). Ship report-only in staging first, then enforce.
- **Turn on the lint gate.** `next.config.mjs` sets `eslint.ignoreDuringBuilds: true` — add a CI lint step so it doesn't block releases but still catches issues.
- **Remove the redundant push index** (`00043` created a full `device_token` unique index on a false premise; `00032` already had a partial one) and move root-level cruft (CODEX_*.md, PDFs, logos) into `/docs`.

---

## Definition of done
- P0 + P1 complete, each covered by a test that fails without the fix.
- `supabase gen types` wired; `any` count on Supabase query results dramatically reduced.
- Feed scrolls past 50 posts via cursor pagination.
- No `USING (true)` policies, no client-reachable privileged RPCs, no world-readable private chat media — re-verify against `pg_policies` and a manual RLS probe as a non-member user.
- A short `SECURITY.md` / runbook noting what changed and how it was verified.

Report back per tier: what you changed, the migration numbers added, how you tested, and anything you chose NOT to touch and why.
