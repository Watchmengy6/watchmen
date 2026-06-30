"use client";

import { useEffect, useState } from "react";

/** Premium countdown to a target ISO timestamp. */
export function Countdown({ target }: { target: string }) {
  // Start null so the server render and the FIRST client render match (both
  // render a neutral placeholder). Reading Date.now() during render makes the
  // server (Vercel) and the device disagree, throwing a React hydration
  // mismatch (#418/#422/#425) that can flash a blank screen in the WebView.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(i);
  }, []);

  if (now === null) return <span aria-hidden="true">&nbsp;</span>;

  const t = new Date(target).getTime();
  const diff = Math.max(0, t - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (diff === 0) return <span className="text-emerald-300">Live now</span>;
  if (days > 1) return <span>In {days} days</span>;
  if (days === 1) return <span>Tomorrow · {hours}h</span>;
  if (hours > 1) return <span>In {hours}h {minutes}m</span>;
  return <span>Starting soon</span>;
}
