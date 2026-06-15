# Codex debug prompt — Watchmen iOS camera-option hiding

## Context

I'm shipping "Watchmen" — a Capacitor 8 wrap of a Next.js 14 PWA — to the iOS App Store. The web app loads from `https://watchmen-six.vercel.app` inside a WKWebView. Bundle ID `me.gy6.watchmen`. Apple rejected build 1.0(2) under Guideline 2.1(a) for an iPad crash when tapping the photo upload control.

## The actual crash

iOS log on tap of "Take Photo or Video":

```
This app has crashed because it attempted to access privacy-sensitive data without a usage description.  The app's Info.plist must contain an NSCameraUsageDescription key with a string value explaining to the user how the app uses this data.
```

`libsystem_kernel.dylib`__abort_with_payload` on Thread 30 — iOS hard-terminating per privacy policy.

## What I tried and why each failed

The user explicitly wants the "Take Photo or Video" option **completely removed from the iOS WebKit file-input action sheet**. Library upload works fine; only the camera path crashes. The user does NOT want to remove video uploads — videos from the library should still work.

### Attempt 1: Trim `NSCameraUsageDescription` from Info.plist
Theory: WebKit hides the camera item when Info.plist doesn't declare camera usage.
Result: Wrong. WebKit's iOS file-input action sheet always shows Take Photo or Video regardless of Info.plist content. Removing the key just made tapping it crash with the abort above. **Required to PREVENT crash, doesn't HIDE the option.**

### Attempt 2: Replace HTML `<input type="file">` with `@capacitor/camera` `Camera.pickImages()` + `@capawesome/capacitor-file-picker` `FilePicker.pickMedia()`
Theory: A Capacitor plugin that calls PHPickerViewController bypasses the system file-input sheet entirely.
Result: Plugin was added to `package.json` (`@capacitor/camera@8.2.0`, `@capawesome/capacitor-file-picker@8.0.2`), `npx cap sync ios` correctly wrote `ios/App/CapApp-SPM/Package.swift` with the plugin dependencies, the App target's `project.pbxproj` linked `CapApp-SPM`, but every runtime call returned `{"code":"UNIMPLEMENTED"}`. Xcode's SPM resolver wasn't compiling the local-path Swift packages into the binary even after `rm -rf node_modules ios/App/Pods ios/App/Podfile.lock` + npm install + cap sync + Clean Build Folder. Verified the `@objc func pickMedia` method exists in `node_modules/@capawesome/capacitor-file-picker/ios/Plugin/FilePickerPlugin.swift` at version 8.0.2.

### Attempt 3: Use extension-only `accept`
Theory: `accept=".jpg,.jpeg,.png,.heic,.heif,.gif,.webp,.mp4,.mov,.m4v"` (no `image/*` or `video/*` wildcards) routes iOS WebKit's file input to `UIDocumentPickerViewController` (Files app) instead of the photo action sheet — which has no camera entry point.
Result: Failed on iOS. WebKit still shows the photo action sheet because the extensions resolve to image/video MIME types internally. (This trick works on Mac Catalyst / macOS Safari but not iOS WKWebView.)

## Current shipped state (build 1.0(7))

- `accept="image/*,video/*"` (image-only sites use `accept="image/*"`)
- Info.plist has `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`
- Camera path no longer crashes — iOS shows permission prompt → grants → camera works
- But "Take Photo or Video" is still visible in the action sheet, which the user wants gone

## Question for you, Codex

I need either:

**A. A way to actually compile the Capacitor plugins** so `FilePicker.pickMedia()` returns a result on iOS device. What specific Xcode steps am I missing? Is `Package.swift` with local-path `.package(name: "X", path: "../../../node_modules/X")` references known-fragile in Capacitor 8 SPM mode? Should I be on `CocoaPods` mode instead — and if so, how do I migrate from SPM to Pods cleanly given the existing `CapApp-SPM/` layout?

**B. A custom Swift solution** that hides the camera option from iOS WKWebView's native file-input action sheet without rewriting every `<input type="file">` call site. Possibilities I'd like you to evaluate:
  - Method swizzling on `UIViewController.present(_:animated:completion:)` in AppDelegate to intercept the photo picker action sheet, walk its items, and remove the camera option before presenting?
  - Subclassing `CAPBridgeViewController` and overriding the WKWebView UI delegate?
  - Some Info.plist key I'm not aware of that suppresses the option?
  - A Capacitor 8 plugin specifically for this (other than `@capacitor/camera` and `@capawesome/capacitor-file-picker`) that's known to work reliably?

**C. Confirmation that A and B are both dead ends** and the right move is to ship as-is (camera visible but functional via the permission prompt) and hope Apple Review approves on the basis that nothing crashes.

## File-input call sites currently in the repo

- `src/components/feed/FeedComposer.tsx` — `accept="image/*,video/*"`
- `src/components/chat/MessageInput.tsx` — `accept="image/*,video/*"`
- `src/app/app/dms/[threadId]/ThreadChatClient.tsx` — `accept="image/*,video/*"`
- `src/components/profile/AvatarUpload.tsx` — `accept="image/*"`
- `src/app/app/groups/new/GroupCoverInput.tsx` — `accept="image/*"`
- `src/app/(admin)/admin/events/CreateEventForm.tsx` — `accept="image/*"`
- `src/app/preview/welcome/photo/page.tsx` — `accept="image/*"`

## Stack / versions

- Capacitor `^8.4.0` (CLI, core, ios)
- Next.js `14.2.15` (App Router)
- iOS deployment target 15.0
- Xcode current
- Swift Package Manager mode (no Podfile)
- `ios/App/CapApp-SPM/Package.swift` references local-path node_modules

## What I need back

A concrete plan with file paths and exact code snippets. If you recommend the plugin route, give me the exact `npm install` and Xcode menu steps and tell me what to look for in the build log to confirm the plugin actually linked. If you recommend the Swift swizzling route, give me the AppDelegate code to drop in. If you recommend ship-as-is, justify it with what Apple's reviewer is most likely to do.
