import type { Metadata } from "next";
import { SettingsPage } from "@/components/pages/settings/settings-page";

export const metadata: Metadata = { title: "设置" };

export default function Page() {
  return <SettingsPage />;
}
