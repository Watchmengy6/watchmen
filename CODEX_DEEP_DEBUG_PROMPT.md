# Codex deep debug session — Watchmen iOS app

Treat this as a top-to-bottom audit. I want you to look at the repo with fresh eyes, find what's actually wrong, and rank by user impact. Don't take my framing of any individual symptom as gospel — if you find a different root cause, say so.

## The product

"The Watchmen" — invite-only brotherhood social app for Dustin Lachance's community. Web app at `https://watchmen-six.vercel.app` (Next.js 14 App Router, Supabase Postgres + Auth + Storage + Realtime, Vercel deploys). Native iOS wrapper at bundle ID `me.gy6.watchmen` (Capacitor 8, SPM mode, WKWebView loading the live Vercel URL). Currently on build 1.0(9). The submission target is Apple App Store.

The audience: roughly 100 active brothers in the next year, peer-to-peer text + photo + short video sharing, group/event/meetup coordination. Most users are on iOS via the wrapper. The previous Apple Review rejection (Guideline 2.1(a)) was the iPad camera crash on the photo upload control — that's now resolved (build 1.0(7) restored `NSCameraUsageDescription` / `NSMicrophoneUsageDescription`).

## What to focus on

I want a punch list of P0 / P1 / P2 issues with line numbers and concrete fixes. Lead with the biggest user-visible problems. The areas I'm most worried about right now:

### 1. Feed performance / loading speeds

- `/app/home` is the landing screen and the first thing every brother sees. It currently runs: a `requireApproved` server action, a profile fetch, a pending-count `head` query, a posts query with 4 joins, a `home_feed_stats` RPC, plus child fetches for the optional next-event hero card and birthday banner.
- Look at `src/app/app/home/page.tsx` and trace the wall time from initial request to first interactive render. Where can we collapse queries, parallelize, or move work to RPCs?
- Is the `home_feed_stats` RPC fast enough at 50 posts × 100 brothers? Look at `supabase/migrations/00033_audit_p1_p2_hardening.sql` and any later overload definitions. If it does an N+1 inside, flag it.
- The pinned post + event hero queries — can they be folded into a single RPC?
- Service worker + asset caching state: `public/sw.js` is supposed to cache the app shell. Verify it's actually doing its job on iOS (Capacitor WKWebView treats `sw.js` differently than mobile Safari).
- We added pull-to-refresh — make sure it's not re-fetching the whole feed on every pull instead of just the top.

### 2. Video upload UX

- We currently render uploaded videos in `FeedPost.tsx` with a derived poster URL: `${video_url}.poster.jpg`. The poster is generated client-side via `generateVideoPoster()` in `src/lib/uploads/client.ts` and uploaded under the same Date.now() timestamp.
- Verify the poster path derivation is robust across:
  - Sleep/wake cycles mid-upload
  - Users on slow connections where the poster upload completes after the video
  - Cases where `generateVideoPoster()` returns null (silent skip — does the `<video poster=...>` render gracefully?)
- The video element in the feed uses `preload="metadata"` — confirm that on iOS WKWebView this actually loads the first frame, not a black box. If it doesn't, we may need to set `poster=""` only when we know the poster URL exists vs. fall back to `preload="auto"` for the first chunk.
- Recording quality: when a user taps "Take Photo or Video" through the HTML `<input type="file">`, iOS uses `UIImagePickerController` with default `videoQuality = .typeMedium` (~480p). There's no HTML hook to bump this. Codex previously recommended a local Capacitor plugin built on `PHPickerViewController` + `AVCaptureSession`. **For this audit: do NOT implement that plugin — just confirm in writing that the recording quality limit is unfixable without a native plugin and rank it as a v1.1 task.**

### 3. Horizontal scroll / viewport drift after upload

- After posting a video, the user reports being able to scroll the entire page horizontally. The app layout has `overflow-x-hidden` at the root (`src/app/app/layout.tsx`). Something is escaping that constraint.
- Likely suspects: the `<video>` element in the feed (intrinsic portrait video dimensions), an unconstrained image inside an optimistic post card, or a CSS `min-width` that exceeds the viewport.
- I just added `object-contain` + `bg-black` + `max-w-full` to the FeedPost video render. Verify this is sufficient. If you find ANY other element that can push width past the viewport, list it.
- The next-event hero card at the top of /app/home renders an `<img>` background. Confirm it doesn't get layout-shifted by the lazy-loaded image causing a horizontal scroll spike.

