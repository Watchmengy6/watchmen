"use client";

import { useTransition } from "react";
import { deleteGroupAction } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Admin button to delete a group entirely.
 *
 * Mirrors DeleteEventButton — same UX shape, same toast behavior. The
 * confirm message is intentionally more aggressive than the event one
 * because deleting a group also wipes the group chat (FK cascade on
 * threads.group_id), which is harder for members to recover from
 * mentally than a deleted event.
 */
export function DeleteGroupButton({ id, name }: { id: string; name?: string }) {
  const [pending, start] = useTransition();
  const { push } = useToast();
  return (
    <button
      onClick={() => {
        const label = name ? `"${name}"` : "this group";
        if (
          !confirm(
            `Delete ${label}?\n\nAll members, the group chat, and every message in it will be permanently removed. Posts tagged to this group will stay on the feed but lose the tag.\n\nThis cannot be undone.`,
          )
        )
          return;
        start(async () => {
          const r = await deleteGroupAction(id);
          if ((r as any).error) push({ title: "Failed", body: (r as any).error, variant: "error" });
          else push({ title: "Group deleted", variant: "default" });
        });
      }}
      disabled={pending}
      className="text-[11px] text-red-300 hover:text-red-200 px-2 py-1 rounded-full bg-red-500/10 hairline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
