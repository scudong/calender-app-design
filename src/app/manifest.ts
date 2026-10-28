import type { MetadataRoute } from "next";

// Required for `output: "export"`: emit the manifest once at build time.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kargul 工作台",
    short_name: "Kargul",
    description: "规划休假、追踪请假申请并管理你的工作日历。",
    start_url: "/time-off",
    display: "standalone",
    background_color: "#f8f8f8",
    theme_color: "#f8f8f8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
