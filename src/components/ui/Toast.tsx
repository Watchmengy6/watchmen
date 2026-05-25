"use client";

import { cn } from "@/lib/utils/cn";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastItem = { id: number; title: string; body?: string; variant?: "default" | "success" | "error" };

const ToastCtx = createContext<{
  push: (t: Omit<ToastItem, "id">) => void;
}>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed left-0 right-0 top-3 z-[100] flex flex-col items-center gap-2 pointer-events-none safe-top">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto animate-slideUp glass rounded-2xl px-4 py-3 hairline shadow-card max-w-[92%]",
              t.variant === "success" && "ring-1 ring-emerald-500/30",
              t.variant === "error" && "ring-1 ring-red-500/30",
            )}
          >
            <div className="text-white text-sm font-medium">{t.title}</div>
            {t.body ? <div className="text-ink-300 text-xs mt-0.5">{t.body}</div> : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useAutoDismiss(open: boolean, fn: () => void, ms = 3000) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
  }, [open, fn, ms]);
}
