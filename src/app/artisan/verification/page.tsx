import { Suspense } from "react";
import { Shell, PageHeader } from "@/components/site/shell";
import { PageLoading } from "@/components/ui/feedback";
import { Verification } from "./verification";

export const metadata = { title: "Identity verification" };

export default function VerificationPage() {
  return (
    <Shell width="narrow">
      <PageHeader
        eyebrow="Artisan"
        title="Verify your identity"
        description="A person on our team checks your ID. Customers see a badge, never your documents."
      />
      <Suspense fallback={<PageLoading />}>
        <Verification />
      </Suspense>
    </Shell>
  );
}
