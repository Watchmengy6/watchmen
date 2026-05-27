import { redirect } from "next/navigation";

export default function PreviewIndex() {
  // Drop straight into the home dashboard. The full screen menu lives in the
  // sidebar picker on desktop, and the bottom nav on every member screen.
  redirect("/preview/home");
}
