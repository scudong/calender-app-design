import type { Metadata } from "next";
import { WithdrawalMethodsPage } from "@/components/pages/withdrawal-methods/withdrawal-methods-page";

export const metadata: Metadata = { title: "收款方式" };

export default function Page() {
  return <WithdrawalMethodsPage />;
}
