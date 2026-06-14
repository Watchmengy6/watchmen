"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sendMessageAction } from "@/lib/chat/actions";
import { useToast } from "@/components/ui/Toast";
import { PollCreator } from "@/components/polls/PollCreator";
import { pickMediaFromLibrary } from "@/lib/upload/pickPhoto";

export function MessageInput({
  chatId,
  authUserId,
  eventId,
}: {
  chatId: string;
  authUserId: string;
  eventId?: string | null;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const { push } = useToast();

  async function send() {
    if (busy) return;
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    const r = await sendMessageAction({ chat_id: chatId, content });
    if ((r as any).error) push({ title: "Couldn't send", body: (r as any).error, variant: "error" });
    else setText("");
    setBusy(false);
  }

  // Library-only media picker — photo OR video, never the camera.
  // The iOS camera path crashed Apple Review June 2026; pickMediaFromLibrary
  // routes through PHPickerViewController which has no camera entry point.
  async function onPickMedia() {
    if (busy) return;
    const picked = await pickMediaFromLibrary();
    if (!picked) return;
    if (picked.file.size > 50 * 1024 * 1024) {
      push({ title: "Too large", body: "Max 50 MB.", variant: "error" });
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const ext = picked.file.name.split(".").pop() || (picked.mediaType === "video" ? "mov" : "jpg");
    const path = `${authUserId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, picked.file, {
      contentType: picked.file.type,
      upsert: false,
    });
    if (error) {
      push({ title: "Upload failed", body: error.message, variant: "error" });
      setBusy(false);
      return;
    }
    const { data: pub } = supabase.storage.from("chat-media").getPublicUrl(path);
    const sendRes = await sendMessageAction({
      chat_id: chatId,
      content: text.trim(),
      media_url: pub.publicUrl,
      media_type: picked.mediaType,
    });
    if ((sendRes as any)?.error) {
      // Surface the failure and try to clean up the orphan upload so
      // it doesn't sit in storage forever.
      push({
        title: "Couldn't send",
        body: (sendRes as any).error,
        variant: "error",
      });
      try {
        await supabase.storage.from("chat-media").remove([path]);
      } catch {
        /* best-effort cleanup */
      }
      setBusy(false);
      return;
    }
    setText("");
    setBusy(false);
  }

  return (
    <>
      <div
        className="sticky bottom-0 z-30 glass border-t border-white/[0.06] px-3 pt-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-label="Add photo or video"
            onClick={onPickMedia}
            disabled={busy}
            className="shrink-0 h-10 w-10 rounded-full bg-ink-800 hairline flex items-center justify-center disabled:opacity-60"
          >
            <span className="text-ink-200 text-xl leading-none">+</span>
          </button>
          <button
            type="button"
            onClick={() => setPollOpen(true)}
            className="shrink-0 h-10 px-3 rounded-full bg-ink-800 hairline text-ink-200 text-xs"
          >
            Poll
          </button>
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Speak to the room…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="w-full resize-none rounded-2xl bg-ink-800 hairline px-3 py-2.5 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 max-h-32"
            />
          </div>
          <Button onClick={send} variant="gold" size="md" loading={busy} disabled={!text.trim()}>
            Send
          </Button>
        </div>
      </div>
      {pollOpen ? (
        <PollCreator
          chatId={chatId}
          eventId={eventId ?? null}
          onClose={() => setPollOpen(false)}
        />
      ) : null}
    </>
  );
}
