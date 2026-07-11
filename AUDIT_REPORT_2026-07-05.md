# The Watchmen — Comprehensive Audit Report
**Date:** July 5, 2026 · **Scope:** full codebase @ commit `108d5da` (deployed prod) · **Method:** 5 parallel specialist passes (adversarial security, concurrency, reliability, WCAG 2.2 AA accessibility, visual/responsive consistency), findings hand-verified against source and prior audit history. Read-only — no code modified.

**Context:** invite-only iOS community app (Capacitor webview only quality target), live production, ~200-person launch event Friday July 11.

**Pre-accepted items excluded from findings** (documented decisions, not new): public chat-media bucket until post-event signing work; likes-RLS visibility scoping; CSP; hydration warnings #425/#422; Android absence; ThreadChatClient FIFO echo ordering.

---

## Executive summary

**No Critical findings. No unauthenticated attack vector found — middleware + RLS hold the perimeter.** Secrets are clean, password reset is enumeration-safe, the new broadcast tool's super-admin gate holds against direct action invocation, and deep-link hash handling is XSS-safe.

The real exposure clusters in three areas:

1. **Missing idempotency on three non-idempotent writes** (broadcast send, member approve, comment submit) — double-tap or double-Enter double-fires them. Event night maximizes both the tap rate and the network latency that widens the race window.
2. **The flaky-network failure story on chat/media writes** — DM sends can silently fake success; a thrown upload leaves the composer permanently stuck.
3. **The notification fan-out bypasses the block system** — a blocked member can still land attacker-authored push text on their blocker's lock screen. This undermines the Apple-required block feature.

Accessibility has never been audited before; the app is currently hard to use with VoiceOver (silent toasts/errors, unlabeled core buttons, unassociated form labels). None of it blocks Friday; all of it belongs on the roadmap.

**Release recommendation: SHIP WITH KNOWN RISKS** (see end).

---

# Findings

## HIGH

### H1 — Broadcast "Send now" can double-fire → every member pushed twice
- **Category:** Race Condition · **Location:** `src/app/(admin)/admin/broadcast/BroadcastForm.tsx` `send()`; `src/lib/admin/actions.ts` `sendBroadcastPushAction`
- **Issue:** No synchronous re-entrancy guard in `send()`; no idempotency key server-side. Each invocation mints a unique tray tag (`broadcast:${Date.now()}`), so duplicates stack rather than collapse.
- **Impact:** Double-tap on a slow connection = the entire brotherhood gets the same announcement twice. No unsend.
- **Evidence:** `send()` relies solely on `disabled={pending}`; `useTransition` pending is not guaranteed to span the awaited server action on React 18 canary builds; action has zero dedup.
- **Reproduction:** Throttle network, arm the confirm step, double-tap "Send now."
- **Fix:** `useRef` re-entrancy guard set synchronously at top of `send()` (reset in `finally`) + client-generated idempotency key deduped server-side (~60s window).
- **Confidence:** Confirmed (missing guards); High (double-fire mechanics).

### H2 — `approve_member` is non-idempotent: double approve = double points, duplicate emails/pushes
- **Category:** Race Condition · **Location:** RPC `approve_member` (`supabase/migrations/00003_functions_and_triggers.sql:142-179`); `ApprovalButtons.tsx`; `admin/actions.ts:84+`
- **Issue:** Verified against the live function body: the UPDATE has no `where status <> 'approved'` guard and the +50 inviter award + notification inserts run unconditionally. The client buttons have no synchronous guard. Two admins approving the same member, or one double-tap, re-runs everything.
- **Impact:** Leaderboard inflation (+50/+100 per duplicate), duplicate "You're in" notifications, duplicate welcome email + approval push. With 200 approvals Friday, some duplicates are near-certain.
- **Reproduction:** Two devices approve the same pending member within one request window.
- **Fix (small migration, 00052):** `update ... set status='approved' where id = $1 and status is distinct from 'approved'; if not FOUND then return; end if;` — award/notify only on actual transition. Plus sync guard in ApprovalButtons.
- **Confidence:** Confirmed.

### H3 — DM/group/event chat send silently fakes success on network failure
- **Category:** Reliability · **Location:** `ThreadChatClient.tsx` `send()` and `pickAndSendMedia()` — no try/catch around the awaited action
- **Issue:** Rollback only runs when the action *returns* `{error}`. If the call **rejects** (offline, 5xx, deploy skew), the optimistic bubble stays on screen forever, looking sent; nothing persisted.
- **Impact:** On congested event-night networks, members believe DMs/photos sent when they didn't. Shared by DMs, group chat, AND event chat (same component). The feed handlers were hardened against exactly this class — chat wasn't.
- **Reproduction:** Airplane Mode → send a DM → bubble stays, no error, no DB row.
- **Fix:** Wrap in try/catch; run the existing rollback path (remove row, pop pending id, revoke preview, `setErr`) in the catch.
- **Confidence:** Confirmed.

