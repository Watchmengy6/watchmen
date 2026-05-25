"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { createPollAction } from "@/lib/polls/actions";
import { useToast } from "@/components/ui/Toast";

export function PollCreator({
  chatId,
  eventId,
  onClose,
}: {
  chatId: string | null;
  eventId: string | null;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  function setOpt(i: number, v: string) {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)));
  }

  async function submit() {
    setBusy(true);
    const r = await createPollAction({
      chat_id: chatId,
      event_id: eventId,
      question,
      options,
    });
    setBusy(false);
    if ((r as any).error) {
      push({ title: "Poll failed", body: (r as any).error, variant: "error" });
    } else {
      push({ title: "Poll posted", body: "+3 points", variant: "success" });
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-ink-800 hairline rounded-3xl p-5 animate-slideUp safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10.5px] tracking-[0.25em] uppercase text-gold-300/80">
              New Poll
            </div>
            <h3 className="text-white text-lg font-semibold mt-0.5">Ask the room</h3>
          </div>
          <button onClick={onClose} className="text-ink-300 text-2xl leading-none px-2">
            ×
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Question</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Where should we meet?"
              autoFocus
            />
          </div>
          <div>
            <Label>Options</Label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={o}
                    onChange={(e) => setOpt(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                  />
                  {options.length > 2 ? (
                    <button
                      onClick={() => setOptions((p) => p.filter((_, idx) => idx !== i))}
                      className="text-ink-400 text-sm px-2"
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              {options.length < 8 ? (
                <button
                  type="button"
                  onClick={() => setOptions((p) => [...p, ""])}
                  className="text-gold-300 text-sm"
                >
                  + Add option
                </button>
              ) : null}
            </div>
          </div>
          <Button variant="gold" size="lg" fullWidth loading={busy} onClick={submit}>
            Post poll
          </Button>
        </div>
      </div>
    </div>
  );
}
