import type { NextConfig } from "next";

// Cache Components is off on purpose: every page reads the session cookie,
// so there is no static shell to gain and it would force Suspense around every read.
const nextConfig: NextConfig = {
  // The consent screen grants an app access to someone's account; it must never load inside another site's frame.
  async headers() {
    return [
      {
        source: "/oauth/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
