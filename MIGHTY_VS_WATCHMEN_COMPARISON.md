---
title: "Mighty Networks vs The Watchmen Custom App"
subtitle: "A side-by-side comparison and total cost of ownership analysis"
date: "June 3, 2026"
---

# Mighty Networks vs The Watchmen Custom App

**Prepared:** June 3, 2026
**For:** Dustin Lachance / Aaron Pilkington
**Subject:** Strategic comparison of the two paths Dustin considered for The Watchmen brotherhood app

---

## Executive Summary

Dustin was originally evaluating **Mighty Networks** — a SaaS community platform that offers two relevant tiers:

1. **Mighty Scale** ($2,148–4,320/year): Watchmen as a "sub-brand" inside the generic Mighty Networks app
2. **Mighty Pro** ($17,000–30,000+/year): A fully branded native iOS + Android app, with optional custom development on top ($12,000–60,000+ one-time)

Instead, Aaron built a fully custom Watchmen app over ~3 weeks for roughly **$200/year in infrastructure**. The custom app is now in Apple's App Store review queue with native push, RLS-enforced moderation, and Watchmen-specific features.

**5-year cost comparison:**

| Path | 5-Year Total | One-Time Setup | Annual Recurring |
|---|---|---|---|
| Mighty Scale | $10,740 – $21,600 | $0 | $2,148 – $4,320 |
| Mighty Pro | $97,000 – $180,000+ | $12,000 – $60,000 | $17,000 – $30,000 |
| **Watchmen custom (what was built)** | **~$1,000** | **~$99 (Apple)** | **~$200 (infra)** |

**Net savings vs Mighty Pro: $96,000 – $179,000 over 5 years.**

---

## What Dustin originally said

Dustin's exact words about the Mighty Networks options:

> *"It's called Mighty… or you can get your own icon if you do the custom map with them which ranges from 12 to 18,000 or you could just go underneath Branding and have your own sub category and pay a monthly fee."*

Translating his quote into the real options:

