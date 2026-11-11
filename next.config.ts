import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "trust-encar.ru" },
      { protocol: "https", hostname: "*.trust-encar.ru" },
      { protocol: "https", hostname: "banzai24.com" },
      { protocol: "https", hostname: "*.byteimg.com" },
      { protocol: "https", hostname: "*.dcarimg.com" }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      },
      {
        source: "/catalog/:market(korea|japan|china)",
        headers: [{ key: "Vercel-CDN-Cache-Control", value: "max-age=300, stale-while-revalidate=3600" }]
      },
      {
        source: "/auto/:slug",
        headers: [{ key: "Vercel-CDN-Cache-Control", value: "max-age=21600, stale-while-revalidate=86400" }]
      },
      {
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }
        ]
      }
    ];
  }
};

export default nextConfig;