### H4 — Media upload can wedge the composer in permanent "Uploading…"
- **Category:** Reliability · **Location:** `FeedComposer.tsx` `handleFileChange`; `ThreadChatClient.tsx` `pickAndSendMedia`
- **Issue:** `setUploading(true)` … `await uploadMedia(file)` … `setUploading(false)` with **no finally**. `uploadMedia` can throw (its first await is `auth.getUser()` — rejects on network failure) → `uploading` never resets → Post/Send button disabled until full app restart. (Note: the "disable Post while uploading" fix from July 5 made the button correctly depend on `uploading` — which makes resetting it reliably now essential.)
- **Reproduction:** Drop connectivity the moment after picking a photo.
- **Fix:** `try/finally { setUploading(false) }` in both handlers.
- **Confidence:** High.

### H5 — Push fan-outs bypass the mutual-block system (harassment channel)
- **Category:** Security · **Location:** `feed/actions.ts` comment fan-out (~:1163) + comment/post mention pushes; all use service-role reads + `sendPushToUser` with no `is_blocked_either_way` filter
- **Issue:** Blocks are enforced at every read surface (posts, comments, DMs, mentions picker, stats, birthdays) — but not in the notification layer. A member whom the victim blocked can trigger "X commented on your post", "X also commented", "X mentioned you" pushes carrying ~100 chars of attacker-controlled text, each uniquely tagged so they stack in the tray.
- **Impact:** Defeats the Apple-required block feature; direct harassment channel to a victim's lock screen.
- **Reproduction:** B blocks A; both previously commented on neutral post P; A comments again (or writes `@B`) → B's phone shows A's text.
- **Fix:** In the fan-out, load the actor's block set once (`user_blocks` where blocker or blocked = actor, service-role) and filter recipients; apply to comment fan-out + both mention pushes.
- **Confidence:** Confirmed.

## MEDIUM

### M1 — Comment double-tap/double-Enter creates duplicate comments
- **Race Condition** · `FeedPost.tsx` `submitComment` — draft cleared only *after* the await; Enter-to-send can fire twice; `post_comments` has no dedup constraint; each dup re-runs the notification fan-out. *Contrast:* DM and main-chat composers already clear synchronously + guard re-entry. **Fix:** clear draft synchronously + `if (pending) return`. **Confidence:** High.

### M2 — Comment failure is completely silent to the user
- **Reliability** · `FeedPost.tsx` `submitComment` — on `{error}` or throw: draft kept, but no toast/inline error whatsoever. Indistinguishable from a dead button. **Fix:** inline error state (pattern exists in FeedComposer). **Confidence:** Confirmed.

### M3 — No offline awareness anywhere; login failure can be a silent no-op
- **Reliability** · repo-wide: zero `navigator.onLine`/offline handling. Offline: login button flashes with no message; feed nav fails at webview level; comment silent (M2); DM fakes success (H3). **Fix:** lightweight offline banner + rejection-to-error mapping on write paths. **Confidence:** High (mechanics), Medium (login specifics).

### M4 — No timeout affordance on auth actions
- **Reliability** · `signupAction`/`loginAction` unguarded awaits; a hang = spinner for up to the function limit with no feedback/retry. Matters at signup-surge time. **Fix:** client-side race with a ~10s timeout → "taking longer than expected." **Confidence:** High.

### M5 — Group/meetup create failures redirect silently
- **Reliability** · `groups/actions.ts:86-90`, `meetups/realActions.ts:76-80` — on insert error: `console.error` + `redirect(list)`. User can't tell it failed; likely to re-submit later (duplicate risk). **Fix:** return `{error}`, render in form. **Confidence:** Confirmed.

### M6 — Feed/server pages render failures as empty/notFound instead of errors
- **Reliability** · `home/page.tsx` (posts/stats errors → "You're all caught up"), `events/[eventId]` + `members/[userId]` (transient error → notFound / zeroed stats), broadcast audience count (error → "Send to 0 members?" while fan-out still targets everyone). **Fix:** distinguish `.error` from empty; error/retry states. **Confidence:** High.

