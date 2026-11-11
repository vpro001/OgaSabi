"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Clock,
  Flag,
  Heart,
  MapPin,
  Navigation,
  Repeat,
  UserRoundX,
  Zap,
} from "lucide-react";
import { CategoryIcon } from "@/components/artisan/category-icon";
import {
  RatingInline,
  Stars,
  TrustBadge,
  TrustBreakdown,
  VerifiedMark,
} from "@/components/artisan/trust";
import { ReportDialog } from "@/components/request/report-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageLoading,
  Spinner,
} from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/hooks/use-auth";
import { api, ApiError, apiWithMeta, errorMessage } from "@/lib/api";
import {
  DAYS,
  formatDate,
  formatMinute,
  formatResponseTime,
  humanize,
  VERIFICATION_LABEL,
} from "@/lib/format";
import { formatPriceRange } from "@/lib/locale";
import { type ArtisanProfile, type Review } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProfileView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const { me } = useMe();
  const [photo, setPhoto] = useState<string | null>(null);
  const [report, setReport] = useState<{ type: "USER" | "REVIEW"; id: string } | null>(null);

  const profile = useQuery({
    queryKey: ["artisan", id],
    queryFn: () => api<ArtisanProfile>(`/artisans/${id}`),
  });
  const reviews = useInfiniteQuery({
    queryKey: ["artisan", id, "reviews"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiWithMeta<{ reviews: Review[] }>(
        `/artisans/${id}/reviews?limit=6${pageParam ? `&cursor=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
    enabled: profile.isSuccess,
  });

  const favorite = useMutation({
    mutationFn: (on: boolean) =>
      api<{ isFavorite: boolean }>(`/artisans/${id}/favorite`, { method: on ? "PUT" : "DELETE" }),
    onMutate: (on) =>
      client.setQueryData<ArtisanProfile>(["artisan", id], (old) =>
        old ? { ...old, isFavorite: on } : old,
      ),
    onError: (err, on) => {
      client.setQueryData<ArtisanProfile>(["artisan", id], (old) =>
        old ? { ...old, isFavorite: !on } : old,
      );
      toast.error(errorMessage(err));
    },
    onSuccess: (_d, on) => {
      toast.success(on ? "Saved to your artisans" : "Removed from your saved artisans");
      client.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  if (profile.isPending) return <PageLoading label="Loading profile" />;
  if (profile.isError) {
    const missing = profile.error instanceof ApiError && profile.error.status === 404;
    return missing ? (
      <EmptyState
        icon={UserRoundX}
        title="This artisan is not available"
        action={
          <Link href="/search" className={buttonVariants({ variant: "accent" })}>
            Find other artisans
          </Link>
        }
      >
        The profile may have been removed or is not public yet.
      </EmptyState>
    ) : (
      <ErrorState message={errorMessage(profile.error)} onRetry={() => profile.refetch()} />
    );
  }

  const a = profile.data;
  const price = formatPriceRange(a.calloutMinKobo, a.calloutMaxKobo);
  const response = formatResponseTime(a.responseTimeMedianSec);
  const allReviews = reviews.data?.pages.flatMap((p) => p.data.reviews) ?? [];
  const requireSignIn = (then: () => void) =>
    me ? then() : router.push(`/login?next=${encodeURIComponent(`/artisans/${id}`)}`);
  const canRequest = a.status === "ACTIVE" && !a.isOwner;
  const byDay = DAYS.map((day, i) => ({
    day,
    slots: a.availability.filter((s) => s.dayOfWeek === i),
  }));

  const requestCta = a.isOwner ? (
    <Link
      href="/artisan/profile"
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
    >
      Edit your profile
    </Link>
  ) : (
    <Link
      href={`/booking/${a.id}`}
      aria-disabled={!canRequest}
      className={cn(
        buttonVariants({ variant: "accent", size: "lg" }),
        "w-full",
        !canRequest && "pointer-events-none opacity-50",
      )}
    >
      Request this artisan
    </Link>
  );

  return (
    <div className="pb-24 lg:pb-0">
      {a.status !== "ACTIVE" && (
        <Alert tone="warning" title="Only you can see this profile" className="mb-6">
          It is not public yet. Finish setting it up to start receiving requests.
        </Alert>
      )}

      <header className="relative overflow-hidden card-surface p-5 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 adire-pattern opacity-40"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={a.businessName} src={a.avatarUrl} className="size-20 text-2xl sm:size-24" />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl leading-tight font-extrabold tracking-tight">
                  {a.businessName}
                </h1>
                {a.isAvailableNow && (
                  <Badge tone="success">
                    <Zap className="size-3 fill-current" aria-hidden /> Free now
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">
                {a.headline} · run by {a.ownerName}
                {a.yearsExperience > 0 && ` · ${a.yearsExperience} years' experience`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <TrustBadge
                tier={a.trustTier}
                score={a.trustScore}
                provisional={a.isProvisional}
                className="text-sm"
              />
              <RatingInline value={a.ratingAverage} count={a.ratingCount} />
              {a.verificationLevel !== "NONE" && <VerifiedMark />}
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {[a.areaLabel, a.city && !a.areaLabel?.includes(a.city) ? a.city : null]
                .filter(Boolean)
                .join(", ") || "Area not set"}{" "}
              · travels up to {a.serviceRadiusKm} km
            </p>
          </div>
          <div className="flex gap-2 sm:flex-col">
            <Button
              variant="outline"
              size="sm"
              aria-pressed={a.isFavorite}
              disabled={favorite.isPending || a.isOwner}
              onClick={() => requireSignIn(() => favorite.mutate(!a.isFavorite))}
            >
              <Heart
                className={cn("size-4", a.isFavorite && "fill-destructive text-destructive")}
                aria-hidden
              />
              {a.isFavorite ? "Saved" : "Save"}
            </Button>
            {!a.isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => requireSignIn(() => setReport({ type: "USER", id: a.ownerUserId }))}
              >
                <Flag className="size-4" aria-hidden /> Report
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-extrabold">About</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-foreground/85">
              {a.bio || "This artisan has not written a description yet."}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {a.categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/search?category=${c.slug}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-muted px-3 text-sm font-semibold hover:bg-primary-container"
                  >
                    <CategoryIcon iconKey={c.iconKey} className="size-4 text-secondary" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
              <Stat label="Jobs completed" value={String(a.completedJobsCount)} />
              <Stat
                label="Completion rate"
                value={a.completionRate != null ? `${Math.round(a.completionRate * 100)}%` : "—"}
              />
              <Stat label="Replies in" value={response ?? "—"} />
              <Stat label="Member since" value={new Date(a.memberSince).getFullYear().toString()} />
            </dl>
          </Card>

          {a.portfolio.length > 0 && (
            <Card>
              <h2 className="text-xl font-extrabold">Photos of past work</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {a.portfolio.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPhoto(p.url)}
                      className="group block w-full overflow-hidden rounded-xl bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- storage-provider URLs */}
                      <img
                        src={p.url}
                        alt={p.caption ?? "Past work"}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                    {p.caption && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{p.caption}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card id="reviews">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="text-xl font-extrabold">Reviews from completed jobs</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only customers whose job was confirmed complete can leave a review.
                </p>
              </div>
              {a.ratingCount > 0 && a.ratingAverage != null && (
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="font-headline text-4xl font-black tabular-nums">
                      {a.ratingAverage.toFixed(1)}
                    </p>
                    <Stars value={a.ratingAverage} />
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.ratingCount} reviews</p>
                  </div>
                  <ul className="w-36 space-y-1" aria-label="Rating breakdown">
                    {a.ratingDistribution.map((d) => (
                      <li key={d.star} className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="w-3">{d.star}</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{
                              width: `${a.ratingCount ? (d.count / a.ratingCount) * 100 : 0}%`,
                            }}
                          />
                        </span>
                        <span className="w-6 text-right text-muted-foreground">{d.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-5">
              {reviews.isPending ? (
                <Spinner className="mx-auto" />
              ) : allReviews.length === 0 ? (
                <p className="rounded-xl bg-muted p-5 text-center text-sm text-muted-foreground">
                  No reviews yet. Reviews appear after the first completed job.
                </p>
              ) : (
                allReviews.map((r) => (
                  <article key={r.id} className="border-t pt-5 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.authorName} className="size-9 text-xs" />
                        <div>
                          <p className="text-sm font-bold">{r.authorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.jobCategory} · {formatDate(r.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Stars value={r.rating} />
                    </div>
                    {r.comment && <p className="mt-3 text-sm leading-relaxed">{r.comment}</p>}
                    {r.tags.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {r.tags.map((t) => (
                          <li key={t}>
                            <Badge>{humanize(t)}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.replyBody && (
                      <div className="mt-3 rounded-lg border-l-4 border-primary/30 bg-muted/60 p-3 text-sm">
                        <p className="font-semibold">Reply from {a.businessName}</p>
                        <p className="mt-1 text-foreground/85">{r.replyBody}</p>
                      </div>
                    )}
                    {!a.isOwner && (
                      <button
                        type="button"
                        onClick={() => requireSignIn(() => setReport({ type: "REVIEW", id: r.id }))}
                        className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        Report this review
                      </button>
                    )}
                  </article>
                ))
              )}
              {reviews.hasNextPage && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => reviews.fetchNextPage()}
                  disabled={reviews.isFetchingNextPage}
                >
                  {reviews.isFetchingNextPage && <Spinner className="size-4" />} Show more reviews
                </Button>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card className="hidden space-y-4 lg:block">
            <div>
              <p className="font-label text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Callout fee
              </p>
              <p className="text-2xl font-extrabold">{price ?? "Ask for a quote"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Covers the visit and diagnosis. The price for the work is agreed before it starts.
              </p>
            </div>
            {requestCta}
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-4" aria-hidden />{" "}
              {response
                ? `Usually replies in ${response}`
                : "New artisan: response time not known yet"}
            </p>
          </Card>

          <Card>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-extrabold">Trust score</h2>
              <p className="font-headline text-4xl leading-none font-black text-primary tabular-nums">
                {Math.round(a.trustScore)}
                <span className="text-base font-bold text-muted-foreground">/100</span>
              </p>
            </div>
            {a.isProvisional && (
              <p className="mt-2 rounded-lg bg-warning/10 p-2.5 text-xs font-medium text-warning">
                Provisional: fewer than 3 completed jobs on OgaSabi so far.
              </p>
            )}
            <div className="mt-5">
              {a.trust ? (
                <TrustBreakdown components={a.trust.components} max={a.trust.max} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  The breakdown appears after the first score calculation.
                </p>
              )}
            </div>
            <Link
              href="/how-trust-works"
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              How is this calculated?
            </Link>
          </Card>

          <Card>
            <h2 className="text-lg font-extrabold">Verification</h2>
            <p
              className={cn(
                "mt-2 text-sm font-medium",
                a.verificationLevel === "NONE" ? "text-muted-foreground" : "text-success",
              )}
            >
              {VERIFICATION_LABEL[a.verificationLevel]}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Navigation className="size-4 shrink-0" aria-hidden /> Covers {a.serviceRadiusKm} km
                around {a.areaLabel ?? "their base"}
              </li>
              <li className="flex items-center gap-2">
                <Repeat className="size-4 shrink-0" aria-hidden /> {a.completedJobsCount} jobs
                completed on OgaSabi
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <CalendarClock className="size-5 text-secondary" aria-hidden /> Working hours
            </h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              {byDay.map(({ day, slots }) => (
                <div key={day} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{day}</dt>
                  <dd
                    className={cn(
                      "font-medium tabular-nums",
                      slots.length === 0 && "text-muted-foreground",
                    )}
                  >
                    {slots.length
                      ? slots
                          .map(
                            (s) => `${formatMinute(s.startMinute)} – ${formatMinute(s.endMinute)}`,
                          )
                          .join(", ")
                      : "Closed"}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>

      {/* Mobile: the primary action stays within thumb reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-label text-[11px] font-semibold text-muted-foreground uppercase">
              Callout fee
            </p>
            <p className="truncate font-bold">{price ?? "Ask for a quote"}</p>
          </div>
          <div className="w-48">{requestCta}</div>
        </div>
      </div>

      <Dialog open={!!photo} onClose={() => setPhoto(null)} title="Past work" className="max-w-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- storage-provider URLs */}
        {photo && (
          <img
            src={photo}
            alt="Past work, enlarged"
            className="max-h-[70dvh] w-full rounded-xl object-contain"
          />
        )}
      </Dialog>
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}
