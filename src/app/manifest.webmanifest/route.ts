import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "The Watchman",
    short_name: "Watchman",
    description: "A private network for the Watchman brotherhood.",
    start_url: "/app/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any maskable" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any maskable" },
    ],
  });
}
