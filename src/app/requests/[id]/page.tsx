import { Suspense } from "react";
import { Shell } from "@/components/site/shell";
import { PageLoading } from "@/components/ui/feedback";
import { RequestView } from "./request-view";

export const metadata = { title: "Request" };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Shell>
      <Suspense fallback={<PageLoading />}>
        <RequestView id={id} />
      </Suspense>
    </Shell>
  );
}
