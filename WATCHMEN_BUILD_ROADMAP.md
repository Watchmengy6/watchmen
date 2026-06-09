# Watchmen Build Roadmap & Agency Cost Estimate

**Prepared:** June 3, 2026
**For:** Aaron Pilkington / Dustin Lachance
**App:** Watchmen GY6 — iOS App (in Apple Review)

This is a phase-by-phase breakdown of everything that was built, with realistic
estimates for what a US mid-tier agency would have charged at a blended rate of
$150/hour (typical for a 10–50 person studio in 2026).

---

## TL;DR

| Path | Estimated Cost | Calendar Time |
|---|---|---|
| **Pure AI MVP platform (Lovable / Bolt / v0)** | $5,000 – $15,000 | 1–2 months *but wouldn't ship this scope* |
| **AI-first boutique shop (2–5 senior devs + Claude Code / Cursor)** | **$30,000 – $70,000** | 2–3 months |
| **Solo senior contractor (US, $100/hr)** | **$72,000 – $140,000** | 4–6 months |
| **Small US dev shop ($125–175/hr blended)** | **$90,000 – $175,000** | 4–6 months |
| **Mid-tier agency ($150/hr blended)** | **$108,000 – $210,000** | 4–6 months |
| **Premium SF/NYC studio ($250–400/hr)** | **$180,000 – $560,000** | 3–5 months |

**Most realistic traditional comparison: mid-tier agency at $120k–180k over 5 months.**
**Most realistic AI-first comparison: $40k–60k from a boutique shop.**

What you actually paid: ~$200/month in infra (Supabase + Vercel + Resend) + $99/year Apple Developer fee + a few hundred bucks in OpenAI/Anthropic API credits.

---

## Phase-by-phase breakdown

### Phase 0 — Foundation & Infra (20–40 hrs / $3,000–$6,000)

- Next.js 14 App Router project scaffold + TypeScript + Tailwind config
- Supabase project provisioning (DB + Auth + Storage + Realtime)
- Vercel deployment pipeline with auto-deploy from main
- Custom domain consideration (gy6.me / watchmen-six.vercel.app)
- Env variable wiring across Vercel + Supabase
- Initial database schema (profiles, invites, events, RSVPs, chats, messages, polls, etc.)
- Auth helpers (`current_profile_id`, `is_approved`, `is_admin`)
- Storage buckets for avatars, post media, event covers, group banners
- Migration 00001 + 00002 (schema + RLS foundations)

### Phase 1 — Auth + Approval Flow (30–60 hrs / $4,500–$9,000)

- Login form + server action with redirect logic
- Signup form with full member profile fields + invite code
- Pending approval screen with sign-out
- Invite landing page with inviter info (SECURITY DEFINER RPC)
- DisclaimerGate (full-screen, non-dismissable terms acceptance gate)
- Onboarding video slot (env-configurable)
- Self-serve account deletion with cascade
- Sign in with Apple button scaffold
- Approve / reject member admin actions
- Welcome email on approval

### Phase 2 — Feed (80–120 hrs / $12,000–$18,000)

- FeedComposer (text, image, video, poll, hiring, need)
- FeedPost rendering with optimistic likes, comments, polls
- @mention picker with autocomplete (client-side filter after server load)
- Comment input with @mentions
- Poll widget inline with vote counts + percentages
- Like / unlike with optimistic UI
- Comment count badge
- Share post button (native share sheet)
- Report post + comment moderation flow
- Admin "delete any post" button (red, service-role bypass)
- Admin pin-to-top with sort priority
- Author self-delete (separate flow, ownership-checked)
- Pull-to-refresh with custom gold spinner
- `home_feed_stats` RPC (consolidated 4 queries into 1)
- Birthday banner + auto-post (idempotent RPC)
- Next event banner with hero image
- On-demand comment loading (perf optimization)

### Phase 3 — Events (40–80 hrs / $6,000–$12,000)

