import type { Metadata } from "next";
import { AdminPage } from "@/components/pages/admin/admin-page";

export const metadata: Metadata = { title: "团队审批" };

export default function Page() {
  return <AdminPage />;
}
