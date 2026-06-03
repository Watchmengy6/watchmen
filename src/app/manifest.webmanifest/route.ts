import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "The Watchmen",
    short_name: "Watchmen",
    description: "A private network for the Watchmen brotherhood. Got Your 6.",
    start_url: "/app/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
  });
}
