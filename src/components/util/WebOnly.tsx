"use client";

import { useEffect, useState } from "react";

/**
 * Renders children only when the app is NOT running inside the
 * Capacitor native iOS / Android wrap. Used to hide PWA-only
 * "Add to Home Screen in Safari" copy from the native app, which
 * makes the app feel like a webpage wrapper to a reviewer.
 *
 * Stays mounted (returns null) until after hydration so we don't
 * SSR-render text that flickers out on the client.
 */
export function WebOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const cap = (window as any).Capacitor;
      setIsNative(!!cap?.isNativePlatform?.());
    }
  }, []);

  if (!mounted) return null;
  if (isNative) return null;
  return <>{children}</>;
}
