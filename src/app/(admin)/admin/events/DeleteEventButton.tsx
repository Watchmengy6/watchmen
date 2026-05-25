"use client";

import { useTransition } from "react";
import { deleteEventAction } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/Toast";

export function DeleteEventButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const { push } = useToast();
  return (
    <button
      onClick={() => {
        if (!confirm("Delete this event? RSVPs and event chat will be removed.")) return;
        start(async () => {
          const r = await deleteEventAction(id);
          if ((r as any).error) push({ title: "Failed", body: (r as any).error, variant: "error" });
          else push({ title: "Deleted", variant: "default" });
        });
      }}
      disabled={pending}
      className="text-[11px] text-red-300 hover:text-red-200 px-2 py-1 rounded-full bg-red-500/10 hairline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
