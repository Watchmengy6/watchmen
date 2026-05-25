import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "The Watchman",
  description: "A private network for the Watchman brotherhood.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Watchman",
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
