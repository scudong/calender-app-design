import type { Metadata } from "next";
import { BenefitsPage } from "@/components/pages/benefits/benefits-page";

export const metadata: Metadata = { title: "福利" };

export default function Page() {
  return <BenefitsPage />;
}
