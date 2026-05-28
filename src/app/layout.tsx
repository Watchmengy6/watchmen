import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "The Watchmen · Got Your 6",
  description: "A private network for the Watchmen brotherhood. Got Your 6.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Watchmen",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  other: {
    // Modern equivalent of apple-mobile-web-app-capable.
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  // No maximumScale lock — keep pinch-zoom available for accessibility.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-[100dvh] bg-ink-900 text-white antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