- Events list with Watchmen/Sponsored tabs
- Event detail page with hosts, photos, RSVPs
- Calendar grid view (month, day cells, RSVP dots)
- Day-detail view with multiple events
- RSVP flow with double-click prevention
- Going list with profile photos
- Event check-in with GPS lat/lng verification (radius + time gated)
- Event reminders (email + push)
- Calendar invite emails with `.ics` attachments
- Admin create/edit/delete events
- Cover image upload + auto-resize + Supabase storage
- Event-room chat migrated to thread infrastructure
- UTC date bucketing fixed for Tampa timezone

### Phase 4 — Groups (30–60 hrs / $4,500–$9,000)

- Groups list rendered as 2×2 card grid with cover images
- Group detail page with member list
- Create group with cover image upload
- Group chat (via thread infrastructure)
- Group member counts via grouped RPC
- Group categories (Business, Fitness, Faith, Family, Outdoors, Finance, Social, Other)
- 3-category model: Group / Meet-up / Hobby (later collapsed to Group / Meet-up)
- Filter chips with active/inactive states + counts
- Private group RLS

### Phase 5 — Direct Messages + Threaded Chats (60–100 hrs / $9,000–$15,000)

- Thread system (kind: dm | group | event) with shared infrastructure
- DM threads with Private / Groups / Events tabs
- ThreadChatClient with realtime message subscription
- Realtime author cache (so new senders show name/avatar without refetch)
- MessageInput with send-failure surfacing
- @mentions in thread chats
- Thread history pagination (load older messages)
- Inbox unread badges
- Mark-read on thread open
- `find_or_create_dm` RPC with race-safe pair-key + atomic insert
- Message reactions
- Report messages + DM bubbles
- Inbox previews with last-message + timestamp
- Block-aware DM eviction (block trigger removes both users from shared threads)

### Phase 6 — Meetups (30–50 hrs / $4,500–$7,500)

- Meetups list page
- Create meetup with date/time, location (lat/lng), category
- Meetup detail with RSVPs and check-ins
- Meetup check-in with GPS verification (radius + time)
- Meetup host display
- Auto-broadcast new meetups to feed + main chat
- Meetup admin-only with hide-UI for non-admins
- Per-day meetup grouping on feed

### Phase 7 — Member Directory + Profile (40–60 hrs / $6,000–$9,000)

- Members list with paginated load
- Member search (full_name + username substring)
- Member profile pages with all details
- ProfileEditor with all fields (bio, occupation, company, IG, Venmo, CashApp, birthday, spouse, kids, interests, photo)
- Profile photo upload with client-side resize
- Watchmen Member Number based on join order
- Digital Member Card (gold gradient credential)
- Member card share-as-PNG image generation
- Block / report user flows
- Partnerships + discounts section on profile
- Personal invite link with copy + share

### Phase 8 — Admin Tools (40–80 hrs / $6,000–$12,000)

- Admin command center / dashboard with stats
- Pending approvals queue with approve/reject actions
- Member management page (set role, view details)
- Event management (create, edit, delete)
- Partnerships management (create, edit, delete partners)
- Reports moderation queue
- Leaderboard with points audit trail
- Upcoming birthdays card
- Admin role gating throughout (member / admin / super_admin)
- Super-admin firehose (push for posts, comments, RSVPs, votes, messages)
- Admin push notification on new signup

### Phase 9 — Push Notifications (40–80 hrs / $6,000–$12,000)

- Web Push (VAPID) for browsers
- Service worker for background push delivery
- Permission request flow with iOS PWA-mode detection
- In-app foreground banner (iMessage-style)
- `push_subscriptions` table with platform routing (web / ios / android)
- Native APNs push via `@capacitor/push-notifications`
- AppDelegate APNs token capture (Capacitor handles via ApplicationDelegateProxy)
- `registerNativeDeviceTokenAction` server action
- `@parse/node-apn` server-side APNs sender
- APNs Auth Key (`.p8`) creation in Apple Developer portal
- Env-var pipeline for APNs credentials (Key ID, Team ID, Bundle ID, base64 .p8)
- Foreground push dispatch via custom event for in-app banner
- Stale token cleanup on 410/BadDeviceToken
- Test push button with delivery counter

