import type { GroupPosition, MessageRow } from "./MessageBubble";

export interface GroupedItem {
  kind: "message" | "divider";
  divider?: string; // ISO time
  message?: MessageRow;
  groupPosition?: GroupPosition;
  showName?: boolean;
}

const DIVIDER_GAP_MS = 1000 * 60 * 30; // 30 minutes
const GROUP_GAP_MS = 1000 * 60 * 2; // 2 minutes between same sender's messages

/** Walk a sorted-ascending list of messages and produce render items. */
export function groupMessages(messages: MessageRow[], myProfileId: string): GroupedItem[] {
  const items: GroupedItem[] = [];

  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const tPrev = prev ? new Date(prev.created_at).getTime() : 0;
    const tNow = new Date(m.created_at).getTime();
    const tNext = next ? new Date(next.created_at).getTime() : 0;

    // Insert a date/time divider if first message or a long pause
    if (!prev || tNow - tPrev > DIVIDER_GAP_MS) {
      items.push({ kind: "divider", divider: m.created_at });
    }

    const sameSenderAbove = prev && prev.user_id === m.user_id && tNow - tPrev <= GROUP_GAP_MS;
    const sameSenderBelow = next && next.user_id === m.user_id && tNext - tNow <= GROUP_GAP_MS;

    let pos: GroupPosition = "only";
    if (sameSenderAbove && sameSenderBelow) pos = "middle";
    else if (!sameSenderAbove && sameSenderBelow) pos = "first";
    else if (sameSenderAbove && !sameSenderBelow) pos = "last";

    // Show name only at top of an incoming group (not for "me")
    const showName = m.user_id !== myProfileId && (pos === "first" || pos === "only");

    items.push({ kind: "message", message: m, groupPosition: pos, showName });
  });

  return items;
}
