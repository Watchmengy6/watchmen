import UIKit
import Capacitor
import WebKit

/// Custom Capacitor bridge VC that owns the WKWebView bounce lock.
///
/// The original implementation in AppDelegate observed
/// `UIApplication.didBecomeActiveNotification` and walked the window
/// hierarchy looking for a WKWebView. That was racy — on a cold launch
/// the bridge VC is created and `didBecomeActive` fires BEFORE the
/// WKWebView is mounted into the view hierarchy, so the lock silently
/// missed. Result: the bottom nav drifted into the iOS home indicator
/// and the page rubber-banded sideways for the first session, only
/// "snapping into place" after the user backgrounded and reopened the
/// app (which re-triggered didBecomeActive after the webview was up).
///
/// Subclassing the bridge VC lets us apply the lock at the exact
/// moment the WKWebView exists, on every launch, with no observers
/// and no hierarchy-walking.
@objc(AppBridgeViewController)
class AppBridgeViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        lockWebViewScrollBehavior()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Re-apply on appear in case iOS reset any of these (e.g. after
        // a presented file picker is dismissed and reflows the view).
        // The setters are idempotent.
        lockWebViewScrollBehavior()
    }

    /// Disables rubber-band scrolling and scroll indicators on Capacitor's
    /// managed WKWebView so the app reads as native instead of "webpage
    /// in a frame." See class doc for why this lives here vs. AppDelegate.
    private func lockWebViewScrollBehavior() {
        guard let webView = self.webView else { return }
        let sv = webView.scrollView
        sv.bounces = false
        sv.alwaysBounceVertical = false
        sv.alwaysBounceHorizontal = false
        // contentInsetAdjustmentBehavior = .never stops iOS from
        // auto-padding the scroll view based on safe areas. We handle
        // safe-area insets in CSS so the native layer should not also
        // try.
        sv.contentInsetAdjustmentBehavior = .never
        sv.showsVerticalScrollIndicator = false
        sv.showsHorizontalScrollIndicator = false
    }
}
