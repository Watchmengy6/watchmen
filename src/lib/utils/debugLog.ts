/**
 * Debug-only logger. Silent in production so status/trace logs don't spam
 * the logs, but still available locally by setting NEXT_PUBLIC_DEBUG=1.
 * Use this instead of console.log for non-error diagnostics. console.warn /
 * console.error are intentionally left as-is (real problems worth surfacing).
 *
 * NEXT_PUBLIC_DEBUG is readable in both server and client bundles, so this
 * one helper works everywhere (server actions + the native push client).
 */
export function debugLog(...args: unknown[]): void {
  if (process.env.NEXT_PUBLIC_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