### M7 — Comment INSERT lacks parent-post visibility gate
- **Security** · `post_comments` INSERT policy checks approval+authorship only; `addCommentAction` doesn't verify the post is visible/non-deleted (the read path does). Enables ghost comments on deleted/hidden posts → feeds H5 fan-out. **Fix:** RLS-scoped parent check in the action (mirror `loadPostCommentsAction`). **Confidence:** Confirmed.

### M8 — Accessibility: the app is largely silent/unlabeled for VoiceOver (first-ever a11y pass)
Grouped headline items (full detail in agent annex):
  - **Zero live regions app-wide** — toasts, push banners, form errors, success states never announced (WCAG 4.1.3). Toast container fix is one line.
  - **Form labels never programmatically associated** — `ui/Input.tsx` `Label` has no `htmlFor`/id wiring; every auth/admin field announces by placeholder only (WCAG 1.3.1/3.3.2).
  - **Core feed buttons unnamed** — post Like/Comment announce as bare numbers (`FeedPost.tsx` action bar); DM photo (`MessageBubble`) is `alt=""` + click-only → VoiceOver cannot open chat photos; double-tap-to-like has no accessible equivalent.
  - **ImageLightbox/ReportButton dialogs** — unnamed dialog, no focus trap/restore (Report modal isn't even `role="dialog"`, no Escape).
  - **Contrast:** `text-ink-400` ≈ 2.8–2.9:1 on app backgrounds — fails AA; it's the default muted color (timestamps, placeholders, comment actions).
  - **Touch targets:** comment-row Like/Reply/Delete ≈14px tall (WCAG 2.5.8 min 24px).
  - **No `prefers-reduced-motion` handling**; all type fixed-px so iOS Dynamic Type does nothing (1.4.4).
- **Confidence:** High (code-verified; contrast computed).

### M9 — Visual consistency: the five headline inconsistencies
(Full 20-finding inventory in annex.) 1) Page inset alternates px-4/px-5 across bottom-nav tabs — content visibly jumps on every tab switch. 2) Empty states: home feed/comments/Chats use plain text while events/notifications use the designed `EmptyState`. 3) Primary gold CTA hand-rolled at h-8/h-9/h-11/h-12 (disagrees within BroadcastForm itself). 4) Eyebrow labels drift across ~6 size/tracking combos. 5) Hand-rolled CTAs lack pressed feedback while list rows have it. Root cause: shared `Button`/`Input`/`EmptyState` exist but are bypassed in ~45 files. **Confidence:** High.

## LOW