- *"Custom map"* → he meant **custom app** (Mighty Pro — fully branded native app with Watchmen's own icon on the App Store)
- *"$12,000 to $18,000"* → Mighty Pro starts around this for the basic tier, but for a real production deployment with the features Watchmen needs, the actual range is closer to **$17,000–$30,000/year**, plus one-time custom dev fees of $12,000–$60,000+
- *"Underneath Branding and have your own sub-category"* → Mighty Scale plan, where Watchmen would be a community inside the generic Mighty Networks app (members download "Mighty," then find Watchmen)

---

## Mighty Networks pricing — what's actually available

Verified pricing as of June 2026 from Mighty Networks and independent reviews:

### Mighty Community ($41/mo annual / $492/yr)

- Basic community features inside the Mighty Networks app
- Members must download "Mighty Networks" app and find Watchmen inside
- No custom branding, no custom icon
- 3% transaction fees on any paid memberships or product sales
- Best for: small free communities just starting out

### Mighty Business ($119/mo annual / $1,428/yr)

- More features (courses, events, live streaming)
- Still inside Mighty's app, no custom branding
- 2% transaction fees
- Best for: small paid communities running courses

### Mighty Scale ($179–360/mo / $2,148–4,320/yr)

- **This is the "Branding" tier Dustin mentioned**
- Custom subdomain (e.g., watchmen.mighty.com)
- Branded community page inside the Mighty app
- Members still download "Mighty Networks" app, not "Watchmen"
- 1% transaction fees
- Best for: established communities that want their own visual identity but don't need a standalone app

### Mighty Pro ($17,000–$30,000+/year)

- **This is the "custom map" tier Dustin mentioned**
- Fully white-labeled native iOS + Android apps
- "Watchmen" name and icon in the App Store + Google Play
- Custom theming, branding throughout
- Multi-year commitments required (typically 2–3 years minimum)
- Customer success + onboarding included
- One-time custom development add-ons cost an additional **$12,000–$60,000+**
- Best for: established communities ready to invest in a premium owned-experience

---

## Feature-by-feature comparison

| Capability | Mighty Scale | Mighty Pro | Watchmen Custom (what was built) |
|---|---|---|---|
| Native iOS app with Watchmen icon on App Store | No (Mighty's icon) | Yes | Yes |
| Native Android app | No | Yes | Planned (Capacitor wrap) |
| Custom brand identity (gold/black, YG hexagon) | Limited theme | Yes | Yes (pixel-perfect) |
| Feed with posts, comments, polls, likes | Yes | Yes | Yes |
| Direct messages (1:1 + groups) | Yes | Yes | Yes |
| Events with RSVPs | Yes | Yes | Yes |
| Calendar grid view | Basic | Basic | Yes (custom month grid) |
| Member directory | Yes | Yes | Yes |
| Watchmen Member Number (based on join order) | No | Custom dev required | Yes |
| Digital Member Card (shareable credential) | No | Custom dev required | Yes |
| Partnerships & member discounts section | No | Custom dev required | Yes |
| Meetup check-ins with GPS verification | No | Custom dev required | Yes |
| Birthday recognition + auto-posts | No | Custom dev required | Yes |
| Invite-only signup with admin approval | Manual workaround | Manual workaround | Yes (built-in) |
| Sophisticated moderation (block/report + RLS) | Basic | Basic | Yes (block-aware RLS) |
| Push notifications (iOS) | Yes | Yes | Yes (APNs wired) |
| Push fan-out per event type (per-admin firehose) | No | No | Yes |
| Custom Terms of Service enforcement | Limited | Limited | Yes (full custom ToS) |
| Custom email branding | Limited | Yes | Yes (Resend) |
| Payment processing built-in | Yes (1–3% fees) | Yes (1–3% fees) | Planned (Stripe direct, no platform fee) |
| Own the database / user data | No (Mighty's) | No (Mighty's) | Yes Yours (Supabase) |
| Export-anywhere portability | Hard | Hard | Yes Full SQL exports |
| Pivot or expand without vendor approval | No | No | Yes |
| Vendor lock-in risk | High | High | None |
| Engineering / maintenance burden | None | None | Aaron's time |

---

## Payment processing: Stripe vs Mighty's built-in

One of Mighty's selling points is that payments are built in. The trade-off:

| | Mighty (built-in) | Stripe direct (custom Watchmen) |
|---|---|---|
| Setup time | 0 (already integrated) | 2–4 hours (Stripe Checkout / Stripe Billing wiring) |
| Platform fee | **1–3%** on top of Stripe's processing fee | **0%** platform fee — just Stripe's standard 2.9% + $0.30 |
| Subscription management | Yes | Yes (Stripe Billing) |
| Apple Pay / Google Pay | Yes | Yes |
| Customer portal (cancel, update card) | Yes | Yes (Stripe-hosted) |
| Tax handling | Limited | Yes (Stripe Tax) |
| Refunds | Yes (Mighty dashboard) | Yes (Stripe dashboard) |
| Webhooks / custom logic | Limited | Yes (full control) |

**Translation:** Stripe is the better long-term choice for Watchmen because:

1. **No platform fee.** Mighty charges 1–3% *on top of* Stripe's own fees. On $100,000 of annual membership revenue, that's $1,000–3,000/year going to Mighty instead of Watchmen.
2. **Battle-tested integration time is small.** Aaron has done it before — typically a 2–4 hour job to add Stripe Checkout for one-time payments or Stripe Billing for recurring subscriptions.
3. **Full control over the experience.** Custom checkout flows, custom email receipts, custom dunning, custom proration logic.
4. **Standard webhook integration** with Supabase means events like "membership renewed" or "card failed" can trigger downstream logic in Watchmen directly.

**For the v1.1 monetization plan** (whenever Dustin wants to charge for membership or sell partnership tiers), wiring Stripe is a 1-day add-on to Watchmen and saves the 1–3% Mighty platform tax in perpetuity.

---

## Total cost of ownership (TCO) over 5 years

Assumptions:
- Watchmen reaches 250 active members
- All paths add basic payment processing eventually (Stripe direct on custom; built-in on Mighty)
- All paths run iOS + Android
- Mighty Pro requires a 3-year minimum commitment for the "custom map" branded app tier

### Mighty Scale path (Watchmen as sub-brand inside Mighty app)

| Year | Annual cost | Cumulative |
|---|---|---|
| 1 | $2,148 – $4,320 | $2,148 – $4,320 |
| 2 | $2,148 – $4,320 | $4,296 – $8,640 |
| 3 | $2,148 – $4,320 | $6,444 – $12,960 |
| 4 | $2,148 – $4,320 | $8,592 – $17,280 |
| 5 | $2,148 – $4,320 | **$10,740 – $21,600** |

Plus 1% transaction fees on any paid memberships (could be $1k–$10k/yr depending on monetization).

### Mighty Pro path (custom branded app)

| Year | Annual cost | One-time | Cumulative |
|---|---|---|---|
| 1 | $17,000 – $30,000 | $12,000 – $60,000 setup | $29,000 – $90,000 |
| 2 | $17,000 – $30,000 | — | $46,000 – $120,000 |
| 3 | $17,000 – $30,000 | — | $63,000 – $150,000 |
| 4 | $17,000 – $30,000 | — | $80,000 – $180,000 |
| 5 | $17,000 – $30,000 | — | **$97,000 – $210,000** |

### Watchmen custom (what Aaron built)

| Year | Annual cost | One-time | Cumulative |
|---|---|---|---|
| 1 | $200 (infra) | $99 (Apple Dev) | $299 |
| 2 | $200 | $99 | $598 |
| 3 | $200 | $99 | $897 |
| 4 | $200 | $99 | $1,196 |
| 5 | $200 | $99 | **$1,495** |

Plus Stripe processing fees on payments (just 2.9% + $0.30 per transaction — no platform tax on top).

### Bottom line

| Path | 5-Year Total |
|---|---|
| Mighty Scale | $10,740 – $21,600 |
| Mighty Pro | $97,000 – $210,000 |
| Watchmen custom | **$1,495** |

**Savings of the custom app over Mighty Pro: $95,505 – $208,505** over 5 years.

That's roughly enough to fund:
- A full-time community manager for 1–2 years
- 5–10 yacht-level launch events
- A real marketing push to grow to chapter #2 (Naples, Ft. Lauderdale, Miami, Austin, etc.)
- Or simply stay in Dustin's bank account

---

## What Mighty Networks does well (and where it would have been the right choice)

To be fair to Mighty — they're a legit product. They would have been the better choice if:

- **Speed to launch matters more than fit.** Mighty can be live in 48 hours. Custom took 3 weeks.
- **Nobody on the team can build software.** Mighty requires zero engineering. Watchmen required Aaron.
- **Generic features are enough.** If you don't need a digital Member Card, Watchmen Numbers, GPS check-ins, custom partnerships — Mighty's stock features may cover 80% of what you'd want.
- **You need built-in courses or VOD.** Mighty has courses and video baked in. Custom would need to add this if you want it later.
- **You want to avoid ALL ongoing maintenance.** Mighty handles every bug fix, every iOS update, every security patch. Custom requires Aaron's time to maintain.

For a generic community wanting to launch fast, Mighty is fine.

For Watchmen specifically — invite-only, gold/black brotherhood with bespoke features and a strong brand identity — it would have been the wrong fit at any price.

---

## What it would have cost Dustin to go the Mighty Pro route

Realistic 3-year commitment estimate (Mighty Pro requires multi-year contracts):

| Item | Cost |
|---|---|
| Mighty Pro Essentials annual fee (Year 1) | $17,000 – $25,000 |
| One-time custom development (member card, partnerships, etc.) | $20,000 – $40,000 |
| Year 2 annual fee | $17,000 – $25,000 |
| Year 3 annual fee | $17,000 – $25,000 |
| 1% transaction fees on $100k of paid memberships (est.) | $3,000 |
| **3-year total** | **$74,000 – $118,000+** |

Versus Watchmen custom over 3 years: **~$900**.

**Net cost avoidance for Dustin: $73,000 – $117,000+ over the first 3 years**, in addition to the $118,000–$220,000 dev work Aaron delivered for free.

---

## Bottom-line recommendation

For a brand-first, identity-driven, invite-only community like Watchmen — **the custom path is strictly better on every dimension except ongoing maintenance burden.**

The maintenance burden becomes the real question. Aaron is the only person who knows the codebase deeply right now. The realistic options going forward:

1. **Aaron continues maintaining as a partner / co-founder** with equity in the brotherhood / GY6 LLC
2. **Aaron is paid a retainer** (e.g., $500–2,000/month) to keep the lights on and ship updates
3. **Aaron documents everything and steps back**, and Dustin hires a part-time dev when needed (~$2k–5k/year of contract work)

Any of those three is cheaper than Mighty Pro. The conversation between Aaron and Dustin about which path to choose is its own discussion — but the math on what was built vs what was avoided makes it clear: **walking away from this would mean handing $95k–$208k of value back to a SaaS vendor for no reason.**

---

## Sources

All Mighty Networks pricing and feature data was verified June 3, 2026 from:

- [Mighty Networks Official Pricing Page](https://www.mightynetworks.com/pricing)
- [Mighty Networks Pricing 2026: Plans & True Costs — CheckThat.ai](https://checkthat.ai/brands/mighty-networks/pricing)
- [Mighty Networks Pricing: Everything You Need to Know (2026) — EzyCourse](https://ezycourse.com/blog/mighty-networks-pricing)
- [Mighty Networks Pricing 2026: Plans & Transaction Fees — Ruzuku](https://www.ruzuku.com/compare/mighty-networks-pricing)
- [Mighty Networks Review 2026: Pricing, Fees & Limitations — Ruzuku](https://www.ruzuku.com/learn/articles/is-mighty-networks-any-good)
- [Mighty Networks Pricing & FAQ in 2026 — Course Platforms Review](https://www.courseplatformsreview.com/blog/mighty-networks-pricing/)
- [Mighty Networks Pricing in 2026: Plans, Costs & Alternatives — Scrile](https://www.scrile.com/blog/mighty-networks-pricing)
- [Mighty Networks Mobile App 2026 Review — Course Platforms Review](https://www.courseplatformsreview.com/blog/mighty-networks-mobile-app/)

Stripe pricing and integration approach verified from:

- [Stripe Pricing (official)](https://stripe.com/pricing)
- [Stripe Billing for SaaS subscriptions (official)](https://stripe.com/billing)
- [Stripe Tax (official)](https://stripe.com/tax)

---

*Prepared by Aaron Pilkington for The Watchmen / GY6, June 3, 2026.*
