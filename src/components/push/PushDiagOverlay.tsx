"use client";

/**
 * TEMPORARY on-screen diagnostic for the native push registration flow.
 *
 * Production builds of the Capacitor wrap aren't Safari-Web-Inspectable
 * (would require setting `webView.isInspectable = true` in Swift, which
 * we don't ship in release). So when push registration silently fails
 * in production we have zero visibility into where it's breaking. This
 * overlay listens for `watchmen:push-diag` window events that
 * `src/lib/push/nativeClient.ts` dispatches at each step of the
 * registration flow and renders them as a fixed-position panel on the
 * screen.
 *
 * Gated behind a localStorage flag so other users don't see it:
 *   - Enable: open the app at `/app/home?pushdiag=1` once. The flag is
 *     persisted and the overlay shows on every screen until disabled.
 *   - Disable: open the app at `/app/home?pushdiag=0` once. Flag cleared.
 *
 * Remove this component (and the diag() calls in nativeClient.ts) once
 * push registration is confirmed working end-to-end on a production
 * device. Until then it's the cheapest way to debug a failing native
 * registration without burning another Apple submission.
 */

import { useEffect, useState } from "react";

type DiagMsg = { msg: string; ts: number };

export function PushDiagOverlay() {
  // TEMPORARY: default to ENABLED for the 1.0.2 push debug session.
  // Capacitor apps don't have URL bars so Aaron can't easily set the
  // localStorage flag from inside the wrap. Once push is confirmed
  // working, this whole component gets deleted.
  //
  // Users CAN disable it by visiting /app/home?pushdiag=0 in Safari
  // (web only) which writes the off flag to localStorage. The native
  // app shares the same origin so the flag carries over — though the
  // primary plan is just to delete the component after debugging.
  const [enabled, setEnabled] = useState(true);
  const [messages, setMessages] = useState<DiagMsg[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Allow override via query string. ?pushdiag=0 hides it; ?pushdiag=1
    // re-enables. Persists to localStorage so navigation doesn't lose
    // the setting. Default remains ON when no override is present.
    const params = new URLSearchParams(window.location.search);
    if (params.get("pushdiag") === "1") {
      try {
        localStorage.setItem("watchmen.pushdiag", "1");
      } catch {}
    } else if (params.get("pushdiag") === "0") {
      try {
        localStorage.setItem("watchmen.pushdiag", "0");
      } catch {}
    }
    try {
      const stored = localStorage.getItem("watchmen.pushdiag");
      if (stored === "0") setEnabled(false);
      // No stored value OR "1" → stay enabled (the temporary default).
    } catch {
      /* keep default */
    }

    function onDiag(e: Event) {
      const detail = (e as CustomEvent).detail as DiagMsg | undefined;
      if (!detail || typeof detail.msg !== "string") return;
      // Keep last 20 entries so the overlay doesn't grow unbounded.
      setMessages((prev) => [...prev.slice(-19), detail]);
    }
    window.addEventListener("watchmen:push-diag", onDiag as EventListener);
    return () => {
      window.removeEventListener("watchmen:push-diag", onDiag as EventListener);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "max(60px, env(safe-area-inset-top))",
        left: "8px",
        right: "8px",
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        color: "#9aff9a",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "10px",
        lineHeight: "1.35",
        padding: "8px 10px",
        borderRadius: "8px",
        maxHeight: "45vh",
        overflow: "auto",
        pointerEvents: "auto",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          color: "white",
          fontWeight: 700,
          marginBottom: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>PUSH DIAGNOSTIC</span>
        <span style={{ color: "#888", fontWeight: 400 }}>
          ?pushdiag=0 to hide
        </span>
      </div>
      {messages.length === 0 ? (
        <div style={{ color: "#888" }}>
          Waiting for native push events… (close + reopen app to retrigger)
        </div>
      ) : (
        messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "2px" }}>
            <span style={{ color: "#888" }}>
              {new Date(m.ts).toLocaleTimeString()}
            </span>
            {" — "}
            <span>{m.msg}</span>
          </div>
        ))
      )}
    </div>
  );
}
