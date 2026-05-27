import Link from "next/link";

/**
 * Parses inline @mentions (e.g. "@aaron") in body text and renders them as
 * tappable gold chips that link to the member's profile.
 *
 * Two regexes intentionally — SPLIT_RE keeps the /g flag because String#split
 * with a capturing group includes the matches, while MATCH_RE has no flags so
 * its .test() is stateless (avoids the classic /g + test lastIndex bug).
 */
const SPLIT_RE = /(@[a-zA-Z0-9_]+)/g;
const MATCH_RE = /^@[a-zA-Z0-9_]+$/;

export function RichText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(SPLIT_RE);
  return (
    <>
      {parts.map((part, i) =>
        MATCH_RE.test(part) ? (
          <Mention key={i} handle={part} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Mention({ handle }: { handle: string }) {
  // handle includes leading "@"; strip for the URL search param.
  const username = handle.replace(/^@/, "");
  return (
    <Link
      href={`/app/members?u=${encodeURIComponent(username)}`}
      className="text-gold-300 font-semibold hover:text-gold-200"
    >
      {handle}
    </Link>
  );
}
