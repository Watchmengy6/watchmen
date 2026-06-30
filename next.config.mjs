/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
    // Keep prefetched/visited route data in the client Router Cache so the
    // up-front tab prefetch (see BottomNav prefetch) is actually reused —
    // without this, dynamic routes default to a 0s cache and refetch on every
    // tap, which is the "first click on each tab lags" symptom. Mutations call
    // router.refresh() (and pull-to-refresh exists), so staleness stays bounded.
    staleTimes: { dynamic: 120, static: 300 },
  },
  // Don't block Vercel builds on lint findings. We rely on tsc for
  // correctness during build (which still runs); lint is a dev-time
  // gate, not a release gate.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Baseline security headers (WM-005). A strict Content-Security-Policy is
  // intentionally NOT set here yet — it must be authored + verified in
  // staging first because the app needs allowances for Supabase REST,
  // Supabase Realtime (wss), Supabase Storage, blob:/data: media, and
  // Next's inline bootstrap scripts. Adding `default-src 'self'` blindly
  // would white-screen the app. These headers are safe to ship now.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
