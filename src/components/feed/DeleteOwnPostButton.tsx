"use client";

import { useState, useTransition } from "react";
import { deleteOwnPostAction } from "@/lib/feed/actions";
import { useToast } from "@/components/ui/Toast";
import { useFeedStateOptional } from "@/app/app/home/FeedStateClient";

/**
 * Author-only trash icon on a feed post the signed-in user wrote.
 * Soft-deletes via a server action that verifies ownership before the
 * update. Wrapped in a confirm dialog so a misclick doesn't nuke a post
 * with active engagement.
 *
 * Distinct from AdminDeletePostButton, which is the leadership hammer
 * for moderating other members' content. Both can render on the same
 * row when an admin is looking at their OWN post; the admin button is
 * red, the author button is muted gray so the visual hierarchy is clear.
 */
export function DeleteOwnPostButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { push } = useToast();
  // Optional hook: present on the home feed surface (inside
  // FeedStateProvider), null on any other route that renders a
  // delete button outside the provider. When present, we remove the
  // post from the live list the instant the server confirms.
  const feedState = useFeedStateOptional();

  function go() {
    start(async () => {
      const r = await deleteOwnPostAction(postId);
      if (r.error) {
        push({ title: "Couldn't delete", body: r.error, variant: "error" });
        return;
      }
      // Optimistic removal — the deleted post disappears from the
      // feed list immediately. Falls back gracefully (no-op) if this
      // button is rendered outside a FeedStateProvider; the server
      // action's revalidatePath still ensures the list updates on
      // the next refresh.
      feedState?.removePost(postId);
      push({ title: "Post deleted", variant: "success" });
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete your post"
        onClick={() => setOpen(true)}
        className="px-2 h-9 text-ink-400 hover:text-ink-200 text-[14px]"
        title="Delete your post"
      >
        🗑
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-ink-800 hairline p-5 space-y-3">
            <div className="text-white text-[16px] font-semibold">
              Delete this post?
            </div>
            <div className="text-ink-300 text-[13.5px]">
              The post will disappear for everyone. Comments and reactions on
              it disappear too. This can&apos;t be undone.
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-full bg-ink-700 hairline text-ink-100 text-[14px] font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={go}
                className="flex-1 h-11 rounded-full bg-red-500 text-white text-[14px] font-semibold disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
