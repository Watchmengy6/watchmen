"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MessageBubble, type MessageRow } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { PollDisplay } from "@/components/polls/PollDisplay";
import { EmptyState } from "@/components/ui/EmptyState";

interface Author {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
}

interface PollRow {
  id: string;
  chat_id: string | null;
  question: string;
  created_by_user_id: string;
  created_at: string;
  closes_at: string | null;
  options: { id: string; option_text: string }[];
  votes: { poll_option_id: string; user_id: string }[];
}

export function ChatRoom({
  chatId,
  authUserId,
  myProfileId,
  initialMessages,
  initialAuthors,
  initialReactions,
  initialPolls,
  eventId,
  emptyState,
}: {
  chatId: string;
  authUserId: string;
  myProfileId: string;
  initialMessages: MessageRow[];
  initialAuthors: Record<string, Author>;
  initialReactions: { message_id: string; user_id: string; reaction_type: string }[];
  initialPolls: PollRow[];
  eventId?: string | null;
  emptyState?: React.ReactNode;
}) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [authors, setAuthors] = useState<Record<string, Author>>(initialAuthors);
  const [reactions, setReactions] = useState(initialReactions);
  const [polls, setPolls] = useState<PollRow[]>(initialPolls);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // scroll to bottom on mount + when new message arrives
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Refs to give the realtime handlers stable access to current state without
  // tearing down + re-subscribing the channel on every message arrival.
  const authorsRef = useRef(authors);
  authorsRef.current = authors;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    const ch = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const m = payload.new as any;
          if (!authorsRef.current[m.user_id]) {
            const { data: a } = await supabase
              .from("profiles")
              .select("id, full_name, profile_photo_url")
              .eq("id", m.user_id)
              .maybeSingle();
            if (a) setAuthors((prev) => ({ ...prev, [a.id]: a as Author }));
          }
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m as MessageRow]));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.new as any;
          if (!messagesRef.current.find((m) => m.id === r.message_id)) return;
          setReactions((prev) => [...prev, r]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.old as any;
          setReactions((prev) =>
            prev.filter(
              (x) =>
                !(
                  x.message_id === r.message_id &&
                  x.user_id === r.user_id &&
                  x.reaction_type === r.reaction_type
                ),
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "polls", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const p = payload.new as any;
          const [{ data: opts }, { data: votes }] = await Promise.all([
            supabase.from("poll_options").select("id, option_text").eq("poll_id", p.id),
            supabase.from("poll_votes").select("poll_option_id, user_id").eq("poll_id", p.id),
          ]);
          setPolls((prev) =>
            prev.some((x) => x.id === p.id)
              ? prev
              : [...prev, { ...(p as PollRow), options: opts ?? [], votes: votes ?? [] }],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poll_votes" },
        (payload) => {
          const v = payload.new as any;
          setPolls((prev) =>
            prev.map((p) =>
              p.id === v.poll_id
                ? {
                    ...p,
                    // Dedup: a re-vote from the same user replaces their old row.
                    votes: [
                      ...p.votes.filter((x) => x.user_id !== v.user_id),
                      v,
                    ],
                  }
                : p,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "poll_votes" },
        (payload) => {
          const v = payload.old as any;
          setPolls((prev) =>
            prev.map((p) =>
              p.id === v.poll_id
                ? {
                    ...p,
                    votes: p.votes.filter(
                      (x) =>
                        !(
                          x.user_id === v.user_id &&
                          x.poll_option_id === v.poll_option_id
                        ),
                    ),
                  }
                : p,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // Channel only depends on chatId — using refs above prevents churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, chatId]);

  const enriched: MessageRow[] = useMemo(() => {
    return messages.map((m) => ({
      ...m,
      author: authors[m.user_id]
        ? {
            full_name: authors[m.user_id].full_name,
            profile_photo_url: authors[m.user_id].profile_photo_url,
          }
        : undefined,
      reactions: reactions.filter((r) => r.message_id === m.id),
    }));
  }, [messages, authors, reactions]);

  // Interleave polls into the timeline by created_at
  const timeline = useMemo(() => {
    type Item =
      | { kind: "message"; at: string; data: MessageRow }
      | { kind: "poll"; at: string; data: PollRow };
    const items: Item[] = [
      ...enriched.map<Item>((m) => ({ kind: "message", at: m.created_at, data: m })),
      ...polls.map<Item>((p) => ({ kind: "poll", at: p.created_at, data: p })),
    ];
    items.sort((a, b) => a.at.localeCompare(b.at));
    return items;
  }, [enriched, polls]);

  return (
    // Fills the viewport minus the bottom nav (5rem). The page passes its
    // sticky header as children at the top of this container; the scroller
    // and message input fill the remaining space.
    <div className="flex flex-col h-[calc(100dvh-5rem)]">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 pt-3">
        {timeline.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            {emptyState ?? (
              <EmptyState title="No messages yet" body="Say something to start the room." />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1 pb-2">
            {timeline.map((item) =>
              item.kind === "message" ? (
                <MessageBubble
                  key={item.data.id}
                  message={item.data}
                  mine={item.data.user_id === myProfileId}
                  myProfileId={myProfileId}
                />
              ) : (
                <div key={item.data.id} className="px-3 py-2">
                  <PollDisplay poll={item.data} myProfileId={myProfileId} />
                </div>
              ),
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-white/[0.05] bg-ink-900/95 backdrop-blur-xl">
        <MessageInput chatId={chatId} authUserId={authUserId} eventId={eventId} />
      </div>
    </div>
  );
}
