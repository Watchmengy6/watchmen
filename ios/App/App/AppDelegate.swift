import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Primary path: AppBridgeViewController applies the WKWebView bounce
        // lock from viewDidLoad / viewDidAppear. That's the cleanest place
        // for it because the bridge VC owns the webview directly.
        //
        // Belt + suspenders fallback below: if the storyboard custom-class
        // resolution silently falls back to stock CAPBridgeViewController
        // (which happens when module names mismatch in Interface Builder),
        // this retry loop walks the window hierarchy every 100ms for two
        // seconds until it finds a WKWebView and applies the same lock.
        // Both paths are idempotent — running both is harmless.
        applyLockWithRetries(remaining: 20)

        // Re-apply on foreground in case iOS reset any of these between
        // backgrounding and re-activation.
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            DispatchQueue.main.async {
                _ = applyLockToFirstWebView()
            }
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Remote notifications (APNs)
    //
    // These two callbacks are the ONLY way iOS returns a device token after
    // PushNotifications.register() is called from JavaScript. Without them,
    // the JS-side `registration` listener in `@capacitor/push-notifications`
    // is never fired — the plugin observes the
    // `.capacitorDidRegisterForRemoteNotifications` NotificationCenter post
    // that we forward below. The default Capacitor AppDelegate template
    // includes these; ours was missing them, which is why production push
    // registration silently failed even after the aps-environment entitlement
    // was flipped to `production` in 1.0.1.
    //
    // didRegister... posts the raw Data token; the plugin hex-encodes it and
    // fires the "registration" listener in nativeClient.ts, which calls
    // registerNativeDeviceTokenAction to persist the iOS row in
    // push_subscriptions.
    //
    // didFailToRegister... posts the error; the plugin fires the
    // "registrationError" listener in nativeClient.ts, which we log so a
    // future regression here surfaces in console.

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    /// Polls the window hierarchy looking for the Capacitor WKWebView. Applies
    /// the scroll/bounce lock the moment it appears. Bails after `remaining`
    /// attempts so we don't loop forever on a misconfigured build.
    private func applyLockWithRetries(remaining: Int) {
        DispatchQueue.main.async {
            if applyLockToFirstWebView() {
                return
            }
            if remaining > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                    self?.applyLockWithRetries(remaining: remaining - 1)
                }
            }
        }
    }
}

/// Walks the active window's view hierarchy, finds the WKWebView Capacitor
/// mounted, and turns off rubber-band scrolling + scroll indicators. Returns
/// true if a WKWebView was found and locked; false if nothing to lock yet.
@discardableResult
private func applyLockToFirstWebView() -> Bool {
    guard let window = UIApplication.shared.connectedScenes
            .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
            .first else { return false }
    guard let webView = findWebView(in: window) else { return false }
    let sv = webView.scrollView
    sv.bounces = false
    sv.alwaysBounceVertical = false
    sv.alwaysBounceHorizontal = false
    sv.isDirectionalLockEnabled = true
    sv.contentInsetAdjustmentBehavior = .never
    sv.showsVerticalScrollIndicator = false
    sv.showsHorizontalScrollIndicator = false
    // NOTE: this fallback only sets the static bounce flags. The DURABLE
    // horizontal lock (continuous contentSize/contentOffset clamp via KVO)
    // lives in AppBridgeViewController, which owns the webview and has a
    // stable lifetime. We deliberately do NOT pin contentSize here: a
    // one-shot assignment is overwritten by WebKit on the next layout
    // (i.e. the moment uploaded media decodes), which is the exact bug
    // the bridge-VC KVO clamp fixes. This path almost never runs anyway —
    // the storyboard wires AppBridgeViewController as the custom class.
    print("[AppDelegate] WebView bounce flags applied via retry fallback — boundsW=\(sv.bounds.width)")
    return true
}

private func findWebView(in view: UIView) -> WKWebView? {
    if let wv = view as? WKWebView { return wv }
    for sub in view.subviews {
        if let found = findWebView(in: sub) { return found }
    }
    return nil
}