### 4. Bottom nav drift on scroll

- `src/components/nav/BottomNav.tsx` uses `position: fixed; bottom: 0`. The padding is now `calc(max(env(safe-area-inset-bottom), 20px) + 0.375rem)`.
- User reports the nav still occasionally drifts into the iOS home-indicator pill area on real device. Investigate whether:
  - The Capacitor WKWebView's viewport-fit is correctly set to `cover` (check `capacitor.config.ts` AND the Next.js viewport meta in `src/app/layout.tsx`)
  - There's a different layout container (the optimistic post card, the disclaimer gate, the chip row) that's pushing the body height in a way that breaks `position: fixed`
  - The `inputFocused` state machine in BottomNav is correctly hiding the nav when an input takes focus and showing it again when blur fires — there may be a race where the nav comes back at the wrong position
- The AppDelegate in `ios/App/App/AppDelegate.swift` locks WKWebView scroll bounces. Confirm that's still wired correctly.

### 5. iOS native wrapper hygiene

- Look at `ios/App/App/Info.plist` — every declared permission should be load-bearing for v1.0. Right now we declare camera, mic, photo library read, photo library add, location-when-in-use. Confirm location is actually used (event check-in) and not orphaned.
- Look at `ios/App/CapApp-SPM/Package.swift` — should only list `@capacitor/push-notifications`. If anything else is in there, it's leftover from the abandoned plugin experiments and should be removed.
- Look at `ios/App/App.xcodeproj/project.pbxproj` for stale `XCSwiftPackageProductDependency` entries.
- `ios/App/App/AppDelegate.swift` does a UIWindowScene-based view hierarchy walk to lock WebView bounces. Is this still kosher under iOS 18+, or should we move to a custom `CAPBridgeViewController` subclass? See Codex's earlier recommendation about `AppBridgeViewController`.

### 6. Schema / RLS sanity

37 migrations applied to date, summarized in `[[watchmen-schema]]` memory file. Recent additions: poll columns, reports table, user_blocks, account-deletion tombstones. Last security pass was migration `00033_audit_p1_p2_hardening`. Look at:
- Every RPC that takes a `p_viewer_id` argument and check whether the function ignores it server-side (per the security pass comments). If any of them STILL trusts the client-passed viewer ID, that's a P0.
- The `home_feed_stats`, `find_or_create_dm`, `check_in_meetup`, and `home_feed_consolidated` (if it exists) RPCs.
- Storage bucket RLS on `chat-media`, `event-images`, `avatars`, `group-covers`. Public read or signed URLs? Are uploads correctly gated by `auth.uid()`?
- `posts.media_type` enum — there's an `image | video | none` value. Verify no row has an invalid value and the renderer handles `none` correctly.

### 7. Any other landmines

I bet there are crash paths, infinite loops, missing null checks, or memory leaks I haven't even thought of. Look broadly. The previous Codex audits caught things like:
- Missing await on a server action
- A subscription that never unsubscribed
- Hydration mismatches (React #425, #422) — these are showing up in the iOS console; verify they're cosmetic and not load-bearing

## How to report back

For each finding, give me:
1. Severity (P0 blocker → P3 polish)
2. Path + line numbers
3. What's wrong and why it matters
4. A concrete fix (a diff or pseudo-diff is fine)
5. Whether it ships in 1.0 or v1.1

Lead with a TL;DR ranked list. I'll work top-down.

## What's already done (skip these)

- iPad camera crash — fixed in 1.0(7) by restoring `NSCameraUsageDescription`
- Audio missing on uploaded videos — fixed in 1.0(8) by rendering `<video>` with controls and no `muted` attribute
- Recording quality cap — known iOS limitation, parked for v1.1
- Apple Round 1 rejection issues (SIWA redirect, age rating, business model) — fixed in 1.0(3)
- Self-serve account deletion, EULA gate, server-side Terms enforcement — done in 1.0(3)
- 37 migrations applied through `00037_*`

## Stack reference

- Capacitor `^8.4.0` (CLI, core, ios), SPM mode
- Next.js `14.2.15`, App Router, Server Actions
- React `^18.3.1`
- Supabase `@supabase/ssr ^0.5.2`, `@supabase/supabase-js ^2.45.4`
- TypeScript `^5.6.2`
- Tailwind `^3.4.13`
- iOS deployment target 15.0

## What I want back

A markdown report. Top of the file: TL;DR with bullet list of severity + one-line summary per finding. Below: the full details. Don't make me dig.
