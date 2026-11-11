import { Suspense } from "react";
import { Shell } from "@/components/site/shell";
import { PageLoading } from "@/components/ui/feedback";
import { SearchView } from "./search-view";

export const metadata = {
  title: "Find an artisan",
  description:
    "Search verified, trust-scored artisans near you by trade, distance and availability.",
};

export default function SearchPage() {
  return (
    <Shell width="wide">
      <Suspense fallback={<PageLoading label="Loading search" />}>
        <SearchView />
      </Suspense>
    </Shell>
  );
}
