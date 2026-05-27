/**
 * Normalizes whatever a user types into a clean handle and a tappable URL.
 * Accepts: bare handles, @handles, $handles, full URLs — all return a usable link.
 */

function strip(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "")
    .replace(/^\$/, "");
}

export function instagramLink(raw: string | null | undefined) {
  let v = strip(raw);
  if (!v) return null;
  // Drop the domain if they pasted the full URL
  v = v.replace(/^instagram\.com\//i, "");
  if (!v) return null;
  return {
    handle: v,
    display: `@${v}`,
    url: `https://instagram.com/${v}`,
  };
}

export function venmoLink(raw: string | null | undefined) {
  let v = strip(raw);
  if (!v) return null;
  v = v.replace(/^venmo\.com\/(u\/)?/i, "");
  if (!v) return null;
  return {
    handle: v,
    display: `@${v}`,
    url: `https://venmo.com/u/${v}`,
  };
}

export function cashappLink(raw: string | null | undefined) {
  let v = strip(raw);
  if (!v) return null;
  v = v.replace(/^cash\.app\/\$?/i, "");
  if (!v) return null;
  return {
    handle: v,
    display: `$${v}`,
    url: `https://cash.app/$${v}`,
  };
}
