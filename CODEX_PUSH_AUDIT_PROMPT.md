# Codex audit — 1.0.2 push notification fix, pre-submission review

## What this audit is for

We're about to submit **1.0.2** to Apple. The 1.0.2 build contains ONE Swift change to fix push notifications, which have been silently failing since 1.0(1). We've already burned two failed submissions chasing this bug (entitlements, then aps-environment) and we cannot afford another wrong-turn submission.

**Your job:** verify the fix is correct, find anything else that could still block push registration in production, and report findings. **Do not modify code.** I'll decide what to act on based on your report.

---

## Background — what we know about the bug

### Symptom

Push notifications never arrive on production (App Store) builds. Specifically:

- `iPhone Settings → Watchmen → Notifications` shows enabled
- In-app "Notifications on · tap to disable" button is shown (i.e. `PushNotifications.checkPermissions()` returns `granted`)
- Tapping "Send test notification" returns a success toast saying "Test sent · 2 devices"
- **But no banner ever arrives**
- Querying `push_subscriptions` shows ONLY old web-push rows (`platform='web'`) from when the app was a PWA in Safari. **Zero rows with `platform='ios'`** despite a fresh App Store install + permission grant + 30s+ wait.

### Two prior failed fixes (rejected as root causes after the fact)

1. **1.0(4) → 1.0.1**: `ios/App/App/App.entitlements` had `aps-environment = development`. Flipped to `production`. Real bug, but only ONE of two needed fixes.

2. **1.0.1 → 1.0.2 (current submission candidate)**: `ios/App/App/AppDelegate.swift` was MISSING the two APNs callback forwarders that Capacitor's `@capacitor/push-notifications` plugin relies on. iOS calls `didRegisterForRemoteNotificationsWithDeviceToken` on AppDelegate after `registerForRemoteNotifications()` succeeds, but our AppDelegate had no implementation, so the token vanished. Added these two methods:

   ```swift
   func application(_ application: UIApplication,
                    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
       NotificationCenter.default.post(
           name: .capacitorDidRegisterForRemoteNotifications,
           object: deviceToken
       )
   }

   func application(_ application: UIApplication,
                    didFailToRegisterForRemoteNotificationsWithError error: Error) {
       NotificationCenter.default.post(
           name: .capacitorDidFailToRegisterForRemoteNotifications,
           object: error
       )
   }
   ```

This is the only Swift change in 1.0.2.

---

## Specific files to inspect

Please open and review these in this order:

1. `ios/App/App/AppDelegate.swift` — verify the two methods I just added are correct, syntactically clean, and use the right NotificationCenter notification names. Confirm there are NO OTHER push-related AppDelegate methods that Capacitor expects to be implemented (foreground notification, background fetch, user-notification-center delegate, etc.) for full push delivery — alert push, foreground display, and tap-handling.
2. `ios/App/App/App.entitlements` — verify `aps-environment = production` is still set and the file is otherwise correct.
3. `ios/App/App/Info.plist` — verify `UIBackgroundModes` (if any) is sensible. Specifically check whether `remote-notification` mode is required for our use case (we only do alert + sound + badge — no silent / content-available push). Flag if missing AND required.
4. `ios/App/App/AppBridgeViewController.swift` — confirm nothing here interferes with push registration. (This is our custom CAPBridgeViewController subclass for WKWebView scroll lock.)
5. `ios/App/CapApp-SPM/Package.swift` — verify `@capacitor/push-notifications` is in the SPM dependency list. If it's not, that explains everything: the plugin isn't included in the IPA at all.
6. `capacitor.config.json` (or `.ts`) at project root — verify there's nothing in the `plugins` section that would disable or misconfigure PushNotifications.
7. `src/lib/push/nativeClient.ts` — confirm the registration flow is sane:
   - permission check
   - listener wired BEFORE `register()` call
   - listener calls `registerNativeDeviceTokenAction` with the right shape
