"use client";
import { useRouter } from "next/navigation";

/**
 * Back control that pops real navigation history (returns the user to
 * wherever they came from) with a fixed fallback for deep-link / cold-
 * start entries that have no in-app history to pop.
 *
 * Why this exists: the chat headers used to render a hard-coded
 *   <Link href="/app/groups/[id]">‹</Link>
 * which always sent you to the group / event detail page regardless of
 * how you got into the chat. So if you came from Chats inbox → group
 * chat, tapping the back arrow would land you on a different tab
 * (Groups) instead of taking you back where you started. Native iOS
 * apps always pop history; this component matches that.
 *
 * The `window.history.length > 1` check is the safety hatch for cold
 * starts: deep-linking straight into a chat from a push notification
 * leaves the WKWebView with no in-app history to pop, so we fall
 * through to the explicit fallback href instead of going nowhere.
 */
export function BackButton({
  fallbackHref,
  label = "Back",
  className,
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={className}
    >
      ‹
    </button>
  );
}