- **L1 (Security)** Device-token squat: first-writer owns a `device_token` row; upsert conflict for the true owner silently no-ops yet returns `success:true`. Precondition (knowing a victim's APNs token) is high. Fix: SECURITY DEFINER re-key + never report success on 0-row write. *(native.ts)*
- **L2 (Security)** Keyset cursor strings interpolated unvalidated into PostgREST `.or()` (`loadMoreFeedAction`) — bounded by RLS; validate UUID/ISO anyway.
- **L3 (Security)** A regular `admin` can suspend a `super_admin` (`suspendUserAction`) — availability asymmetry; require super_admin for super_admin targets.
- **L4 (Race)** PendingPushBridge registration listener never removed → coexists with the app-layout registrar (duplicate register calls; masked by upsert). Capture the handle; remove on cleanup.
- **L5 (Race)** PushReceiver banner timers not cleared on unmount (benign no-op in React 18).
- **L6 (Race)** ChatRoom realtime reaction inserts lack id-dedup (messages handler has it) — transient count inflation on reconnects.
- **L7 (Reliability)** Orphaned storage objects when upload succeeds but the subsequent send/post fails (DM + feed paths; `MessageInput` already cleans up — copy that). Storage cost only.
- **L8 (Reliability)** Comment fan-out failure = silently no notifications (accepted fire-and-forget; consider a metric).
- **L9 (Visual)** Inventory items: disabled opacity 40 vs 50 (both in one modal), loading-label conventions ("…" vs "Deleting…" vs "Loading…"), "member" vs "brother" drift (both in one broadcast sentence), avatar scale (10 sizes; consolidate to ~5), badge counts uncapped on tab pills vs "9+" in Greeting, admin tab strip has no scroll affordance, placeholder "..." vs "…", `occupation · company` untruncated on member profile.
- **L10 (A11y)** Remaining annex items: mention pickers lack combobox semantics, feed lacks `<h1>`/list semantics, PasswordInput toggle `tabIndex={-1}`, sub-11px micro-text, DisclaimerGate video lacks captions, focus-visible styles missing on hand-rolled buttons.

## INFORMATIONAL — attacked and held (verified safe)
Broadcast super-admin gate (direct POST re-checked in-action) · native token overwrite of existing rows (00042 RLS) · `ScrollToPostFromHash` (getElementById literal — no XSS/selector injection) · PushReceiver rendering (React text, no HTML) · pending components unauthenticated access (middleware holds) · password reset flow (no enumeration; token_hash design correct) · comment-read IDOR (parent-visibility gate present) · `signThreadMediaAction` scoping · secrets hygiene (no service keys/VAPID/APNs/OpenAI in client bundles; `server-only` enforced) · broadcast + comment fan-out per-send error isolation · `.single()` usage (all insert-returning) · PostgREST embed shape guards · FeedList infinite-scroll guards · realtime channel/lightbox/BottomNav/PendingAutoRefresh cleanups · autocomplete attributes on auth forms · `text-ink-300` contrast (~6:1, passes — don't "fix") · truncation hygiene on all high-traffic name surfaces · RSVP/join/leave idempotency (DB constraints) · DisclaimerGate double-accept.

---

# Remediation plan (prioritized)

**Phase 0 — before Friday (≈half a day, all low-regression):**
1. H2: migration 00052 idempotent `approve_member` + sync guard in ApprovalButtons. *(Highest event probability × impact.)*
2. H1: re-entrancy ref + idempotency key on broadcast.
3. H3: try/catch rollback on chat send + media send.
4. H4: `finally { setUploading(false) }` ×2.
5. M1+M2: comment submit — sync draft clear, `if (pending) return`, inline error.
6. H5: block-filter in the three push fan-outs (contained, additive query).

**Phase 1 — week after the event:**
M5/M6 error surfacing; M7 comment insert gate; M3 offline banner; M4 auth timeout; L1–L4, L6, L7. Then the already-scheduled chat-media privacy flip + feed signing.

**Phase 2 — accessibility sprint (1–2 days, huge ROI):**
The five VoiceOver headliners: live regions on Toast/PushReceiver/errors; `htmlFor` wiring in `ui/Input`; aria-labels on Like/Comment; MessageBubble photo activation + like control; lightbox dialog name + focus trap. Then contrast token swap (ink-400→ink-300 for interactive/body), 24px touch targets on comment actions, reduced-motion media query.

**Phase 3 — design-system consolidation:**
Adopt shared `Button`/`EmptyState` everywhere (kills ~70% of visual findings), one page inset, one eyebrow token, avatar scale consolidation, Dynamic Type strategy (rem migration or `@capacitor/text-zoom`).

# Quick wins (safe, <30 min each)
`finally` on uploads (H4) · try/catch chat rollback (H3) · sync guards + idempotent approve RPC (H1/H2) · comment sync-clear + inline error (M1/M2) · `role="status"` on Toast container · `aria-label` on Like/Comment buttons · cursor UUID/ISO validation (L2) · super_admin suspend guard (L3) · reaction id-dedup (L6) · badge `99+` cap · disabled-opacity unification.

# Requires architecture / deeper investigation
Dynamic Type (rem migration) · offline/queue strategy for writes · storage GC for orphaned media · focus-trap utility for all overlays · design-token enforcement (lint rule or component-only policy) · idempotency-key convention for all non-idempotent actions · notification-delivery observability (per-member push health, already on punch list) · native webview resume glitch (needs IPA; punch-listed).

---

# Release recommendation

## SHIP WITH KNOWN RISKS — with Phase 0 strongly urged before Friday.

**Justification:** Zero Critical findings; no unauthenticated vector; no data-loss or privilege-escalation path reachable by an outsider. The five Highs are all narrow, well-understood, and fixable in about half a day combined — and four of them (H1–H4) are precisely event-night-shaped: they need crowds, double-taps, and bad networks to fire, which is exactly Friday's environment. Shipping *without* Phase 0 risks embarrassing-but-recoverable incidents (double broadcasts, duplicate welcome pushes, stuck composers, ghost DMs) rather than catastrophic ones. H5 (block-bypass pushes) is the only finding with abuse potential; in a vetted 200-man community the near-term risk is low, but it should not survive the week, both on principle and for App Store block-feature compliance.

Accessibility and visual-consistency findings do not gate release; they define the post-event quality roadmap. The codebase's fundamentals — RLS discipline, action-level auth re-checks, optimistic-update hygiene, cleanup discipline — verified strong across all five passes.
