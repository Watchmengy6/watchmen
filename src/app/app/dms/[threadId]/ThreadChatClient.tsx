"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { sendThreadMessageAction } from "@/lib/dms/actions";
import { createBrowserClient } from "@supabase/ssr";

interface Msg {
  id: string;
  body: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

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
          if (m.author_id === meId) return; // we already added our own optimistically
          // Fetch author profile.
          const { data: author } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .eq("id", m.author_id)
            .maybeSingle();
          setMessages((prev) => [
            ...prev,
            {
              id: m.id,
              body: m.body,
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
  }, [threadId, meId]);

  function send() {
    const body = text.trim();
    if (!body || pending) return;
    // Optimistic append.
    const localId = `local-${Date.now()}`;
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
      await sendThreadMessageAction(fd);
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
                <div
                  className={
                    m.is_me
                      ? "max-w-[78%] rounded-2xl rounded-br-md bg-gold-400 text-black px-3.5 py-2 text-[15px] leading-snug"
                      : "max-w-[78%] rounded-2xl rounded-bl-md bg-ink-800 hairline text-ink-100 px-3.5 py-2 text-[15px] leading-snug"
                  }
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        className="sticky bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-xl border-t border-white/[0.05] px-3 py-2"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-end gap-2">
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
            className="h-9 w-9 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black flex items-center justify-center disabled:opacity-40"
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
