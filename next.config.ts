import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The whole prototype runs in the browser, so it ships as a static site
  // (Cloudflare Pages direct upload).
  output: "export",
  images: { unoptimized: true },
  // The floating dev badge sits on top of the sidebar account block.
  devIndicators: false,
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
