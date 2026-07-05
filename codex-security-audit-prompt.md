# Watchmen GY6 — Full Security & Debugging Audit (READ-ONLY)

## Your role
You are a senior application security engineer + staff-level debugger performing a **complete, adversarial security and reliability audit** of the Watchmen GY6 codebase and its connected infrastructure. I have given you access to data/exports from **Supabase, Vercel, GitHub, and the project files**. Use all of it.

## HARD CONSTRAINTS — read these first
1. **DO NOT modify, edit, write, refactor, or "fix" any file.** This is a read-only audit. Do not run formatters, codemods, or migrations. Do not stage commits.
2. For **every** issue, you must output the **exact code lines to change** — precise `before` and `after` snippets with the file path and line numbers — so a separate engineer can apply them. You propose the patch; you never apply it.
3. If a fix requires something other than a code edit (a new DB migration, an RLS policy change, a Supabase dashboard setting, a Vercel env/header change, an iOS Info.plist/entitlement change, a GitHub setting), say so explicitly and label it: `[WEB CODE]`, `[DB MIGRATION]`, `[SUPABASE CONFIG]`, `[VERCEL CONFIG]`, `[NATIVE IPA]`, or `[GITHUB CONFIG]`. This matters because web/DB changes ship instantly but native changes require a new App Store build.
4. Do not invent file paths, line numbers, table names, or policies. If you cannot verify something from the data provided, mark it **NEEDS VERIFICATION** and state exactly what you'd need to confirm it.
5. Distinguish **confirmed** findings (you can point to the exact vulnerable code/config) from **suspected** ones.

## Repository
- **GitHub repo:** https://github.com/Watchmengy6/watchmen  (default branch: `main`)
- Inspect the full repo — source, config, migrations, CI/CD workflows, and commit history (scan history for committed secrets / `.env*` files).

## Stack context (so you know what to look for)
- **Frontend/Backend:** Next.js 14 App Router (server components + server actions). Server actions live in `src/lib/<feature>/actions.ts` with `"use server"`. Form actions must return `Promise<void>`.
- **Auth gates:** `requireApproved()` and `requireAdmin()` in `src/lib/auth/gates.ts`. `/app/*` requires approved auth; `/(admin)/admin/*` requires admin.
- **DB:** Supabase Postgres with **Row Level Security**. ~37 migrations. Some columns are **revoked from the `authenticated` role** (e.g. `profiles.email`, `profiles.phone`, `profiles.invite_code`, `event_rsvps.checked_in`) and are only reachable via a **service-role client** or a dedicated RPC.
- **Service-role pattern:** admin pages instantiate an inline service-role client using `SUPABASE_SERVICE_ROLE_KEY` which **bypasses RLS** — it must always be behind `requireAdmin()`.
- **Native:** Capacitor iOS app (webview wrapping the Vercel-hosted site). Config in `ios/App/App/Info.plist`, `AppDelegate.swift`, `App.entitlements`, `capacitor.config.*`.
- **Push:** APNs + Web Push + FCM. Tokens stored in `push_subscriptions`.
- **Email:** Resend. **Hosting:** Vercel. **Repo:** GitHub org.
- **UGC:** posts, DMs, group/event chat, profiles, image/video uploads — rendered via `RichText.tsx` and `ThreadChatClient.tsx`.

## Audit scope — cover ALL of the following

### A. Authentication & Authorization
- Every route under `/app/*`, `/(admin)/admin/*`, every API route, and **every server action** must independently enforce auth — not rely on the page gate alone. Flag any server action that mutates data without re-checking `requireApproved()`/`requireAdmin()` and ownership.
- IDOR: any action/query that takes an id from the client and acts on it without verifying the caller owns/may access that row.
- Privilege escalation paths (e.g. a non-admin reaching admin-only mutations or RPCs).

### B. Supabase RLS & data exposure
- Confirm **RLS is enabled on every table** and that policies actually restrict by `auth.uid()` / membership, not `true`.
- Find every `SUPABASE_SERVICE_ROLE_KEY` / service-role client usage and verify each is admin-gated and never reachable from client code or a non-admin route.
- Find every `.select("*")` (especially on `profiles`, `event_rsvps`) that could leak revoked PII columns.
- PostgREST embeds (`profiles!fk(...)`) that silently error or over-fetch.
- Any RPC (`rpc(...)`) callable by `authenticated`/`anon` that should be restricted; check `SECURITY DEFINER` functions for missing `search_path` and for doing privileged work without internal authz checks.

