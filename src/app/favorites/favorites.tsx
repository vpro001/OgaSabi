"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { ArtisanCard, ArtisanCardSkeleton } from "@/components/artisan/artisan-card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { useRequireAuth } from "@/hooks/use-auth";
import { api, errorMessage } from "@/lib/api";
import { type ArtisanCardData } from "@/lib/types";

export function Favorites() {
  const me = useRequireAuth();
  const query = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => (await api<{ artisans: ArtisanCardData[] }>("/favorites")).artisans,
    enabled: !!me,
  });
  if (!me || query.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <ArtisanCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (query.isError)
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No saved artisans yet"
        action={
          <Link href="/search" className={buttonVariants({ variant: "accent" })}>
            Find artisans
          </Link>
        }
      >
        Tap “Save” on an artisan&apos;s profile to keep them here.
      </EmptyState>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {query.data.map((a) => (
        <ArtisanCard key={a.id} artisan={a} />
      ))}
    </div>
  );
}
