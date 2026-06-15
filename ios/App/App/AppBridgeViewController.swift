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

    /// KVO tokens for the scrollView's contentSize / contentOffset.
    /// Held for the lifetime of the VC so the clamp keeps running.
    private var scrollObservations: [NSKeyValueObservation] = []

    /// Diagnostic counters so we can tell, from the Xcode console,
    /// whether the KVO observers are actually firing during the
    /// post-submit horizontal-pan bug. We cap each at a small number
    /// so the console doesn't flood once a clamp engages.
    private var sizeClampPrintsLeft = 5
    private var offsetClampPrintsLeft = 5

    override func viewDidLoad() {
        super.viewDidLoad()
        lockWebViewScrollBehavior()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Re-apply the static settings on every appear — handles the case
        // where a presented VC (camera capture, photo picker, share sheet)
        // dismisses and iOS reflows our view. The KVO clamp installed below
        // is what actually holds the line; this just re-asserts the flags.
        lockWebViewScrollBehavior()
    }

    /// Disables rubber-band scrolling and scroll indicators on Capacitor's
    /// managed WKWebView, then installs a CONTINUOUS clamp so the document
    /// can never scroll horizontally — no matter what the DOM does.
    ///
    /// Why a clamp and not a one-shot `contentSize` assignment:
    /// WKWebView rewrites its scrollView's `contentSize` on EVERY web
    /// layout pass, including the async ones that fire when an uploaded
    /// image or video finishes decoding — which is AFTER viewDidLoad /
    /// viewDidAppear have already run. So pinning `contentSize.width` once
    /// never holds: the next layout (i.e. the moment media appears) blows
    /// it away and the page rubber-bands sideways, dragging the fixed
    /// bottom nav with it. That was the "every time I upload a photo or
    /// video the screen slides left/right and the bottom bar breaks" bug.
    ///
    /// Instead we observe `contentSize` and `contentOffset` via KVO and
    /// snap them back the instant WebKit drifts them:
    ///   - contentSize.width  -> clamped to the viewport width
    ///   - contentOffset.x    -> snapped back to 0
    /// Both are gated on zoomScale ≈ 1 so pinch-to-zoom panning (an
    /// accessibility affordance we intentionally keep enabled) still works.
    /// Inner `overflow-x: auto` chip rows have their OWN scroll containers,
    /// so this only locks the document-level horizontal scroll, not them.
    private func lockWebViewScrollBehavior() {
        guard let webView = self.webView else {
            print("[AppBridgeVC] webView not ready yet — skipping lock")
            return
        }
        // Restore the iOS edge-swipe-back gesture. Capacitor leaves this
        // OFF by default, which is why swiping from the left edge to go
        // back did nothing anywhere in the app. Next.js client-side
        // navigations populate the WKWebView's history list, so this drives
        // real back/forward. It rides a separate screen-edge pan recognizer,
        // so it does NOT fight the horizontal contentOffset clamp below
        // (that clamp only touches the scrollView's own pan).
        webView.allowsBackForwardNavigationGestures = true

        let sv = webView.scrollView
        sv.bounces = false
        sv.alwaysBounceVertical = false
        sv.alwaysBounceHorizontal = false
        // Single-axis pan — once a gesture starts vertical, it stays
        // vertical for the duration of the touch. Prevents diagonal
        // drift that reads as "the page slid sideways."
        sv.isDirectionalLockEnabled = true
        // contentInsetAdjustmentBehavior = .never stops iOS from
        // auto-padding the scroll view based on safe areas. We handle
        // safe-area insets in CSS so the native layer should not also try.
        sv.contentInsetAdjustmentBehavior = .never
        sv.showsVerticalScrollIndicator = false
        sv.showsHorizontalScrollIndicator = false
        installHorizontalLockObservers(on: sv)
    }

    /// Installs the durable KVO clamp ONCE. Idempotent — repeated calls
    /// from viewDidAppear are no-ops once the observers exist.
    private func installHorizontalLockObservers(on sv: UIScrollView) {
        guard scrollObservations.isEmpty else { return }

        // Clamp content width to the viewport whenever WebKit measures
        // wider (e.g. a portrait photo / HEIC mid-decode, or a stray wide
        // element). `initial` runs it once immediately too.
        let sizeObs = sv.observe(\.contentSize, options: [.initial, .new]) { [weak self] scrollView, _ in
            guard scrollView.zoomScale <= 1.001 else { return }
            let w = scrollView.bounds.width
            guard w > 0, scrollView.contentSize.width > w + 0.5 else { return }
            let oldWidth = scrollView.contentSize.width
            scrollView.contentSize = CGSize(
                width: w,
                height: scrollView.contentSize.height
            )
            // Diagnostic: log up to 5 size clamp events. Tells us if WebKit
            // is actually driving the content wider than the viewport
            // (which would be the case if some DOM element has intrinsic
            // width > viewport width post-reflow).
            if let self = self, self.sizeClampPrintsLeft > 0 {
                self.sizeClampPrintsLeft -= 1
                print("[AppBridgeVC] size clamp fired — was=\(oldWidth) clamped to=\(w)")
            }
        }

        // Snap any horizontal drift back to 0. Setting contentOffset.x = 0
        // here fires this observer again, but the guard makes that second
        // pass a no-op, so there is no feedback loop.
        let offsetObs = sv.observe(\.contentOffset, options: [.new]) { [weak self] scrollView, _ in
            guard scrollView.zoomScale <= 1.001 else { return }
            if scrollView.contentOffset.x != 0 {
                let drift = scrollView.contentOffset.x
                scrollView.contentOffset.x = 0
                // Diagnostic: log up to 5 horizontal drift events. Tells us
                // if iOS is actually delivering horizontal scroll events to
                // the WKWebView's scrollView (which would be the case if
                // the user's drag is engaging the scroll pan recognizer).
                if let self = self, self.offsetClampPrintsLeft > 0 {
                    self.offsetClampPrintsLeft -= 1
                    print("[AppBridgeVC] offset drift snapped back — drift=\(drift)")
                }
            }
        }

        scrollObservations = [sizeObs, offsetObs]
        print("[AppBridgeVC] horizontal-lock KVO installed")
    }

    deinit {
        scrollObservations.forEach { $0.invalidate() }
    }
}
