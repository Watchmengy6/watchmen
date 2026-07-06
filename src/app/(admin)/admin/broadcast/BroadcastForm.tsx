"use client";

import { useState, useTransition } from "react";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { sendBroadcastPushAction } from "@/lib/admin/actions";

/**
 * Two-step broadcast composer: write → arm → send. The confirm step
 * exists because there is no unsend button on a push to the whole
 * brotherhood.
 */
export function BroadcastForm({ audience }: { audience: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [arming, setArming] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ready = title.trim().length > 0 && body.trim().length > 0;

  function send() {
    setErr(null);
    startTransition(async () => {
      try {
        const r = await sendBroadcastPushAction({ title, body });
        if (r.error) {
          setErr(r.error);
          setArming(false);
          return;
        }
        setSent(r.targeted ?? 0);
        setArming(false);
        setTitle("");
        setBody("");
      } catch {
        setErr("Send failed — check your connection and try again.");
        setArming(false);
      }
    });
  }

  if (sent !== null) {
    return (
      <div className="rounded-2xl bg-ink-800/80 hairline px-4 py-5 text-center">
        <div className="text-2xl mb-2">📣</div>
        <div className="text-white text-[15px] font-semibold">
          Broadcast sent
        </div>
        <p className="text-ink-300 text-[13.5px] mt-1.5 leading-relaxed">
          Pushed to {sent} member{sent === 1 ? "" : "s"}. Delivery lands over
          the next few seconds on every device with notifications on.
        </p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="inline-flex items-center justify-center h-10 px-5 mt-4 rounded-full bg-ink-900/60 hairline text-ink-100 text-[13px] font-medium"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="Watchmen announcement"
        />
        <div className="text-[10.5px] text-ink-400 mt-1 text-right">
          {title.length}/80
        </div>
      </div>
      <div>
        <Label>Message</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={300}
          rows={4}
          spellCheck
          autoCapitalize="sentences"
          autoCorrect="on"
          placeholder="Doors open at 7:30 tonight — Central Park St. Pete. See you there."
        />
        <div className="text-[10.5px] text-ink-400 mt-1 text-right">
          {body.length}/300
        </div>
      </div>

      {/* Live preview — what the banner will look like on a lock screen. */}
      {ready ? (
        <div>
          <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-400 mb-1.5">
            Preview
          </div>
          <div className="rounded-2xl bg-ink-800 hairline px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-[14px] font-semibold truncate">
                  {title.trim()}
                </div>
                <div className="text-ink-200 text-[13px] mt-0.5 whitespace-pre-wrap break-words">
                  {body.trim()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200 text-sm px-3 py-2">
          {err}
        </div>
      ) : null}

      {!arming ? (
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() => setArming(true)}
          className="w-full h-12 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black font-semibold text-[15px] disabled:opacity-40"
        >
          Review broadcast
        </button>
      ) : (
        <div className="rounded-2xl bg-ink-800/80 ring-1 ring-gold-500/30 p-4 space-y-3">
          <div className="text-white text-[14px] font-semibold text-center">
            Send this to {audience} member{audience === 1 ? "" : "s"}?
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setArming(false)}
              disabled={pending}
              className="h-11 rounded-full bg-ink-900/60 hairline text-ink-200 text-[14px] font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="h-11 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black font-semibold text-[14px] disabled:opacity-40"
            >
              {pending ? "Sending…" : "Send now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
