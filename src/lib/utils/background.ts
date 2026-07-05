import "server-only";
import { waitUntil } from "@vercel/functions";

/**
 * Run a task after the response is sent — RELIABLY.
 *
 * Every `void (async () => {...})()` fire-and-forget in our server
 * actions (push fan-outs, Resend emails, points awards) was at risk of
 * being silently dropped on Vercel: once a serverless function returns
 * its response the instance can be frozen, and detached promises simply
 * stop executing. It mostly worked because busy instances stay warm —
 * "mostly" is not good enough for event night (Codex + final pre-launch
 * audit, July 2026).
 *
 * `waitUntil` tells Vercel to keep the function alive until the task
 * settles. Off-Vercel (local dev) it degrades to just running the
 * promise. Errors are swallowed after a console.warn — background work
 * must never take down the action that spawned it.
 */
export function runInBackground(task: () => Promise<unknown>): void {
  let guarded: Promise<unknown>;
  try {
    guarded = task().catch((e) => {
      console.warn("[background] task failed (non-fatal)", e);
    });
  } catch (e) {
    // Synchronous throw from the task factory — log and bail.
    console.warn("[background] task threw synchronously (non-fatal)", e);
    return;
  }
  try {
    waitUntil(guarded);
  } catch {
    // Not in a Vercel request context (local dev / tests) — the
    // promise is already running; nothing more to do.
  }
}
