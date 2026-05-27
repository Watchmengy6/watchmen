"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { cn } from "@/lib/utils/cn";

const emojiOptions = ["🏃", "⛳", "💼", "🎾", "📖", "🥃", "🎣", "🚣", "🍳", "🏋️", "🚴", "🎲"];

export default function PreviewNewGroup() {
  const [emoji, setEmoji] = useState("🏃");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [privacy, setPrivacy] = useState<"open" | "request" | "invite">("request");

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/preview/groups" className="text-ink-200 text-sm">‹ Groups</Link>
          <div className="text-white text-[15px] font-semibold">New Group</div>
          <div className="w-16 text-right">
            <Button variant="gold" size="sm" disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-ink-700 to-ink-800 hairline flex items-center justify-center text-3xl">
                {emoji}
              </div>
              <div className="flex-1">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {emojiOptions.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center text-lg",
                        emoji === e
                          ? "bg-gold-500/15 ring-1 ring-gold-500/40"
                          : "bg-ink-800 hairline",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Group name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Saturday Run Club"
              />
            </div>
            <div>
              <Label>What's this group about?</Label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                placeholder="Who it's for, when you meet, anything brothers should know."
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Label>Privacy</Label>
            <div className="mt-2 space-y-2">
              <PrivacyOption
                title="Open"
                description="Any approved member can join instantly."
                selected={privacy === "open"}
                onSelect={() => setPrivacy("open")}
              />
              <PrivacyOption
                title="Request to join"
                description="Members can see and request. You approve each one."
                selected={privacy === "request"}
                onSelect={() => setPrivacy("request")}
              />
              <PrivacyOption
                title="Invite only"
                description="Hidden. Only people you add can see it."
                selected={privacy === "invite"}
                onSelect={() => setPrivacy("invite")}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <PreviewBottomNav />
    </div>
  );
}

function PrivacyOption({
  title,
  description,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-xl px-3 py-3 hairline transition-colors",
        selected ? "bg-gold-500/10 ring-1 ring-gold-500/40" : "bg-ink-800",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-white text-[14px] font-semibold">{title}</div>
        <div
          className={cn(
            "h-5 w-5 rounded-full border-2 flex items-center justify-center",
            selected ? "border-gold-400 bg-gold-400" : "border-ink-500",
          )}
        >
          {selected ? <div className="h-2 w-2 rounded-full bg-black" /> : null}
        </div>
      </div>
      <div className="text-ink-300 text-[12px] mt-0.5">{description}</div>
    </button>
  );
}
