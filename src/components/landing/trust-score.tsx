"use client";

import { cn } from "@/lib/utils";

export function TrustScoreSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#051e12] py-20 text-white">
      <div className="pointer-events-none absolute -top-32 right-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-[#fe932c]/10 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 font-label text-xs tracking-wider text-emerald-200 uppercase">
            <span className="material-symbols-outlined text-[16px] text-[#fe932c]">balance</span>
            <span>Algorithmic Objectivity</span>
          </div>
          <h2 className="font-headline text-2xl leading-tight font-extrabold tracking-tight sm:text-4xl lg:text-[42px]">
            Why traditional 5-star ratings fail in Nigeria — and how OgaSabi solved it.
          </h2>
          <p className="mt-3 font-body text-base leading-relaxed text-emerald-100/80 sm:text-lg">
            Anyone can pay people to leave fake Google reviews or hype WhatsApp referrals. OgaSabi
            runs continuous Bayesian transaction analytics on bank escrow releases, punctuality GPS
            pings, and post-service warranty integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md sm:p-8 lg:col-span-7">
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="font-headline text-lg font-bold text-white">
                  Score Weight Composition
                </h3>
                <p className="font-label text-xs text-emerald-300">
                  Continuous 100-Point Dynamic Model
                </p>
              </div>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 font-label text-[11px] font-bold text-emerald-300">
                Live Audited
              </div>
            </div>
            <div className="space-y-5">
              <TrustFactor
                color="bg-emerald-400"
                shadowColor="#34d399"
                title="Bayesian Historical Completed Jobs"
                weight="20% Weight"
                barColor="from-emerald-500 to-emerald-300"
                width="20%"
                description="Multi-month execution continuity without idle gap anomalies."
              />
              <TrustFactor
                color="bg-teal-400"
                shadowColor="#2dd4bf"
                title="Milestone Quoted-vs-Actual Accuracy"
                weight="15% Weight"
                barColor="from-teal-500 to-teal-300"
                width="15%"
                description="Completion within initial agreed material bill of quantities (BOQ) with zero rogue upcharges."
              />
              <TrustFactor
                color="bg-red-400"
                shadowColor="#f87171"
                title="No-Show & Late Arrival Penalty Deductions"
                weight="-15% Penalty Cut"
                isPenalty
                barColor="from-red-600 to-red-400"
                width="15%"
                description="Artisans arriving >40 mins late or canceling scheduled callouts suffer immediate automated point slashes."
                titleColor="text-red-300"
                weightColor="text-red-300"
              />
              <TrustFactor
                color="bg-[#fe932c]"
                shadowColor="#fe932c"
                title="14-Day Zero Defect Warranty Record"
                weight="15% Weight"
                barColor="from-[#fe932c] to-[#ffdcc3]"
                width="15%"
                description="Jobs that stand firm for 14 days post-completion without consumer distress or callback claim."
                titleColor="text-[#ffdcc3]"
                weightColor="text-[#fe932c]"
              />
              <MinorFactors />
            </div>
          </div>

          <div className="space-y-4 lg:col-span-5">
            <h3 className="flex items-center justify-between font-headline text-lg font-bold text-white">
              <span>Verified Artisan Badges</span>
              <span className="font-label text-xs text-emerald-300">Automated Tiers</span>
            </h3>
            <TrustTierBadge
              icon={
                <span className="material-symbols-outlined text-[26px]">workspace_premium</span>
              }
              iconBg="from-[#ffd77d] to-[#fe932c]"
              iconTextColor="text-[#002613]"
              borderColor="border-[#fe932c]/50"
              bgFrom="#123824"
              bgTo="#0a2316"
              title="Top Rated Oga"
              score="Score: 90 – 100"
              scoreBg="bg-[#fe932c]"
              scoreTextColor="text-[#002613]"
              description="Elite trade practitioners with 50+ pristine milestone records. Backed by full ₦500,000 collateral indemnity and instant direct customer dispatch."
              hasGlow
            />
            <TrustTierBadge
              icon={<span className="material-symbols-outlined text-[26px]">verified</span>}
              iconBg="bg-emerald-500/20"
              iconTextColor="text-emerald-300"
              iconBorder="border-emerald-400/30"
              borderColor="border-emerald-500/30"
              bgFrom="transparent"
              bgTo="transparent"
              bgOpacity="bg-white/5"
              title="Trusted Sabi"
              score="Score: 75 – 89"
              scoreBg="bg-emerald-500/20"
              scoreTextColor="text-emerald-200"
              scoreBorder="border-emerald-400/30"
              description="Proven technicians with cleared biometric background checks, strict on-time arrival metrics, and greater than 95% project completion rate."
            />
            <TrustTierBadge
              icon={<span className="material-symbols-outlined text-[24px]">shield</span>}
              iconBg="bg-white/10"
              iconTextColor="text-white/70"
              borderColor="border-white/10"
              bgFrom="transparent"
              bgTo="transparent"
              bgOpacity="bg-white/5"
              title="Probationary Sabi"
              score="Score: 0 – 74"
              scoreBg="bg-white/10"
              scoreTextColor="text-white/80"
              description="NIN verified with physical audit passed. Eligible solely for routine inspection calls under mandatory 100% escrow holds until 10 successful deliveries."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustFactor({
  color,
  shadowColor,
  title,
  weight,
  barColor,
  width,
  description,
  isPenalty = false,
  titleColor = "text-white",
  weightColor = "text-emerald-300",
}: {
  color: string;
  shadowColor: string;
  title: string;
  weight: string;
  barColor: string;
  width: string;
  description: string;
  isPenalty?: boolean;
  titleColor?: string;
  weightColor?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-label text-xs sm:text-sm">
        <span className="flex items-center gap-2 font-bold" style={{ color: titleColor }}>
          <span
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: color.replace("bg-", ""),
              boxShadow: `0 0 8px ${shadowColor}`,
            }}
          />
          {title}
        </span>
        <span className="font-black" style={{ color: weightColor }}>
          {weight}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r"
          style={{ width, background: barColor }}
        />
      </div>
      <p
        className="mt-1 font-body text-[11px]"
        style={{ color: isPenalty ? "rgb(248 113 113 / 0.7)" : "rgb(167 243 208 / 0.7)" }}
      >
        {description}
      </p>
    </div>
  );
}

