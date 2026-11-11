"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { RequestList } from "@/components/request/request-list";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, PageLoading } from "@/components/ui/feedback";
import { useRequireAuth } from "@/hooks/use-auth";

export function MyRequests() {
  const me = useRequireAuth();
  if (!me) return <PageLoading />;
  return (
    <RequestList
      as="customer"
      empty={
        <EmptyState
          icon={Search}
          title="No open requests"
          action={
            <Link href="/search" className={buttonVariants({ variant: "accent" })}>
              Find an artisan
            </Link>
          }
        >
          When you send a request to an artisan it appears here, with every update along the way.
        </EmptyState>
      }
    />
  );
}
