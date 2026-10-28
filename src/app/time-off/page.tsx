import type { Metadata } from "next";
import { TimeOffView } from "@/components/time-off/time-off-view";

export const metadata: Metadata = { title: "休假" };

export default function TimeOffPage() {
  return <TimeOffView />;
}
