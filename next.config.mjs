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
  },
  // Don't block Vercel builds on lint findings. We rely on tsc for
  // correctness during build (which still runs); lint is a dev-time
  // gate, not a release gate.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
