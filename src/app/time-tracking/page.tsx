import type { Metadata } from "next";
import { TimeTrackingPage } from "@/components/pages/time-tracking/time-tracking-page";

export const metadata: Metadata = { title: "工时追踪" };

export default function Page() {
  return <TimeTrackingPage />;
}
