"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { sendThreadMessageAction } from "@/lib/dms/actions";
import { createBrowserClient } from "@supabase/ssr";
import { uploadMedia } from "@/lib/uploads/client";

interface Msg {
  id: string;
  body: string;
  media_url?: string | null;
  media_type?: "none" | "image" | "video";
  created_at: string;
  author_id: string;
  author_name: string;
  author_photo?: string | null;
  is_me: boolean;
}

interface Props {
  threadId: string;
  initialMessages: Msg[];
  meId: string;
  meName: string;
  meAvatar?: string | null;
}

export function ThreadChatClient({
  threadId,
  initialMessages,
  meId,
  meName,
  meAvatar,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // FIFO queue of local-* ids that are waiting for their realtime echo.
  // When a realtime INSERT from me arrives, we shift the front of the queue
  // and replace that placeholder with the real row.
  const pendingLocalIdsRef = useRef<string[]>([]);

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // Realtime subscription: listen for new messages on this thread.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const m: any = payload.new;
          // If this insert is from ME, reconcile in FIFO order: pop the
          // oldest pending local id and replace that exact placeholder.
          if (m.author_id === meId) {
            const targetLocalId = pendingLocalIdsRef.current.shift();
            if (!targetLocalId) {
              // No pending local match (e.g. message sent from another tab)
              // — just append as a normal mine row, deduped by real id.
              setMessages((prev) =>
                prev.some((x) => x.id === m.id)
                  ? prev
                  : [
                      ...prev,
                      {
                        id: m.id,
                        body: m.body ?? "",
                        media_url: m.media_url ?? null,
                        media_type: (m.media_type ?? "none") as "none" | "image" | "video",
                        created_at: m.created_at,
                        author_id: m.author_id,
                        author_name: meName,
                        author_photo: meAvatar ?? null,
                        is_me: true,
                      },
                    ],
              );
              return;
            }
            setMessages((prev) => {
              const idx = prev.findIndex((x) => x.id === targetLocalId);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = {
                id: m.id,
                body: m.body ?? "",
                media_url: m.media_url ?? null,
                media_type: (m.media_type ?? "none") as "none" | "image" | "video",
                created_at: m.created_at,
                author_id: m.author_id,
                author_name: meName,
                author_photo: meAvatar ?? null,
                is_me: true,
              };
              return next;
            });
            return;
          }

          // Otherwise it's from someone else — fetch their profile + append.
          const { data: author } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .eq("id", m.author_id)
            .maybeSingle();
          setMessages((prev) => [
            ...prev,
            {
              id: m.id,
              body: m.body ?? "",
              media_url: m.media_url ?? null,
              media_type: (m.media_type ?? "none") as "none" | "image" | "video",
              created_at: m.created_at,
              author_id: m.author_id,
              author_name: author?.full_name ?? "Brother",
              author_photo: author?.profile_photo_url ?? null,
              is_me: false,
            },
          ]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, meId, meName, meAvatar]);

  // Generates a globally-unique local id we can match in the realtime echo
  // and rollback on failure.
  function nextLocalId() {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function send() {
    const body = text.trim();
    if (!body || pending) return;
    const localId = nextLocalId();
    pendingLocalIdsRef.current.push(localId);
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        body,
        created_at: new Date().toISOString(),
        author_id: meId,
        author_name: meName,
        author_photo: meAvatar ?? null,
        is_me: true,
      },
    ]);
    setText("");
    const fd = new FormData();
    fd.set("thread_id", threadId);
    fd.set("body", body);
    startTransition(async () => {
      const r = await sendThreadMessageAction(fd);
      if (r && r.error) {
        // Rollback the optimistic row and remove it from the pending queue.
        pendingLocalIdsRef.current = pendingLocalIdsRef.current.filter(
          (id) => id !== localId,
        );
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        setErr(r.error);
      }
    });
  }

  async function pickAndSendMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    const result = await uploadMedia(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if ("error" in result) {
      setErr(result.error);
      return;
    }
    const localId = nextLocalId();
    pendingLocalIdsRef.current.push(localId);
    const isImage = result.mediaType === "image";
    const placeholder = isImage ? "[image]" : "[video]";
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        body: placeholder,
        media_url: result.url,
        media_type: result.mediaType,
        created_at: new Date().toISOString(),
        author_id: meId,
        author_name: meName,
        author_photo: meAvatar ?? null,
        is_me: true,
      },
    ]);
    const fd = new FormData();
    fd.set("thread_id", threadId);
    fd.set("body", placeholder);
    fd.set("media_url", result.url);
    fd.set("media_type", result.mediaType);
    startTransition(async () => {
      const r = await sendThreadMessageAction(fd);
      if (r && r.error) {
        pendingLocalIdsRef.current = pendingLocalIdsRef.current.filter(
          (id) => id !== localId,
        );
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        setErr(r.error);
      }
    });
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
        {messages.length === 0 ? (
          <div className="text-center text-ink-300 text-sm py-10">
            No messages yet. Say hello.
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showAvatar = !m.is_me && (!prev || prev.author_id !== m.author_id);
            return (
              <div key={m.id} className={m.is_me ? "flex justify-end" : "flex items-end gap-2"}>
                {!m.is_me && showAvatar ? (
                  <Avatar src={m.author_photo ?? undefined} name={m.author_name} size={28} />
                ) : !m.is_me ? (
                  <div className="w-7" />
                ) : null}
                <div className="max-w-[78%]">
                  {m.media_url && m.media_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.media_url}
                      alt=""
                      className="rounded-2xl max-h-72 object-cover"
                    />
                  ) : null}
                  {m.media_url && m.media_type === "video" ? (
                    <video src={m.media_url} controls className="rounded-2xl max-h-72" />
                  ) : null}
                  {m.body && !(m.body === "[image]" || m.body === "[video]") ? (
                    <div
                      className={
                        m.is_me
                          ? "rounded-2xl rounded-br-md bg-gold-400 text-black px-3.5 py-2 text-[15px] leading-snug mt-1"
                          : "rounded-2xl rounded-bl-md bg-ink-800 hairline text-ink-100 px-3.5 py-2 text-[15px] leading-snug mt-1"
                      }
                    >
                      {m.body}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        className="sticky bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-xl border-t border-white/[0.05] px-3 pt-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {err ? (
          <div className="text-[12px] text-red-300 pb-1">{err}</div>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={pickAndSendMedia}
        />
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Send photo or video"
            className="h-9 w-9 shrink-0 rounded-full bg-ink-800 hairline text-ink-200 flex items-center justify-center"
          >
            {uploading ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" strokeDasharray="40 60" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="11" r="2" />
                <path d="m21 17-5-5-9 9" />
              </svg>
            )}
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="iMessage"
            className="flex-1 max-h-32 rounded-2xl bg-ink-800 hairline px-3.5 py-2 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || pending}
            className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black flex items-center justify-center disabled:opacity-40"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M2 21 23 12 2 3l5 9-5 9Z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