function MinorFactors() {
  const factors = [
    { label: "NIN & BVN Match", value: "10%" },
    { label: "<5m Fast Dispatch", value: "10%" },
    { label: "Repeat Customer", value: "8%" },
    { label: "Clean Escrow Log", value: "7%" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4">
      {factors.map((factor, i) => (
        <div key={i} className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
          <div className="font-label text-base font-black text-emerald-300">{factor.value}</div>
          <div className="font-label text-[10px] text-emerald-200/70 uppercase">{factor.label}</div>
        </div>
      ))}
    </div>
  );
}

interface TrustTierBadgeProps {
  icon: React.ReactNode;
  iconBg: string;
  iconTextColor: string;
  iconBorder?: string;
  borderColor: string;
  bgFrom: string;
  bgTo: string;
  bgOpacity?: string;
  title: string;
  score: string;
  scoreBg: string;
  scoreTextColor: string;
  scoreBorder?: string;
  description: string;
  hasGlow?: boolean;
}

function TrustTierBadge({
  icon,
  iconBg,
  iconTextColor,
  iconBorder,
  borderColor,
  bgFrom,
  bgTo,
  bgOpacity,
  title,
  score,
  scoreBg,
  scoreTextColor,
  scoreBorder,
  description,
  hasGlow,
}: TrustTierBadgeProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 shadow-lg",
        bgOpacity,
        borderColor,
        hasGlow && "bg-gradient-to-br",
      )}
      style={{
        background: hasGlow ? `linear-gradient(to bottom right, ${bgFrom}, ${bgTo})` : undefined,
      }}
    >
      {hasGlow && (
        <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full bg-[#fe932c]/10 blur-xl" />
      )}
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold",
            iconBg,
            iconTextColor,
            iconBorder,
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-headline text-base font-bold text-white">{title}</h4>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 font-label text-xs font-bold",
                scoreBg,
                scoreTextColor,
                scoreBorder,
              )}
            >
              {score}
            </span>
          </div>
          <p className="mt-1.5 font-body text-xs leading-relaxed text-emerald-100/80">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
