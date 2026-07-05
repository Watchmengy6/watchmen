# CODEX PRE-LAUNCH AUDIT — The Watchmen (July 5, 2026)

## Mission

Full read-only audit of this repo before a hard deadline: **Friday July 11, 2026 — a live event ("Connect Night", Central Park St. Pete) where ~200 people will download the iOS app and create accounts the same evening.** Your job is to find anything that breaks, leaks, or melts down under that load — and anything a brand-new user hits in their first 10 minutes (signup → pending → approval → first feed load → first post/comment/DM).

Assume the reader will fix issues in the ~5 days before the event. Prioritize accordingly: a P0 is "breaks or leaks on event night," not "would be nice."

## Stack + layout (orient fast)

- Next.js 14 App Router (14.2.35), TypeScript, Tailwind. Deployed on Vercel (auto-deploy from `main`). Web app wrapped in Capacitor for iOS — **the native iOS webview is the ONLY quality target**; `/preview/*` is a mock demo tree, not production.
- Supabase: Postgres + RLS, Auth (email/password, email confirmation OFF, invite-code + admin approval gate), Storage (`avatars` + `event-images` public, `chat-media` PRIVATE with server-signed URLs), Realtime (DM/group/event chat subscriptions).
- Push: native APNs (@parse/node-apn, env `APNS_*`), Web Push (VAPID), FCM stubbed. Emails via Resend (`lib/mail/send.ts`).
- Layout: routes in `src/app` (`/app/*` = member app gated by `requireApproved()`, `/(admin)/admin/*` gated by `requireAdmin()`, `/login /signup /invite /forgot-password /reset-password` public). Server actions in `src/lib/<feature>/actions.ts` (`"use server"`). Migrations in `supabase/migrations/00001–00050` (all applied to prod).
- Conventions/gotchas that have bitten before: never export consts from a `"use server"` file (Next strips them); `profiles.{email,phone,invite_code}` and ALL of `event_rsvps` are column/table-revoked from `authenticated` (use `me_full()` RPC, dedicated RPCs, or service-role); `meetup_rsvps` is NOT revoked; PostgREST embeds have silently failed before — check `.error` on every query you audit.

## What is ALREADY DONE — do not re-report

### Prior Codex audits (June 30 – July 1) — resolved
- WM-001 home_feed_stats viewer forgery (migration 00044); WM-002 Next bumped to 14.2.35; WM-003/P0.2 chat-media bucket private + signed URLs (00048, `lib/uploads/signChatMedia.ts`); WM-005 security headers in next.config.mjs (CSP intentionally deferred); WM-006 grouped-count RPCs `event_going_counts`/`meetup_going_counts` (00045); WM-007 avatar compression; WM-008 birthday TZ; WM-010 APPLE_TEAM_ID env set; P0.1 award_points execute revoked (00047); P0.3 loose .p8 deleted; P0.4 thread self-join policy dropped (00047); account-deletion PII scrub (00046); P1.1 keyset feed pagination + infinite scroll (00049 index committed).

