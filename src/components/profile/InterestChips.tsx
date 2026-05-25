"use client";

import { cn } from "@/lib/utils/cn";
import { useState } from "react";

export function InterestChips({
  options,
  defaultValue,
  name = "interests",
}: {
  options: string[];
  defaultValue?: string[];
  name?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValue ?? []));
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.has(o);
        return (
          <label key={o} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={o}
              checked={active}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(o);
                else next.delete(o);
                setSelected(next);
              }}
              className="sr-only"
            />
            <span
              className={cn(
                "inline-flex items-center px-3 h-9 rounded-full text-sm transition-all",
                active
                  ? "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/40"
                  : "bg-ink-800 text-ink-200 hairline hover:bg-ink-700",
              )}
            >
              {o}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function InterestChipsReadOnly({ values }: { values: string[] }) {
  if (!values?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center px-2.5 h-7 rounded-full text-[12px] bg-ink-800 text-ink-200 hairline"
        >
          {v}
        </span>
      ))}
    </div>
  );
}
