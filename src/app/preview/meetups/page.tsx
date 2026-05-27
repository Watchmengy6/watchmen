import { redirect } from "next/navigation";

export default function MeetupsRedirect() {
  // Meetups have been folded into Events as "Get-Togethers".
  redirect("/preview/events");
}