### July 5, 2026 session (Claude) — shipped today, all deployed
1. **ImageLightbox rebuilt** (`components/feed/ImageLightbox.tsx`): portal to body, body scroll lock, pointer-gesture zoom (tap-to-zoom at point, pinch 1–4x, clamped pan). All TAP actions (X, backdrop, tap-to-zoom) run on `click`, NOT `pointerup` — closing on pointerup let iOS's synthesized click fall through to the page and re-open the viewer. Gesture handlers live on the ONE overlay element only.
2. **Infinite server-action loop fixed** (the big one): `FeedPost.toggleComments` used to call `startLoadComments(serverAction)` INSIDE the `setShowComments` updater. React replays updaters when another transition (a like) is in flight → infinite `loadPostCommentsAction` POST loop (28+ POSTs/sec, Vercel 503s, feed stuck on skeleton). Fixed by moving side effects out of the updater. **Audit rule: flag ANY side effect inside a setState updater function anywhere in the codebase.**
3. `revalidatePath("/app/home")` removed from `addCommentAction` + feed poll vote (optimistic UI; revalidate caused full-feed skeleton). Pin/delete actions still revalidate on purpose.
4. All FeedPost interaction handlers (like/comment/edit/delete/load) wrapped in try/catch — a rejected server action (network drop or deploy-skew "Failed to find Server Action") can no longer escape a transition. Same for `PollDisplay` chat-poll voting.
5. **Comment likes + single-level replies** (migration 00050): `post_comment_likes` (RLS mirrors post_likes), `post_comments.parent_comment_id` (server flattens reply-to-reply onto the top-level parent). `toggleCommentLikeAction`, `addCommentAction(postId, body, parentCommentId?)` (+ "replied to your comment" push to the tapped comment's author, never self), `loadPostCommentsAction` returns parent_id/like_count/my_liked. UI in FeedPost (threaded render, Reply chip on composer).
6. **Auth UX**: `components/ui/PasswordInput.tsx` eye toggle (login/signup/reset); forgot-password flow — `/forgot-password` + `/reset-password` pages (added to middleware PUBLIC_ROUTES), `requestPasswordResetAction` (email-enumeration-safe), `resetPasswordAction` using `verifyOtp({type:'recovery', token_hash})` server-side (deliberately NOT PKCE — request happens in the app webview, link opens in Safari). Supabase Reset Password email template updated to `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`.
7. **Perf**: `signMessagesMedia` batched into ONE `createSignedUrls` call (was up to 50 parallel storage calls per thread open); group chat page 3 serial lookups → one Promise.all; dms list embeds threads via `thread:threads(...)` join (2 RTT, sorted in JS); meetups list `.limit(100)`.
8. **Audit fixes**: meetup times server-rendered in UTC → `timeZone: "America/New_York"` added in meetups list + detail; members page static `pt-8` → safe-area padding; notifications page same fix earlier.
9. Known-cosmetic, deliberately unfixed: React #425/#422 hydration text mismatches once per full document load (likely `relativeTime()` server/client drift) — self-recovering, not user-visible.
10. **False alarm to avoid repeating**: `meetup_rsvps.checked_in` is readable by `authenticated` — only `event_rsvps` is revoked. Do not report meetup check-in as broken.

## STILL-OPEN backlog (verify against current code, then prioritize for July 11)
- WM-009: iOS build number still 1 in project.pbxproj (matters only at next archive).
- P1.3: `chat/actions.ts` `toggleReactionAction` race — needs the 23505 unique-violation guard like post likes.
- P1.4: ~8 raw `createClient(SERVICE_ROLE)` copies not routed through `supabaseAdmin()`.
- P1.5: Android push stub; AASA "TEAMID" fallback; native push tokens in legacy NOT-NULL web columns.
- P2/P3: React cache() auth lookup reuse, paginate groups list, CSP authoring, legacy chats/messages vs threads consolidation, God-file splits, console.log gating, lint gate.

## PRIORITY 1 — Event-night scale review (the reason for this audit)

Model the night concretely: ~200 signups within ~2 hours, then bursts of feed scrolling, photo posts, comments, likes, DMs, and event-chat during the UFC watch party. For each item below, verify in code and give concrete numbers/limits where possible:

1. **Signup surge path** (`lib/auth/actions.ts signupAction` → profile-creation trigger → `/pending`): does anything in the hot path block on external providers? The fan-out (admin email via Resend + `signupReceived` confirmation email + `sendPushToAdmins`) is fire-and-forget — confirm nothing awaits it. What happens at Resend's rate limit (free tier ~2 req/s) when 200 confirmation + admin emails queue? Failures must be non-fatal and logged.
2. **Push fan-out storms**: every comment/like/poll-vote pushes the super-admin firehose (`sendPushToSuperAdmins`), every signup pushes all admins. At event scale that is thousands of APNs sends to 2-3 admins in an evening. Check: per-send error isolation (one bad token can't fail the batch), APNs provider connection reuse vs new connection per send in `lib/push/send.ts`, and whether any push send blocks a user-facing action's response.
3. **Admin approval flow at 200 pending rows** (`/admin/pending`): query bounds, N+1s, approve action latency, and the approve→push/email trigger. Can Dustin approve 200 people from his phone without it choking?
4. **Invite/signup validation**: invite_code path — what happens with an invalid/reused code, empty code, or a signup with a duplicate email (error message quality — 200 strangers WILL typo). Terms-acceptance enforcement server-side. Rate limiting on signupAction/loginAction (is there ANY? Supabase auth has built-in limits — what does the UX do when they trip?).
5. **Home feed with ~200 members**: `home_feed_stats` RPC cost with 50-post pages, member directory query bounds, group covers/avatars bandwidth (public bucket, no CDN transform?), `listMentionableMembers` (fetches ALL approved members on first `@` — fine at 40, at 200+?).
6. **Realtime connection count**: each open chat = a Supabase Realtime websocket. 200 members × event chat during the watch party — check subscription cleanup on unmount, channel reuse, and what tier limits apply (concurrent connections / messages per second). This is the #1 melt-down candidate for the July 11 watch-party chat.
7. **Signed-URL churn**: chat-media signing is per-page-load with 7-day expiry — any hot loop that re-signs on every realtime message? (`signThreadMediaAction` per incoming media message — bound it.)
8. **Vercel limits**: force-dynamic pages everywhere = every nav is a function invocation. Estimate invocations for the event night; flag any page that could exceed 10s function duration under load. Confirm Vercel + Supabase are in the same/adjacent regions (query RTT multiplies on chat pages).
9. **New-user empty states**: brand-new approved member with no groups, no DMs, no RSVPs — walk every tab for null crashes. 200 people will be in exactly this state.
10. **Apple review account** (`assetlabsllc@gmail.com`) still works and is approved — event marketing will spike App Store review traffic.

## PRIORITY 2 — Standard full passes (after the scale review)

- **Security**: every server action re-checks auth + role server-side; RLS on all 00050 tables; SECURITY DEFINER RPC inventory (execute grants!); storage policies; middleware bypasses; secrets in client bundles; IDOR on every id-taking action (especially new: toggleCommentLikeAction, addCommentAction parentCommentId cross-post check, signThreadMediaAction scoping).
- **Correctness**: unchecked `.error` on Supabase queries that then render; setState-updater side effects; useEffect cleanup (realtime channels, listeners, object URLs); optimistic-update rollback paths; 23505-style race guards on every toggle insert/delete.
- **iOS webview specifics**: pointerup-vs-click ghost taps on any remaining overlays/modals; safe-area on any page not yet listed as fixed; document-scroll pages that should use the pinned inner-scroll pattern; `env(safe-area-inset-*)` fallbacks.

## Rules

- **READ-ONLY.** Report; do not modify code.
- Verify every finding against the CURRENT code — file:line citations from prior audits may have moved. No speculation; every finding needs the exact file:line and a repro/exploit sketch.
- Do not re-report anything in the "already done" sections unless you find it REGRESSED (that has happened once: WM-001 was regressed by a later migration — check for that pattern around migrations 00044–00050).
- Output format: `[P0|P1|P2|P3] file:line — issue — impact on July 11 — minimal fix`. Two sections: (A) Event-night blockers, (B) Everything else. End with a one-page "morning-of-July-11 go/no-go checklist" (env vars to confirm, dashboards to watch, the 3 metrics that predict a meltdown).
- Minimal fixes only — no refactors, no dependency major-bumps, nothing that risks a regression 5 days before the event.
