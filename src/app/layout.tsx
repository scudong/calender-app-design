import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/shell/app-shell";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["600"] });

const SITE_URL = "https://calender-app-design.vercel.app";
const DESCRIPTION =
  "一个从容的人力运营工作台：规划休假、追踪请假申请与余额，管理你的工作日历。Kargul Studio 设计原型。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "休假 · Kargul 工作台", template: "%s · Kargul 工作台" },
  description: DESCRIPTION,
  applicationName: "Kargul 工作台",
  authors: [{ name: "Kargul Studio", url: "https://kargul.studio" }],
  creator: "Kargul Studio",
  publisher: "Kargul Studio",
  keywords: ["休假", "请假管理", "日历", "人力资源", "人力运营", "设计原型", "Kargul Studio"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Kargul 日历设计原型",
    title: "Kargul 工作台 — 休假与日历",
    description: DESCRIPTION,
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kargul 工作台 — 休假与日历",
    description: DESCRIPTION,
  },
  appleWebApp: { capable: true, title: "Kargul", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f8" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full`}
    >
      <body className="h-full overflow-hidden">
        <Providers>
          <AuthGate>
            <AppShell>{children}</AppShell>
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