8. `src/lib/push/native.ts` — verify `registerNativeDeviceTokenAction` writes the row correctly:
   - `platform = 'ios'`
   - `device_token = token.value` (raw, not hex-double-encoded)
   - upsert key correct
   - RLS not blocking the insert (it shouldn't because it's a Server Action running with service-role or user session — confirm which)
9. `src/components/push/NativePushRegistrar.tsx` — confirm it's rendered somewhere in the authenticated app shell (likely `src/app/app/layout.tsx`). If not mounted, `initNativePush()` never runs.
10. `src/app/app/layout.tsx` — confirm `<NativePushRegistrar />` is rendered.

---

## Specific questions to answer

For each, give a clear **Yes / No / Couldn't verify** answer:

1. Are the two AppDelegate methods I added (`didRegister...` and `didFailToRegister...`) syntactically correct and using the correct Capacitor NotificationCenter names?
2. Is there a THIRD AppDelegate method or `UNUserNotificationCenterDelegate` setup that is also required for push to work end-to-end, that's currently missing?
3. Is `@capacitor/push-notifications` actually declared as an SPM dependency in `CapApp-SPM/Package.swift`?
4. Does `capacitor.config.json` (or `.ts`) have anything in its `plugins.PushNotifications` config that could affect registration?
5. Is `aps-environment = production` in `App.entitlements`?
6. Is the Push Notifications capability properly declared (via entitlements, since we don't have an `entitlements` build phase visible — just the file)?
7. Is the SUPABASE_SERVICE_ROLE_KEY (or similar elevated context) being used by `registerNativeDeviceTokenAction`, or is it relying on the user's session? If the latter, could RLS on `push_subscriptions` be blocking the insert silently?
8. Is `NativePushRegistrar` actually mounted in the authenticated app shell?
9. Is there any `try { ... } catch { /* silent */ }` block in `nativeClient.ts` that could be swallowing a registration error without surfacing it to the user OR to the server?
10. Is there ANYTHING ELSE you can spot that could block iOS push registration in a production-signed Capacitor app?

---

## What I want back from you

A single report formatted like this:

```
## AUDIT RESULTS

### THE FIX IN 1.0.2
[verify the AppDelegate change is correct — if not, exact fix]

### ADDITIONAL ISSUES FOUND
1. [issue + file + line + severity]
2. ...

### NICE-TO-HAVE IMPROVEMENTS (NOT BLOCKING 1.0.2)
1. ...

### VERDICT
[Safe to submit 1.0.2 as-is? Or fix-then-submit?]
```

**Severity scale:**
- **BLOCKING**: must fix before 1.0.2 submission or push will still fail
- **HIGH**: likely to cause issues post-launch
- **MEDIUM**: should fix soon but won't break push delivery
- **LOW / NICE-TO-HAVE**: polish, defer to v1.1

---

## Important constraints

- **Do not modify any code.** Report only. Aaron will pick what to act on.
- **Be specific.** If you say "this might be wrong," give the file path, line number, and what specifically should change.
- **Don't speculate beyond what you can verify in the codebase.** If you couldn't verify something (e.g. Apple Developer portal capabilities), say "Couldn't verify — check manually in App ID config."
- **Stay focused on push notifications.** If you notice unrelated bugs, list them in a "Bonus findings" section at the end but don't let them dominate.

---

## Context that may save you time

- Apple Developer team ID: `5F5C5G25Y6` (Aaron Pilkington personal)
- Bundle ID: `me.gy6.watchmen`
- App Store Connect app ID: `6776308985`
- The app is a Capacitor 8 wrap of a Next.js 14 web app hosted on Vercel
- The native shell does virtually nothing — it just loads `https://watchmen-six.vercel.app`
- Push subscription storage table: `public.push_subscriptions` with columns `id, user_id, platform, device_token, endpoint, p256dh, auth, user_agent, created_at, last_used_at`
- The user_id column references `profiles.id`, NOT `auth.users.id` (this confused us earlier in debugging)
- The web push subscriptions already in the DB are from prior PWA testing (stale, not relevant to native push)

Go.