### C. Secrets & client-bundle leakage
- Any secret exposed to the browser: misuse of `NEXT_PUBLIC_` prefix, service-role key or Resend/APNs keys referenced in a client component, secrets in committed files.
- Scan provided GitHub data for secrets in repo history, committed `.env*`, or hardcoded keys/tokens.

### D. Injection, XSS, and UGC handling
- XSS in rendered user content: `dangerouslySetInnerHTML`, unsanitized markdown/link rendering in `RichText.tsx`, profile fields, chat bodies. Check link handling (`javascript:` URLs, unvalidated `href`).
- SQL injection in any raw SQL / string-built queries / RPC params.
- Open-redirect via unchecked redirect params.

### E. File uploads & storage
- Supabase Storage bucket policies (public vs signed), path traversal in upload keys, missing MIME/size validation, ability to overwrite another user's objects, signed-URL scope/expiry.

### F. Server actions & API hardening
- Missing server-side validation (e.g. a crafted POST bypassing client checks — there's prior history of a signup POST missing `agreed_terms` enforcement).
- Missing rate limiting on auth, invite, messaging, and report/block endpoints.
- Mass-assignment: actions that write client-supplied objects directly into a row.

### G. Native iOS / Capacitor
- `capacitor.config` `server.allowNavigation` / `allowsLinkPreview` / arbitrary external navigation in the webview.
- App Transport Security exceptions, overly broad `Info.plist` usage strings or capabilities, entitlements correctness (`aps-environment`).
- Deep-link / Universal Link validation if present.

### H. Vercel / transport / headers
- Missing or weak security headers (CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) — check `next.config.*`, middleware, and `vercel.json`.
- Env var scoping (prod secrets exposed to Preview deployments), preview-deployment exposure of the app.
- `middleware.ts` auth bypass gaps.

### I. Dependencies
- Known-vulnerable packages from `package.json` / lockfile (flag CVEs, suggest the minimum safe version). `[WEB CODE]`.

### J. Reliability / debugging (not security, but in scope)
Flag crash-risk and correctness bugs, drawing on this app's known failure modes:
- Non-function exports from `"use server"` files (Next 14 strips them → `undefined` at runtime). 
- Unchecked Supabase errors (`{ data, error }` where `error` is ignored).
- Null/undefined access on possibly-empty query results; PostgREST embed array-vs-object shape mismatches.
- Race conditions in realtime reconciliation (DM/chat optimistic send + echo matching).
- Unhandled promise rejections; fire-and-forget writes that can silently fail.
- `usePathname()`/hydration null guards; layout overflow regressions.

## Required output format
Start with a **summary table**, then full findings grouped by severity (Critical → High → Medium → Low → Info).

Summary table columns: `ID | Severity | Category | File | Title | Fix type`

For **each** finding use exactly this structure:

```
### [ID] <short title>
- Severity: Critical | High | Medium | Low | Info
- Confidence: Confirmed | Suspected | Needs Verification
- Category: <A–J above>
- Fix type: [WEB CODE] | [DB MIGRATION] | [SUPABASE CONFIG] | [VERCEL CONFIG] | [NATIVE IPA] | [GITHUB CONFIG]
- Location: <relative/path/to/file.ts:line-range>  (one block per file if multi-file)
- Impact: <what an attacker/user can do, concretely>
- Root cause: <why it happens>

BEFORE (path/to/file.ts, lines X–Y):
```<lang>
<exact current code>
```

AFTER (replace lines X–Y with):
```<lang>
<exact corrected code, ready to paste>
```

- Notes: <migrations to run, config steps, side effects, anything to verify>
```

For non-code fixes (DB/Supabase/Vercel/GitHub/iOS settings), replace the BEFORE/AFTER code blocks with the **exact SQL / config / setting + value** to apply, still precise enough to paste.

## Final sections
End with:
1. **Top 5 fix-first** — ranked by exploitability × blast radius.
2. **Ship-path breakdown** — which fixes are instant (Vercel/web), which need a DB migration, and which require a new App Store build `[NATIVE IPA]` (1.0.2 is live, 1.0.3 is awaiting review).
3. **Open questions / NEEDS VERIFICATION** — anything you couldn't confirm from the provided data and exactly what would confirm it.

Be exhaustive and adversarial. Prefer false positives flagged as "Suspected" over silent misses. Again: **do not change any files — output exact fix code only.**
