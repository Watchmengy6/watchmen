import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { SplashGate } from "@/components/brand/SplashGate";
import { DeepLinkHandler } from "@/components/native/DeepLinkHandler";

export const metadata: Metadata = {
  title: "The Watchmen · Got Your 6",
  description: "A private network for the Watchmen brotherhood. Got Your 6.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Watchmen",
    // iOS launch images — shown instantly on tap (before our JS boots),
    // so there's no blank flash opening the home-screen app.
    startupImage: [
      { url: "/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/splash/splash-828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Belt + suspenders: explicit viewport meta directly in <head>
            so iOS WKWebView sees the device-width pin at the EARLIEST
            possible parse time, before Next.js's metadata API injection.
            Without this, WebKit was falling back to its 980px desktop
            default after every router.refresh() — which let users pan
            the page horizontally after every post. maximum-scale=1 +
            user-scalable=no kill pinch-zoom amplification. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className="min-h-[100dvh] bg-ink-900 text-white antialiased">
        <SplashGate />
        <DeepLinkHandler />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
