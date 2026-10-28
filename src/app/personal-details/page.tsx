import type { Metadata } from "next";
import { PersonalDetailsPage } from "@/components/pages/personal-details/personal-details-page";

export const metadata: Metadata = { title: "个人资料" };

export default function Page() {
  return <PersonalDetailsPage />;
}
