import { BadgeCheck, MapPin, Star, Zap } from "lucide-react";
import { Button, buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/locale";

export type TrustTier = "NEW" | "TRUSTED" | "HIGHLY_TRUSTED" | "TOP_RATED";

export type ArtisanCardData = {
  id: string;
  businessName: string;
  headline: string; // primary trade, e.g. "AC & Refrigeration"
  areaLabel: string | null;
  trustScore: number;
  trustTier: TrustTier;
  ratingAverage: number | null;
  ratingCount: number;
  completedJobsCount: number;
  calloutMinKobo: number | null;
  calloutMaxKobo: number | null;
  isAvailableNow: boolean;
  distanceKm: number | null;
  responseTimeMedianSec: number | null;
  availabilityLabel: string | null; // "Available now" · "Today 4pm" · "Tomorrow"
};

const tierStyles: Record<TrustTier, { dot: string; label: string }> = {
  NEW: { dot: "bg-tier-new", label: "New Sabi" },
  TRUSTED: { dot: "bg-tier-trusted", label: "Trusted Sabi" },
  HIGHLY_TRUSTED: { dot: "bg-tier-highly-trusted", label: "Highly Trusted" },
  TOP_RATED: { dot: "bg-tier-top-rated", label: "Top Rated Oga" },
};

export function TrustTierBadge({ tier, score }: { tier: TrustTier; score: number }) {
  const s = tierStyles[tier] ?? tierStyles.NEW;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
      <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
      {s.label} <span className="tabular-nums opacity-70">{Math.round(score)}</span>
    </span>
  );
}

export function StarRating({ value, count }: { value: number | null; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="size-3.5 fill-accent text-accent" aria-hidden />
      <span className="font-medium tabular-nums">{value?.toFixed(1) ?? "New"}</span>
      {count > 0 && <span className="text-muted-foreground">({count})</span>}
    </span>
  );
}

function formatResponseTime(sec: number | null): string | null {
  if (sec == null) return null;
  if (sec < 60) return `${Math.round(sec)}s response`;
  const min = Math.round(sec / 60);
  return min < 60 ? `${min} min response` : `${Math.round(min / 60)} hr response`;
}

/** A search-result card for one artisan. Pure presentational; the parent supplies derived data. */
export function ArtisanCard({ artisan, href }: { artisan: ArtisanCardData; href: string }) {
  const price = formatMoneyRange(artisan.calloutMinKobo, artisan.calloutMaxKobo);
  const response = formatResponseTime(artisan.responseTimeMedianSec);

  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold">
            <a href={href} className="hover:text-primary focus-visible:text-primary">
              {artisan.businessName}
            </a>
          </h3>
          <p className="truncate text-sm text-muted-foreground">{artisan.headline}</p>
        </div>
        <TrustTierBadge tier={artisan.trustTier} score={artisan.trustScore} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <StarRating value={artisan.ratingAverage} count={artisan.ratingCount} />
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <BadgeCheck className="size-4 text-info" aria-hidden />
          {artisan.completedJobsCount} completed jobs
        </span>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4 text-muted-foreground" aria-hidden />
          {artisan.areaLabel ?? "Location pending"}
          {artisan.distanceKm != null && (
            <span className="text-muted-foreground tabular-nums">
              ·{" "}
              {artisan.distanceKm < 10
                ? artisan.distanceKm.toFixed(1)
                : Math.round(artisan.distanceKm)}{" "}
              km
            </span>
          )}
        </span>
        {artisan.isAvailableNow ? (
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <Zap className="size-3.5 fill-success" aria-hidden /> Available now
          </span>
        ) : (
          artisan.availabilityLabel && (
            <span className="text-muted-foreground">{artisan.availabilityLabel}</span>
          )
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          {price && (
            <p className="text-sm text-muted-foreground">
              Callout <span className="font-semibold text-foreground">{price}</span>
            </p>
          )}
          {response && <p className="text-xs text-muted-foreground">{response}</p>}
        </div>
        <div className="flex gap-2">
          <a href={href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            View profile
          </a>
          <Button
            variant="accent"
            size="sm"
            onClick={() => {
              // Navigate to the booking flow for this artisan
              // We pass the artisan id via query param; category selection will be optional.
              const url = new URL(window.location.origin + "/booking/" + artisan.id);
              // Future: add categoryId query when available
              window.location.href = url.toString();
            }}
            aria-label={`Request inspection from ${artisan.businessName}`}
          >
            Request inspection
          </Button>
        </div>
      </div>
    </article>
  );
}

function formatMoneyRange(minKobo: number | null, maxKobo: number | null): string | null {
  if (minKobo == null && maxKobo == null) return null;
  const min = minKobo != null ? formatMoney(minKobo) : null;
  const max = maxKobo != null ? formatMoney(maxKobo) : null;
  if (min && max) return min === max ? min : `${min} – ${max}`;
  return min ? `from ${min}` : `up to ${max as string}`;
}
