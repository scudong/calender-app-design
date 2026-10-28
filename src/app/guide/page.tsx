import type { Metadata } from "next";
import { GuidePage } from "@/components/pages/guide/guide-page";

export const metadata: Metadata = { title: "使用说明" };

export default function Page() {
  return <GuidePage />;
}
