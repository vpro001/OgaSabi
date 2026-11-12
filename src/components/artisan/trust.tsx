import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIER_LABEL, TRUST_COMPONENT } from "@/lib/format";
import { type TrustTier } from "@/lib/types";

const TIER_TEXT: Record<TrustTier, string> = {
  NEW: "text-tier-new",
  TRUSTED: "text-tier-trusted",
  HIGHLY_TRUSTED: "text-tier-highly-trusted",
  TOP_RATED: "text-tier-top-rated",
};

/** Compact score: the number in an ink block, the tier beside it. */
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
        "inline-flex items-stretch border-2 border-foreground font-label text-[11px] leading-none font-bold tracking-wider whitespace-nowrap uppercase",
        className,
      )}
      title={
        provisional
          ? "Provisional: fewer than 3 completed jobs so far"
          : `Trust score ${Math.round(score)} out of 100`
      }
    >
      <span className="flex items-center bg-foreground px-1.5 py-1 text-sm text-background tabular-nums">
        {Math.round(score)}
      </span>
      <span className={cn("flex items-center bg-card px-1.5", TIER_TEXT[tier])}>
        {provisional ? "New here" : TIER_LABEL[tier]}
      </span>
    </span>
  );
}

/** A rubber stamp, pressed slightly crooked. */
export function Stamp({
  children,
  tone = "success",
  tilt = -7,
  animate,
  className,
}: {
  children: React.ReactNode;
  tone?: "success" | "signal" | "ink";
  tilt?: number;
  animate?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stamp",
        tone === "success"
          ? "text-success"
          : tone === "signal"
            ? "text-secondary"
            : "text-foreground",
        animate && "animate-stamp",
        className,
      )}
      style={{ "--stamp-tilt": `${tilt}deg` } as React.CSSProperties}
    >
      {children}
    </span>
  );
}

export function VerifiedMark({ className }: { className?: string }) {
  return (
    <Stamp className={cn("text-xs", className)} tilt={-4}>
      ✓ ID verified
    </Stamp>
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
            "size-4 text-foreground",
            n <= Math.round(value) ? "fill-accent" : "fill-transparent opacity-30",
          )}
          strokeWidth={2}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function RatingInline({ value, count }: { value: number | null; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-label text-sm">
      <Star className="size-4 fill-accent text-foreground" strokeWidth={2} aria-hidden />
      <span className="font-bold tabular-nums">{value != null ? value.toFixed(1) : "—"}</span>
      {count > 0 && <span className="text-muted-foreground">/{count}</span>}
    </span>
  );
}

/**
 * The trust score as an analog meter, like the dial on a generator: 0 on the left, 100 on the
 * right, a red needle. The reading is also printed as a number, so the dial is never the only cue.
 */
export function TrustGauge({
  score,
  tier,
  provisional,
  className,
  onDark,
}: {
  score: number;
  tier: TrustTier;
  provisional?: boolean;
  className?: string;
  onDark?: boolean;
}) {
  const value = Math.max(0, Math.min(100, score));
  const angle = -90 + (value / 100) * 180;
  const ticks = Array.from({ length: 21 }, (_, i) => i * 5);
  const point = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)] as const;
  };
  const stroke = onDark ? "var(--paper)" : "var(--foreground)";
  return (
    <figure className={cn("relative", className)}>
      <svg
        viewBox="0 0 200 118"
        className="block w-full"
        role="img"
        aria-label={`Trust score ${Math.round(value)} out of 100, ${provisional ? "provisional" : TIER_LABEL[tier]}`}
      >
        {/* The band from 70 up is where "highly trusted" starts. */}
        <path
          d={`M ${point(-90 + 126, 86).join(" ")} A 86 86 0 0 1 ${point(90, 86).join(" ")}`}
          fill="none"
          stroke="var(--danfo)"
          strokeWidth="12"
        />
        <path d="M 14 100 A 86 86 0 0 1 186 100" fill="none" stroke={stroke} strokeWidth="2.5" />
        {ticks.map((t) => {
          const deg = -90 + (t / 100) * 180;
          const major = t % 25 === 0;
          const [x1, y1] = point(deg, 86);
          const [x2, y2] = point(deg, major ? 70 : 78);
          return (
            <line
              key={t}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={major ? 3 : 1.5}
            />
          );
        })}
        {[0, 25, 50, 75, 100].map((t) => {
          const [x, y] = point(-90 + (t / 100) * 180, 58);
          return (
            <text
              key={t}
              x={x}
              y={y + 3}
              textAnchor="middle"
              fontSize="9"
              fontWeight="700"
              fill={stroke}
              style={{ fontFamily: "var(--font-label)" }}
            >
              {t}
            </text>
          );
        })}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "100px 100px",
            animation: "needle-in 900ms cubic-bezier(0.2, 1.3, 0.4, 1) both",
          }}
        >
          <polygon points="97,100 100,20 103,100" fill="var(--signal)" />
        </g>
        <circle cx="100" cy="100" r="8" fill={stroke} />
        <circle cx="100" cy="100" r="2.5" fill="var(--danfo)" />
      </svg>
      <figcaption className="-mt-1 flex items-end justify-center gap-2">
        <span className="font-display text-6xl leading-[0.8] tabular-nums">
          {Math.round(value)}
        </span>
        <span className="pb-0.5 ticket-label opacity-70">
          / 100
          <br />
          {provisional ? "provisional" : TIER_LABEL[tier]}
        </span>
      </figcaption>
    </figure>
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
    <dl className="border-t-2">
      {Object.entries(max).map(([key, limit]) => {
        const points = components[key] ?? 0;
        const meta = TRUST_COMPONENT[key];
        return (
          <div key={key} className="border-b py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <dt className="font-semibold" title={meta?.help}>
                {meta?.label ?? key}
              </dt>
              <dd className="font-label text-xs tabular-nums">
                <span className="text-sm font-bold">{points}</span>
                <span className="text-muted-foreground">/{limit}</span>
              </dd>
            </div>
            {/* One segment per available point, filled like tally boxes on a job sheet. */}
            <div className="flex gap-px" aria-hidden>
              {Array.from({ length: limit }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-2.5 flex-1 border border-foreground",
                    i < Math.round(points) ? "bg-foreground" : "bg-transparent opacity-40",
                  )}
                />
              ))}
            </div>
          </div>
        );
      })}
      {penalties > 0 && (
        <div className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
          <dt className="font-semibold text-destructive">Upheld complaints and lost disputes</dt>
          <dd className="font-label text-sm font-bold text-destructive tabular-nums">
            −{penalties}
          </dd>
        </div>
      )}
    </dl>
  );
}
