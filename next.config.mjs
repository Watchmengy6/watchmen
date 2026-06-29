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
};

export default nextConfig;
