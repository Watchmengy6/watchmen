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
    // contentInsetAdjustmentBehavior = .never stops iOS from
    // auto-padding based on safe areas; we handle insets in CSS.
    sv.contentInsetAdjustmentBehavior = .never
    sv.showsVerticalScrollIndicator = false
    sv.showsHorizontalScrollIndicator = false
    print("[AppDelegate] WebView lock applied via retry fallback")
    return true
}

private func findWebView(in view: UIView) -> WKWebView? {
    if let wv = view as? WKWebView { return wv }
    for sub in view.subviews {
        if let found = findWebView(in: sub) { return found }
    }
    return nil
}
