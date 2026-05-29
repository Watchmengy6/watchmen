import { redirect } from "next/navigation";

// Master Chat was removed per Dustin — all broadcast / community
// conversation moves to the feed. Anyone landing on the old URL gets
// bounced to home. File is kept as a redirect because of cached
// shortcuts on members' Home Screens. Safe to delete this folder
// after a release cycle.
export default function MasterChatRemoved() {
  redirect("/app/home");
}