### Phase 10 — Reports + Moderation (30–50 hrs / $4,500–$7,500)

- Migration 00019: reports + user_blocks + profile flags
- Report posts, comments, messages, members
- Reports table with status (open / resolved)
- `/admin/reports` moderation queue with action buttons
- Block user flow + RLS to hide blocked content everywhere
- Block trigger evicts both users from shared DM threads
- Suspend = content takedown (RLS-aware via `is_author_visible`)
- 24-hour moderation commitment (in Terms + DisclaimerGate)
- Report button on every post, comment, message, member profile

### Phase 11 — Security Hardening (60–100 hrs / $9,000–$15,000)

- **5+ rounds of automated security audits** (Codex / Claude Code)
- P0 RLS findings fixed (column-revoke cascades, hidden columns)
- P1 functional bugs fixed
- P2 polish + edge cases
- `find_or_create_dm` race condition fix (atomic insert with pair-key conflict)
- `home_feed_stats` viewer derivation regression + fix
- Block-aware profile select policies
- Approval-aware content filtering (suspending = takedown)
- SECURITY DEFINER function hardening (search_path locking)
- DM eviction trigger on user_blocks
- Profile select policy block-awareness
- Posts/comments/thread_messages read policies require approved author
- Native push token cleanup

### Phase 12 — Performance Optimizations (30–50 hrs / $4,500–$7,500)

- `home_feed_stats` RPC (4 queries → 1)
- Comment loading on-demand (was pre-fetching every comment for every post)
- Lazy-load feed post images
- Service worker shell caching
- Realtime author cache in ThreadChatClient
- @mention picker switched to load-once + client filter
- Image resize before upload (client-side)
- Loading skeletons on every /app tab
- Middleware trim to skip public routes / assets
- Drop duplicate `requireApproved()` calls
- PullToRefresh listener churn fix
- Group page member count via `head:true` instead of fetching all rows
- WKWebView bounce lock + scroll indicator hide (AppDelegate)

### Phase 13 — PWA Setup (15–25 hrs / $2,250–$3,750)

- `manifest.json` with theme color, icons, scope
- 192/512/maskable icons
- Apple touch icon
- Service worker for push + caching
- Add to Home Screen flow on iOS
- Pull-to-refresh
- iOS standalone mode detection
- Splash screen handling for PWA install

### Phase 14 — Email (15–25 hrs / $2,250–$3,750)

- Resend integration with fail-soft path
- Branded HTML template shell (dark gold theme)
- Plain-text fallback for every template
- Templates:
  - Admin new signup notification
  - Signup received confirmation (closes the loop on /pending screen)
  - Welcome approved (with first-steps checklist)
  - Event reminder
  - Calendar invite with `.ics` attachment (base64 encoded)
- `MAIL_FROM`, `MAIL_REPLY_TO`, `APP_URL` env wiring
- Multi-admin distribution via `RESEND_ADMIN_NOTIFY_TO` env

### Phase 15 — Legal Documents (20–40 hrs / $3,000–$6,000 + $2–5k lawyer)

