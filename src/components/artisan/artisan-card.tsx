import Link from "next/link";
import { Clock, MapPin, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/feedback";
import { RatingInline, TrustBadge, VerifiedMark } from "@/components/artisan/trust";
import { formatDistance, formatResponseTime } from "@/lib/format";
import { formatPriceRange } from "@/lib/locale";
import { type ArtisanCardData } from "@/lib/types";

/** One search result. The whole card is a single link target. */
export function ArtisanCard({ artisan }: { artisan: ArtisanCardData }) {
  const price = formatPriceRange(artisan.calloutMinKobo, artisan.calloutMaxKobo);
  const response = formatResponseTime(artisan.responseTimeMedianSec);
  const distance = formatDistance(artisan.distanceKm);
  return (
    <article className="group relative flex h-full flex-col gap-4 card-surface p-4 transition-shadow hover:shadow-lg sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={artisan.businessName} src={artisan.avatarUrl} className="size-12" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base leading-snug font-bold">
            <Link
              href={`/artisans/${artisan.id}`}
              className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-ring"
            >
              {artisan.businessName}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {artisan.headline}
            {artisan.yearsExperience > 0 && ` · ${artisan.yearsExperience} yrs`}
          </p>
        </div>
        {artisan.isAvailableNow && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 font-label text-[11px] font-bold text-success">
            <Zap className="size-3 fill-current" aria-hidden />
            Free now
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <TrustBadge
          tier={artisan.trustTier}
          score={artisan.trustScore}
          provisional={artisan.isProvisional}
        />
        <RatingInline value={artisan.ratingAverage} count={artisan.ratingCount} />
        {artisan.isVerified && <VerifiedMark />}
      </div>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="truncate">
            {artisan.areaLabel ?? "Area not set"}
            {distance && <span className="font-semibold text-foreground"> · {distance} away</span>}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Clock className="size-4 shrink-0" aria-hidden />
          <span>
            {artisan.completedJobsCount} {artisan.completedJobsCount === 1 ? "job" : "jobs"} done
            {response && ` · replies in ${response}`}
          </span>
        </li>
      </ul>

      <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
        <div>
          <p className="font-label text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Callout fee
          </p>
          <p className="font-bold">{price ?? "Ask for a quote"}</p>
        </div>
        <span className="font-label text-sm font-bold text-primary group-hover:underline">
          View profile →
        </span>
      </div>
    </article>
  );
}

export function ArtisanCardSkeleton() {
  return (
    <div className="space-y-4 card-surface p-5" aria-hidden>
      <div className="flex gap-3">
        <div className="size-12 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-6 w-2/3 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-full animate-pulse rounded bg-muted" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      <div className="h-10 animate-pulse rounded bg-muted" />
    </div>
  );
}
