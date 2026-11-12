"use client";

import { useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CalendarClock, ClipboardList, MapPin, MessageCircle, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/feedback";
import { apiWithMeta, errorMessage } from "@/lib/api";
import { formatDateTime, formatDistance, STATUS } from "@/lib/format";
import { formatMoney, formatRelativeTime } from "@/lib/locale";
import { type RequestSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: RequestSummary["status"] }) {
  const s = STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function RequestList({ as, empty }: { as: "customer" | "artisan"; empty: React.ReactNode }) {
  const [group, setGroup] = useState<"active" | "past">("active");
  const query = useInfiniteQuery({
    queryKey: ["requests", as, group],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiWithMeta<{ requests: RequestSummary[] }>(
        `/requests?as=${as}&group=${group}&limit=12${pageParam ? `&cursor=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    refetchInterval: group === "active" ? 30_000 : false,
  });
  const requests = query.data?.pages.flatMap((p) => p.data.requests) ?? [];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Requests" className="inline-flex rounded-xl bg-muted p-1">
        {(["active", "past"] as const).map((g) => (
          <button
            key={g}
            role="tab"
            type="button"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={cn(
              "min-h-10 rounded-lg px-5 text-sm font-bold transition-colors",
              group === g ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {g === "active" ? "Active" : "Past"}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : requests.length === 0 ? (
        group === "active" ? (
          empty
        ) : (
          <EmptyState icon={ClipboardList} title="Nothing here yet">
            Completed, cancelled and expired requests will appear here.
          </EmptyState>
        )
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <RequestCard request={r} as={as} />
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage && <Spinner className="size-4" />} Show more
        </Button>
      )}
    </div>
  );
}

function RequestCard({ request: r, as }: { request: RequestSummary; as: "customer" | "artisan" }) {
  const other = as === "customer" ? r.artisan.businessName : r.customer.name;
  const amount = r.finalAmountKobo ?? r.quotedAmountKobo;
  const needsYou =
    as === "customer"
      ? ["QUOTED", "AWAITING_CONFIRMATION"].includes(r.status)
      : r.status === "PENDING";
  return (
    <Link
      href={`/requests/${r.id}`}
      className={cn(
        "block p-4 transition-shadow card-surface hover:shadow-lg sm:p-5",
        needsYou && "shadow-[6px_6px_0_var(--accent)]",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={other} src={as === "customer" ? r.artisan.avatarUrl : r.customer.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-bold">{other}</p>
            <StatusBadge status={r.status} />
            {needsYou && <Badge tone="accent">Needs your response</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {r.category.name} · {r.reference} · {formatRelativeTime(new Date(r.createdAt))}
          </p>
        </div>
        {amount != null && <p className="shrink-0 font-bold tabular-nums">{formatMoney(amount)}</p>}
      </div>
      <p className="mt-3 line-clamp-2 text-sm">{r.description}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-muted-foreground">
        <li className="flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          {r.areaLabel}
          {as === "artisan" && r.distanceKm != null && ` · ${formatDistance(r.distanceKm)}`}
        </li>
        <li className="flex items-center gap-1">
          {r.isImmediate ? (
            <Zap className="size-3.5" aria-hidden />
          ) : (
            <CalendarClock className="size-3.5" aria-hidden />
          )}
          {r.isImmediate
            ? "As soon as possible"
            : r.scheduledFor
              ? formatDateTime(r.scheduledFor)
              : "Flexible"}
        </li>
        {r.unreadMessages > 0 && (
          <li className="flex items-center gap-1 font-bold text-primary">
            <MessageCircle className="size-3.5" aria-hidden />
            {r.unreadMessages} new {r.unreadMessages === 1 ? "message" : "messages"}
          </li>
        )}
        {r.reviewRating != null && (
          <li className="flex items-center gap-1">
            <Star className="size-3.5 fill-accent text-accent" aria-hidden />
            Reviewed {r.reviewRating}/5
          </li>
        )}
      </ul>
    </Link>
  );
}
