import Link from "next/link";

/**
 * Parses inline @mentions (e.g. "@aaron") in body text and renders them as
 * tappable gold chips that link to the member's profile.
 *
 * Two regexes intentionally — SPLIT_RE keeps the /g flag because String#split
 * with a capturing group includes the matches, while MATCH_RE has no flags so
 * its .test() is stateless (avoids the classic /g + test lastIndex bug).
 */
// Usernames can contain letters, digits, underscores, and hyphens
// (the username backfill produces collision-suffixed handles like
// `aaron-1a2b` so the dash must be in the character class).
const SPLIT_RE = /(@[a-zA-Z0-9_-]+)/g;
const MATCH_RE = /^@[a-zA-Z0-9_-]+$/;

export function RichText({
  text,
  blockedUsernames,
}: {
  text: string;
  /**
   * Lowercased usernames the viewer has blocked (or who have blocked the
   * viewer). Mentions matching one of these render as plain dim text
   * instead of a clickable gold chip — tapping a stale mention of a
   * blocked user otherwise deep-links to a member-search route that
   * just returns "no results" because the profile is RLS-hidden.
   * Fetched once per page via the `get_my_blocked_usernames()` RPC
   * (migration 00041) and threaded down through FeedPost.
   *
   * Optional: when omitted, every mention renders as a clickable
   * chip — the historic behavior. Callers that don't care about
   * this polish don't need to pass anything.
   */
  blockedUsernames?: string[];
}) {
  if (!text) return null;
  const parts = text.split(SPLIT_RE);
  // Lowercase the lookup set once for case-insensitive comparison.
  // Usernames are stored lowercased per the username-backfill convention
  // (migration 00035) but defending against caller drift is cheap.
  const blockedSet =
    blockedUsernames && blockedUsernames.length > 0
      ? new Set(blockedUsernames.map((u) => u.toLowerCase()))
      : null;
  return (
    <>
      {parts.map((part, i) =>
        MATCH_RE.test(part) ? (
          <Mention key={i} handle={part} blockedSet={blockedSet} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Mention({
  handle,
  blockedSet,
}: {
  handle: string;
  blockedSet: Set<string> | null;
}) {
  // handle includes leading "@"; strip for the URL search param.
  // /app/members already supports q (free-text search) so route there.
  const username = handle.replace(/^@/, "");

  // Render as inert plain text if the mentioned user is in the
  // viewer's bidirectional block set. We keep a subtle muted style so
  // the @ still reads as a name rather than dropping into the post
  // body — but no link, no hover, no gold accent.
  if (blockedSet?.has(username.toLowerCase())) {
    return (
      <span className="text-ink-400" aria-label="Blocked member">
        {handle}
      </span>
    );
  }

  return (
    <Link
      href={`/app/members?q=${encodeURIComponent(username)}`}
      className="text-gold-300 font-semibold hover:text-gold-200"
    >
      {handle}
    </Link>
  );
}
