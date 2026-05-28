import { Resend } from "resend";

let _resend: Resend | null = null;

/**
 * Returns a Resend client. Returns null when RESEND_API_KEY is not set
 * (e.g. local dev without the env var), so callers can no-op gracefully
 * instead of crashing.
 */
export function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

export const MAIL_FROM = "The Watchmen <noreply@gy6.me>";
export const MAIL_REPLY_TO = "noreply@gy6.me";
// Use NEXT_PUBLIC_SITE_URL (the same var the invite landing screen and README
// document). Fall back to the deployed Vercel domain.
export const APP_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://watchmen-six.vercel.app";
