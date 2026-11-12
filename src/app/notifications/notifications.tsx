"use client";

import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/feedback";
import { ME_KEY, useRequireAuth } from "@/hooks/use-auth";
import { api, apiWithMeta, errorMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/locale";
import { type AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Notifications() {
  const me = useRequireAuth();
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiWithMeta<{ unread: number; notifications: AppNotification[] }>(
        `/notifications?limit=20${pageParam ? `&cursor=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    enabled: !!me,
  });
  const markRead = useMutation({
    mutationFn: (ids?: string[]) =>
      api("/notifications", { method: "POST", body: ids ? { ids } : {} }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["notifications"] });
      client.invalidateQueries({ queryKey: ME_KEY });
    },
  });

  if (!me || query.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }
  if (query.isError)
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  const items = query.data.pages.flatMap((p) => p.data.notifications);
  const unread = query.data.pages[0]?.data.unread ?? 0;
  if (items.length === 0) {
    return (
      <EmptyState icon={BellOff} title="You are all caught up">
        Updates about your requests, quotes and messages will show up here.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {unread > 0 ? `${unread} unread` : "All read"}
        </p>
        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={markRead.isPending}
            onClick={() => markRead.mutate(undefined)}
          >
            Mark all as read
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((n) => {
          const body = (
            <>
              <span
                className={cn(
                  "mt-2 size-2.5 shrink-0 rounded-none",
                  n.read ? "bg-transparent" : "bg-accent",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className={cn("block", n.read ? "font-medium" : "font-bold")}>
                  {!n.read && <span className="sr-only">Unread: </span>}
                  {n.title}
                </span>
                <span className="block text-sm text-muted-foreground">{n.body}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(n.createdAt))}
                </span>
              </span>
            </>
          );
          const cls = cn(
            "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted",
            !n.read && "border-accent/40 bg-accent-container/20",
          );
          return (
            <li key={n.id}>
              {n.href ? (
                <Link
                  href={n.href}
                  className={cls}
                  onClick={() => !n.read && markRead.mutate([n.id])}
                >
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  className={cls}
                  onClick={() => !n.read && markRead.mutate([n.id])}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage && <Spinner className="size-4" />} Show older
        </Button>
      )}
    </div>
  );
}
