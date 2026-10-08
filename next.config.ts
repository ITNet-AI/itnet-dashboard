import type { NextConfig } from "next";

// Cache Components is off on purpose: every page reads the session cookie,
// so there is no static shell to gain and it would force Suspense around every read.
const nextConfig: NextConfig = {
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
