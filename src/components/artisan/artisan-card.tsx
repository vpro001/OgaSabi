import Link from "next/link";
import { Avatar } from "@/components/ui/feedback";
import { RatingInline, Stamp } from "@/components/artisan/trust";
import { formatDistance, formatResponseTime, TIER_LABEL } from "@/lib/format";
import { formatPriceRange } from "@/lib/locale";
import { type ArtisanCardData } from "@/lib/types";

/**
 * One search result, laid out as a job ticket: a stub with the trade and the trust score,
 * a tear line, then the details. The whole ticket is a single link target.
 */
export function ArtisanCard({ artisan, index }: { artisan: ArtisanCardData; index?: number }) {
  const price = formatPriceRange(artisan.calloutMinKobo, artisan.calloutMaxKobo);
  const response = formatResponseTime(artisan.responseTimeMedianSec);
  const distance = formatDistance(artisan.distanceKm);
  return (
    <article className="group relative flex h-full pressable flex-col card-surface">
      <div className="flex items-stretch border-b-2">
        <p className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 ticket-label">
          {index != null && (
            <span className="opacity-50">№{String(index + 1).padStart(2, "0")}</span>
          )}
          <span className="truncate">{artisan.headline}</span>
        </p>
        {artisan.isAvailableNow && (
          <p className="flex items-center border-l-2 bg-success px-2.5 ticket-label text-success-foreground">
            Free now
          </p>
        )}
        <p
          className="flex items-center gap-1.5 border-l-2 bg-accent px-3 text-accent-foreground"
          title={
            artisan.isProvisional
              ? "Provisional: fewer than 3 completed jobs so far"
              : `Trust score, ${TIER_LABEL[artisan.trustTier]}`
          }
        >
          <span className="ticket-label">Trust</span>
          <span className="font-display text-3xl leading-none tabular-nums">
            {Math.round(artisan.trustScore)}
          </span>
        </p>
      </div>

      <div className="relative flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <Avatar
            name={artisan.businessName}
            src={artisan.avatarUrl}
            className="size-14 text-2xl"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-headline text-2xl leading-[0.95]">
              <Link
                href={`/artisans/${artisan.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-ring"
              >
                {artisan.businessName}
              </Link>
            </h3>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {artisan.areaLabel ?? "Area not set"}
              {distance && <span className="font-bold text-foreground"> · {distance}</span>}
            </p>
          </div>
        </div>
        {artisan.isVerified && (
          <Stamp className="absolute top-[3.4rem] right-3 bg-card text-[11px]" tilt={-9}>
            ✓ Verified
          </Stamp>
        )}

        <dl className="mt-auto grid grid-cols-3 border-2 text-center font-label">
          <div className="px-1 py-2">
            <dt className="ticket-label text-[9px] text-muted-foreground">Rating</dt>
            <dd className="mt-0.5 flex justify-center">
              <RatingInline value={artisan.ratingAverage} count={artisan.ratingCount} />
            </dd>
          </div>
          <div className="border-x-2 px-1 py-2">
            <dt className="ticket-label text-[9px] text-muted-foreground">Jobs done</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums">{artisan.completedJobsCount}</dd>
          </div>
          <div className="px-1 py-2">
            <dt className="ticket-label text-[9px] text-muted-foreground">Replies</dt>
            <dd className="mt-0.5 truncate text-sm font-bold">
              {response?.replace("about ", "~") ?? "—"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3 perforation">
        <p>
          <span className="block ticket-label text-[9px] text-muted-foreground">Callout fee</span>
          <span className="font-label text-sm font-bold">{price ?? "Ask for a quote"}</span>
        </p>
        <span
          className="flex size-10 items-center justify-center border-2 bg-foreground text-xl text-background transition-colors group-hover:bg-accent group-hover:text-accent-foreground"
          aria-hidden
        >
          →
        </span>
      </div>
    </article>
  );
}

export function ArtisanCardSkeleton() {
  return (
    <div className="card-surface" aria-hidden>
      <div className="h-11 animate-pulse border-b-2 bg-muted" />
      <div className="space-y-4 p-4">
        <div className="flex gap-3">
          <div className="size-14 animate-pulse bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-3/4 animate-pulse bg-muted" />
            <div className="h-3 w-1/2 animate-pulse bg-muted" />
          </div>
        </div>
        <div className="h-14 animate-pulse bg-muted" />
      </div>
      <div className="h-16 perforation" />
    </div>
  );
}
