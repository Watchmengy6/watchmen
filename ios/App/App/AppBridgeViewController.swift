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
        // Diagnostic: this print confirms the storyboard's custom-class
        // wiring is actually instantiating OUR subclass and not silently
        // falling back to stock CAPBridgeViewController. If you don't
        // see this line in the Xcode console on app launch, the
        // storyboard reference is wrong and the lock isn't running.
        print("[AppBridgeVC] viewDidLoad — applying WKWebView lock")
        lockWebViewScrollBehavior()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Re-apply on every appear — handles the case where a presented
        // VC (UIImagePickerController for camera capture, PHPickerViewController
        // for photo library, the share sheet) dismisses and iOS reflows
        // our view. Without this, the bounce lock can be reset and the
        // page can rubber-band sideways after every camera dismiss.
        print("[AppBridgeVC] viewDidAppear — re-applying WKWebView lock")
        lockWebViewScrollBehavior()
    }

    /// Disables rubber-band scrolling and scroll indicators on Capacitor's
    /// managed WKWebView so the app reads as native instead of "webpage
    /// in a frame." See class doc for why this lives here vs. AppDelegate.
    private func lockWebViewScrollBehavior() {
        guard let webView = self.webView else {
            print("[AppBridgeVC] webView not ready yet — skipping lock")
            return
        }
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
        print("[AppBridgeVC] lock applied — bounces=\(sv.bounces) horiz=\(sv.alwaysBounceHorizontal)")
    }
}
