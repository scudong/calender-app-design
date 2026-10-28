import type { Metadata } from "next";
import { DashboardPage } from "@/components/pages/dashboard/dashboard-page";

export const metadata: Metadata = { title: "仪表盘" };

export default function Page() {
  return <DashboardPage />;
}
