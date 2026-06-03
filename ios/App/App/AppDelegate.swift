import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // The CAPBridgeViewController's WKWebView isn't created yet at this
        // point — defer until viewDidAppear fires so we know the scrollView
        // exists, then lock its bouncing off. Without this the app rubber-
        // bands horizontally (feels like a webpage) and vertical overscroll
        // exposes the area behind the bottom nav. PullToRefresh draws its
        // own indicator via touch events so it doesn't need the bounce.
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            DispatchQueue.main.async {
                lockWebViewBounces()
            }
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

/// Walks the active window's view hierarchy, finds the WKWebView that
/// Capacitor mounted, and turns off all rubber-band scrolling. Called
/// from didBecomeActive (re-called when the app returns from background
/// too, which is harmless — the properties are idempotent).
private func lockWebViewBounces() {
    guard let window = UIApplication.shared.connectedScenes
            .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
            .first else { return }
    if let webView = findWebView(in: window) {
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        // Belt + suspenders for horizontal — bouncesZoom and contentInset
        // can still let the page rubber-band sideways on some iOS builds.
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        // Native apps don't show a side scrollbar indicator. CSS
        // ::-webkit-scrollbar handles the document level, but WKWebView's
        // scrollView has its own indicators on top — kill those too so
        // the app reads as native, not a webpage in a frame.
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
    }
}

private func findWebView(in view: UIView) -> WKWebView? {
    if let wv = view as? WKWebView { return wv }
    for sub in view.subviews {
        if let found = findWebView(in: sub) { return found }
    }
    return nil
}
