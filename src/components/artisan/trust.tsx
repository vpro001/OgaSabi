import { BadgeCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER_LABEL, TRUST_COMPONENT } from "@/lib/format";
import { type TrustTier } from "@/lib/types";

const TIER_STYLE: Record<TrustTier, string> = {
  NEW: "bg-tier-new/12 text-tier-new ring-tier-new/30",
  TRUSTED: "bg-tier-trusted/12 text-tier-trusted ring-tier-trusted/30",
  HIGHLY_TRUSTED: "bg-tier-highly-trusted/12 text-tier-highly-trusted ring-tier-highly-trusted/30",
  TOP_RATED: "bg-tier-top-rated/15 text-tier-top-rated ring-tier-top-rated/40",
};

export function TrustBadge({
  tier,
  score,
  provisional,
  className,
}: {
  tier: TrustTier;
  score: number;
  provisional?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-label text-xs font-bold whitespace-nowrap ring-1 ring-inset",
        TIER_STYLE[tier],
        className,
      )}
      title={
        provisional
          ? "Provisional: fewer than 3 completed jobs so far"
          : `Trust score ${Math.round(score)} out of 100`
      }
    >
      <span className="tabular-nums">{Math.round(score)}</span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      {provisional ? "New on OgaSabi" : TIER_LABEL[tier]}
    </span>
  );
}

export function VerifiedMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-semibold text-success", className)}
    >
      <BadgeCheck className="size-4" aria-hidden />
      ID verified
    </span>
  );
}

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            n <= Math.round(value) ? "fill-accent text-accent" : "fill-muted text-muted",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function RatingInline({ value, count }: { value: number | null; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="size-4 fill-accent text-accent" aria-hidden />
      <span className="font-bold tabular-nums">{value != null ? value.toFixed(1) : "New"}</span>
      {count > 0 && <span className="text-muted-foreground">({count})</span>}
    </span>
  );
}

/** Per-component bars: shows exactly where a score comes from. */
export function TrustBreakdown({
  components,
  max,
}: {
  components: Record<string, number>;
  max: Record<string, number>;
}) {
  const penalties = components.penalties ?? 0;
  return (
    <dl className="space-y-3.5">
      {Object.entries(max).map(([key, limit]) => {
        const points = components[key] ?? 0;
        const meta = TRUST_COMPONENT[key];
        return (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <dt className="font-medium" title={meta?.help}>
                {meta?.label ?? key}
              </dt>
              <dd className="font-label text-xs text-muted-foreground tabular-nums">
                <span className="font-bold text-foreground">{points}</span> / {limit}
              </dd>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${Math.min(100, (points / limit) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
      {penalties > 0 && (
        <div className="flex items-baseline justify-between gap-3 border-t pt-3 text-sm">
          <dt className="font-medium text-destructive">Upheld complaints and lost disputes</dt>
          <dd className="font-label text-xs font-bold text-destructive tabular-nums">
            −{penalties}
          </dd>
        </div>
      )}
    </dl>
  );
}
