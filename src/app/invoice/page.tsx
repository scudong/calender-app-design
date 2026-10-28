import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceDeepLink } from "@/components/pages/invoice/invoice-deep-link";
import { InvoicePage } from "@/components/pages/invoice/invoice-page";

export const metadata: Metadata = { title: "发票" };

export default function Page() {
  return (
    <>
      <InvoicePage />
      {/* Reads ?open=<id> (linked from global search). useSearchParams needs a
          Suspense boundary so the rest of the page can still be prerendered. */}
      <Suspense fallback={null}>
        <InvoiceDeepLink />
      </Suspense>
    </>
  );
}
