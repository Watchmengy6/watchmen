// Plain constants module. Must NOT be marked "use server" — Next 14 strips
// non-function exports from server-action files at build time, which caused
// `INTERESTS` to come back undefined and crash InterestChips / MemberSearch
// with "t.map is not a function".

export const INTERESTS: string[] = [
  "Marketing",
  "Real estate",
  "Fitness",
  "Pickleball",
  "Sports",
  "Business",
  "Investing",
  "Cars",
  "Watches",
  "Church",
  "Networking",
  "Entrepreneurship",
  "Construction",
  "Tech",
  "Content creation",
  "Golf",
  "Fishing",
  "Boating",
];
