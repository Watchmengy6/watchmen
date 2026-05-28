"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * "Sign in with Apple" button. Required by App Store guideline 4.8 if
 * we offer any other social/email sign-in (we have email, so this is
 * mandatory).
 *
 * Setup needed in Supabase + Apple Developer console:
 *   1. Apple Developer → Identifiers → create a Services ID
 *   2. Generate a Sign in with Apple private key (.p8)
 *   3. Supabase dashboard → Authentication → Providers → Apple →
 *      enable, paste Client ID (the Services ID), Team ID, Key ID, and
 *      the .p8 key contents
 *   4. Add https://<your-supabase-project>.supabase.co/auth/v1/callback
 *      to the Apple Services ID's return URLs
 *   5. Done — this button just works.
 *
 * Until Aaron enables the provider in Supabase, clicking will surface
 * the provider error — fine for staging until Apple Developer is
 * configured.
 */
export function SignInWithAppleButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setBusy(false);
      setErr("Supabase not configured.");
      return;
    }
    const supabase = createBrowserClient(url, key);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setBusy(false);
      setErr(error.message);
    }
    // On success the browser is redirected to Apple; nothing else to do.
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="w-full h-11 rounded-full bg-white text-black text-[15px] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M17.05 12.55c0-2.6 2.13-3.83 2.22-3.9-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.82 0-2.06-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.81 3.14-.46 7.78 1.31 10.33.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.38.81 1.4-.03 2.28-1.28 3.13-2.54.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.74-4.13zM14.5 4.84c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.03 1.55-.67.77-1.25 2-1.09 3.18 1.15.09 2.33-.59 3.05-1.45z"
            fill="currentColor"
          />
        </svg>
        {busy ? "Opening Apple…" : "Sign in with Apple"}
      </button>
      {err ? (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200 text-[12px] px-3 py-2">
          {err}
        </div>
      ) : null}
    </div>
  );
}