- Privacy Policy (collects/doesn't collect, location, push tokens, child safety)
- Comprehensive Terms of Service covering:
  - Apple App Store Guideline 1.2 compliance (UGC, 24hr moderation, report, block, terminate)
  - Eligibility + 18+ age gate
  - Code of conduct (prohibited content list)
  - License granted to operator
  - DMCA notice procedure
  - Disclaimer of warranties + liability cap ($100)
  - Indemnification
  - **Arbitration + class action waiver** (Pinellas County, FL)
  - Apple-specific EULA terms (third-party beneficiary clauses)
  - Governing law + venue (Florida)
  - Change-of-terms + entire agreement
- DisclaimerGate (in-app, non-dismissable, links to ToS + Privacy)
- Onboarding disclaimer acknowledgment gate
- Signup form Terms checkbox (required before submit)

> A real agency would add a $2,000–$5,000 line item for actual lawyer review.
> Worth considering once Watchmen monetizes or scales past ~1,000 members.

### Phase 16 — Capacitor iOS Wrap (20–40 hrs / $3,000–$6,000)

- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` install
- `capacitor.config.ts` with appId `me.gy6.watchmen`, server URL, content inset, background color
- iOS Xcode project generation
- AppDelegate customization (WebView bounce lock, scroll indicator hide)
- `Info.plist` (export-compliance exemption key)
- App icon generation (1024×1024 YG hexagon on black)
- Launch screen generation (2732×2732 YG mark on black)
- LaunchScreen.storyboard wiring
- `cap sync ios` pipeline
- `@capacitor/push-notifications` plugin install + Swift integration

### Phase 17 — Apple Developer + App Store Submission (30–60 hrs / $4,500–$9,000)

- Apple Developer Program enrollment ($99/yr — your only out-of-pocket)
- App ID registration with bundle `me.gy6.watchmen`
- Capabilities: Push Notifications, Sign in with Apple, Associated Domains
- APNs Auth Key (.p8) creation + base64 export
- Provisioning profile (auto-managed)
- App Store Connect listing creation (Watchmen GY6)
- App Privacy questionnaire — all 10 data types configured with purpose, identity linkage, tracking flags, required/optional
- 10 App Store screenshots at 1320×2868 (6.9" Display)
- App description (1,800 chars), promotional text, keywords (100 chars), support URL, marketing URL, privacy policy URL
- Subtitle, primary + secondary categories
- Age Rating (17+)
- Content Rights answered
- App Encryption Documentation (exempt)
- Pricing (Free), Availability (US)
- App Review Information: dedicated test login (`assetlabsllc@gmail.com`), contact info, detailed reviewer notes explaining invite-only model
- Manual release control
- Build archive (twice — iPad-removed v2)
- IPA upload via Xcode Organizer
- Build attached to version
- Submitted for review

### Cross-cutting: Design (80–150 hrs / $12,000–$22,500)

- Custom brand system: gold-on-black with YG hexagon mark
- ~50 unique pages designed (feed, events, calendar, groups, chats, members, profile, admin command center, member card, partnerships, legal, etc.)
- Mobile interaction patterns (sticky headers, bottom nav, pull-to-refresh, in-app banners, modal dialogs, share sheets, action rows)
- Custom components: Card, Button, Input, Avatar, FilterPill, Toast, Modal, AdminPill, MemberCard, EventCard, PostComposer
- iOS native polish (safe areas, status bar, home indicator clearance)
- Loading skeletons
- Empty states with helpful copy
- Error states + retry UX
- Gold gradient brand treatment across CTAs

### Cross-cutting: QA + Iteration (40–80 hrs / $6,000–$12,000)

- Multiple bug fix cycles
- Edge case handling
- iOS WebView quirks (rubber-band, scroll indicators, status bar, keyboard, safe areas)
- Hydration warning investigation
- Performance regression hunts
- iOS device + simulator testing
- Push delivery validation
- Migration safety reviews

### Cross-cutting: PM / Discovery / Meetings (40–80 hrs / $6,000–$12,000)

- This is what agencies bill for that you and Dustin handled in texts.
- Initial spec definition
- Sprint planning
- Stakeholder reviews
- Status reports
- Account management
- Change-request management

---

## Bottom-up total (mid-tier agency)

| Bucket | Hours (Low – High) | Cost (Low – High) |
|---|---|---|
| Phase 0 — Foundation | 20–40 | $3,000–$6,000 |
| Phase 1 — Auth + Approval | 30–60 | $4,500–$9,000 |
| Phase 2 — Feed | 80–120 | $12,000–$18,000 |
| Phase 3 — Events | 40–80 | $6,000–$12,000 |
| Phase 4 — Groups | 30–60 | $4,500–$9,000 |
| Phase 5 — DMs + Chats | 60–100 | $9,000–$15,000 |
| Phase 6 — Meetups | 30–50 | $4,500–$7,500 |
| Phase 7 — Members + Profile | 40–60 | $6,000–$9,000 |
| Phase 8 — Admin Tools | 40–80 | $6,000–$12,000 |
| Phase 9 — Push Notifications | 40–80 | $6,000–$12,000 |
| Phase 10 — Reports + Moderation | 30–50 | $4,500–$7,500 |
| Phase 11 — Security Hardening | 60–100 | $9,000–$15,000 |
| Phase 12 — Performance | 30–50 | $4,500–$7,500 |
| Phase 13 — PWA Setup | 15–25 | $2,250–$3,750 |
| Phase 14 — Email | 15–25 | $2,250–$3,750 |
| Phase 15 — Legal Docs | 20–40 | $3,000–$6,000 |
| Phase 16 — Capacitor iOS Wrap | 20–40 | $3,000–$6,000 |
| Phase 17 — App Store Submission | 30–60 | $4,500–$9,000 |
| Design (cross-cutting) | 80–150 | $12,000–$22,500 |
| QA + Iteration | 40–80 | $6,000–$12,000 |
| PM + Meetings | 40–80 | $6,000–$12,000 |
| **Subtotal** | **790–1,470 hrs** | **$118,500–$220,500** |

## Honest reality check

This range is what a **mid-tier US agency would quote a stranger** walking in
with the same brief. It includes the "agency tax" — PM overhead, account
management, design sprints, stakeholder check-ins, change-request paperwork —
that doesn't actually improve the product.

**Strip that down to a competent solo senior dev with a clear spec:** 500–800
hours = **$50,000–$100,000** at US contractor rates. Offshore competent senior:
$25,000–$50,000.

What you actually spent:
- Apple Developer Program: $99 / year
- Supabase Pro: $25 / month (= $300/yr)
- Vercel Pro: $20 / month (= $240/yr)
- Resend: $20 / month (= $240/yr)
- Anthropic / OpenAI API: ~$50–$200 in credits across all sessions
- Domain (gy6.me): ~$15 / year
- **First-year total: ~$995**

**Cost savings vs the lowest realistic agency comparison: $48,000–$220,000+.**
Vs a typical mid-tier agency bid: **~$115,000–$220,000 in saved fees**.

The other thing money doesn't measure: you and Dustin shipped product against
real user feedback in real-time. Every UI tweak, every feature, every legal
clause was decided between the two of you in minutes — not in three-week
discovery sprints.

---

## What about an AI dev agency?

Fair question — AI dev tools (Cursor, Claude Code, GitHub Copilot, v0,
Lovable, Bolt) genuinely speed up coding, typically 30–50% reduction in
raw code-writing time. But **coding isn't where agencies actually bill
most of their hours**. Here's what AI tooling does and doesn't compress.

### What AI tooling DOES make cheaper

- Boilerplate (auth flows, basic CRUD, generic forms) — **60–80% faster**
- Database migrations and SQL — 40–60% faster
- Component scaffolding — 50–70% faster
- Initial Tailwind / CSS styling — 40–60% faster
- Documentation and tests — 50–70% faster

### What AI tooling DOESN'T compress much

- Discovery and spec definition — still needs human + stakeholder time
- Brand and design decisions — still needs a designer with taste
- Edge-case debugging — AI generates plausible-looking bugs at scale
- Integration with real third parties (Apple, Stripe, Twilio) — still a manual dance
- iOS-specific quirks (WKWebView, safe areas, native push, App Store Connect) — still hours of trial and error
- Stakeholder meetings, change requests, scope creep — same as ever
- QA cycles, App Store rejection responses — same as ever
- Legal review, accessibility audits — still need humans

### Realistic AI-agency pricing for the same scope

| Tier | What you'd get | Cost | Calendar Time |
|---|---|---|---|
| Pure AI MVP platform (Lovable, Bolt, v0) | Demo-quality MVP. Won't handle native push, advanced RLS, Apple compliance, or production load. | $5,000 – $15,000 | 1–2 months |
| **AI-first boutique shop** (2–5 senior devs using Claude Code, Cursor, etc.) | Production-ready app, scope similar to Watchmen, real engineering judgment | **$30,000 – $70,000** | 2–3 months |
| Traditional agency that "uses AI" but still bills full rate | Same product, same agency overhead, slightly faster delivery | $80,000 – $160,000 | 3–5 months |

**Realistic AI-first shop comparison: $40k–60k.** That's roughly **50% off**
the mid-tier traditional number.

### So why is your spend so much lower than even an AI agency?

It's not that AI tools made coding "free." It's that **you eliminated the
agency overhead entirely**. An AI-first shop still bills $40k+ because they
still have to:

- Hold discovery meetings with a stranger to figure out what you actually want
- Run brand and design discussions and Figma reviews
- Stand up code review and QA cycles
- Navigate Apple Developer + App Store Connect for the first time on this project
- Manage multiple sign-off cycles between you and them
- Cover the "revision tax" — every "actually let's change that" gets re-quoted

Things you and Dustin did for free that an AI agency would have billed for:

- **You were the PM.** No discovery sprints, no slide decks, no change-request paperwork. Dustin texted "make it look like this" and the change shipped that day.
- **You and Dustin were the design team.** No design sprint. No Figma handoff cycles. Direct iteration on the live app.
- **You knew the spec going in.** No discovery phase. Months of pre-thinking compressed into the prompt.
- **You ate the learning curve yourself.** Xcode, App Store Connect, APNs, Capacitor wraps, iOS quirks — an agency bills 20–40 hours of "ramping up their team" on each.
- **Zero revision tax.** Every "let's change that" cost zero dollars and zero re-quotes.

### Net cost comparisons

| Compared to | Savings |
|---|---|
| **Mid-tier traditional agency** ($118k–$220k) | **$117,000 – $219,000 saved** |
| **AI-first boutique shop** ($40k–$60k) | $39,000 – $59,000 saved |
| **Pure AI MVP platform** ($10k) | ~$9,000 saved, but you'd have a much worse product |

### The bottom line

The "AI agencies" charging $5–15k for an "MVP" can build a Lovable-quality
demo. They won't ship Watchmen with native push, RLS-enforced moderation,
Apple-compliant legal docs, and a TestFlight build. That's a different
category of product.

The honest framing isn't "AI did it." It's that **you skipped the middleman**.
You used the same tools an AI agency would use, but you also knew the customer
(Dustin), made every product decision yourself, and didn't pay for the
meetings about the meetings.

---

## What's still ahead (post-launch v1.1+)

These would each be additional line items at any agency:

- Native Capacitor keyboard plugin for iOS-native typing UX (~$1,500–$3,000)
- Universal Links so invite URLs deep-link into the installed app (~$2,000–$4,000)
- Android Capacitor wrap + FCM push wiring (~$15,000–$30,000)
- Lawyer review of Terms of Service (~$2,000–$5,000)
- Accessibility audit + remediation (~$5,000–$10,000)
- In-app payments / Stripe Checkout if monetizing partnerships ($8,000–$20,000)
- Analytics + retention dashboards ($5,000–$15,000)
- CI/CD pipeline beyond Vercel auto-deploy ($3,000–$8,000)
- Onboarding video production + integration ($2,000–$10,000)
- Marketing website (gy6.me landing + about + contact + press) ($5,000–$15,000)

---

## What Apple is reviewing right now

Build `1.0 (2)`, uploaded via Xcode Organizer to App Store Connect,
submitted with:

- Bundle ID: `me.gy6.watchmen`
- Team: Aaron Pilkington (5F5C5G25Y6)
- 10 screenshots at 1320×2868 (6.9" Display)
- App Privacy: all 10 data types configured
- Review login: `assetlabsllc@gmail.com` / `AppleTest!!!`
- Notes: 3,240 chars explaining the invite-only model
- Status: **Waiting for Review** as of June 3, 2026 4:08 PM EDT

Expected approval window: 24–72 hours.
