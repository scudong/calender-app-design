import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/pages/analytics/analytics-page";

export const metadata: Metadata = { title: "数据分析" };

export default function Page() {
  return <AnalyticsPage />;
}
