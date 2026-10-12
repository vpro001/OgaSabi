"use client";

import Image from "next/image";

interface ArtisanCardData {
  id: string;
  name: string;
  company: string;
  trade: string;
  tradeIcon: string;
  tradeColor: string;
  trustScore: number;
  trustTier: "Top Rated Oga" | "Master Sabi" | "Trusted Sabi" | "Probationary Sabi";
  rating: number;
  reviewCount: number;
  completionRate: string;
  experience: string;
  distance: string;
  responseTime: string;
  availability: "Available now" | "In 30 mins" | "Today slot";
  availabilityColor: string;
  calloutRange: string;
  avatar: string;
  avatarRingColor: string;
  isOnline: boolean;
}

const artisans: ArtisanCardData[] = [
  {
    id: "1",
    name: "Engr. Babatunde Alabi",
    company: "Alabi CoolCare Engineering",
    trade: "AC & Cold Storage",
    tradeIcon: "ac_unit",
    tradeColor: "bg-teal-50 text-teal-800 border-teal-200/50",
    trustScore: 96,
    trustTier: "Top Rated Oga",
    rating: 4.9,
    reviewCount: 142,
    completionRate: "99.2%",
    experience: "12 yrs exp",
    distance: "1.8 km away",
    responseTime: "3 mins",
    availability: "Available now",
    availabilityColor: "bg-emerald-100 text-emerald-800",
    calloutRange: "₦4,500 – ₦12,000",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDo-MpWQMjFZM_mEN-PpMmvOVBtspL1o41Z2FJ5oVVX6uPIsQXwFaJJLwl0DIUZSmqsa2k-zx-kLxHo8onB_OrfTcJWEp-e7ttK5WJAycIEpxtkv4bMEiPnJrwofz2iyaY7m3a_younHFtBM6e-Z24OnmDm3P0njhVp0dx2osJerQwDlhEINBv_kjBU0GYyM7ukK0g_7v6tS9aI2-ql58GfDtU4mrofemYm4yAfbAR-WGihE9KJl_dB",
    avatarRingColor: "ring-emerald-600/30",
    isOnline: true,
  },
  {
    id: "2",
    name: 'Godwin "Sabi" Okafor',
    company: "Light & Power Electro-Tech",
    trade: "Licensed Electrician",
    tradeIcon: "bolt",
    tradeColor: "bg-amber-50 text-amber-900 border-amber-200/50",
    trustScore: 94,
    trustTier: "Master Sabi",
    rating: 4.8,
    reviewCount: 98,
    completionRate: "98.4%",
    experience: "NEMSA Cert",
    distance: "2.4 km away",
    responseTime: "5 mins",
    availability: "In 30 mins",
    availabilityColor: "bg-amber-100 text-amber-900",
    calloutRange: "₦3,500 – ₦8,000",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB1Vw7rWJM-fKgL2ePtdQxpKnQr3Vq3Sf-5rlvkdylMc8DKeM4rf1rKtIIndOx8ZW0k2eGrAjpQ6hp9wDbcdNSn8VqqrnCn4KMkX-FSpJKu4KVsSGI31xvWz-ojLLPdrH449pyJ_eCOaTpFnLBFNaMwGeYcbHrz4Z_vKvxE_0qmBhPDF8IdV3xwUlTiDISe4RIyHQlLKSFRCcm0Ul4eQFkgUWlU0GKv7bJSBL8jOiEYzx4UEZA1rIXn",
    avatarRingColor: "ring-amber-500/30",
    isOnline: false,
  },
  {
    id: "3",
    name: "Musa Ibrahim",
    company: "Tiger & Perkins Power Solutions",
    trade: "Mikano & Diesel Tech",
    tradeIcon: "settings",
    tradeColor: "bg-stone-100 text-stone-900 border-stone-200",
    trustScore: 91,
    trustTier: "Trusted Sabi",
    rating: 4.9,
    reviewCount: 67,
    completionRate: "97.0%",
    experience: "15 yrs exp",
    distance: "3.1 km away",
    responseTime: "4 mins",
    availability: "Available now",
    availabilityColor: "bg-emerald-100 text-emerald-800",
    calloutRange: "₦5,000 – ₦15,000",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB8WDadt-A7-uB6N2bS8M9V5BKQHqPnDHfofTXiCT5QwqvBmUpcQIrQqn8X6_PX48k7mVyDiPW8rIzDWR1S0nqWKqaH-7sKUmO5AURHPDznr4b-RELDhop3aQN9LpuqLpjoTmhnOTMlPyV9l_zF_aiDtHigt3rKY3wXzTExr1QpKALw9DEUufuLs0iwdRfJWnJMh7odq5qMWuNhd_fmrK7GOJH08bFIOZc6d9ru2_oN7thGpitT_uZF",
    avatarRingColor: "ring-emerald-600/30",
    isOnline: true,
  },
  {
    id: "4",
    name: "Chioma Umeh",
    company: "Supreme Waterworks & Borehole",
    trade: "Water Systems & PPR",
    tradeIcon: "water_drop",
    tradeColor: "bg-sky-50 text-sky-900 border-sky-200/50",
    trustScore: 88,
    trustTier: "Trusted Sabi",
    rating: 4.7,
    reviewCount: 45,
    completionRate: "96.8%",
    experience: "Master Plumber",
    distance: "4.0 km away",
    responseTime: "6 mins",
    availability: "Today slot",
    availabilityColor: "bg-surface-container-high text-on-surface",
    calloutRange: "₦4,000 – ₦9,000",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA9VfPQfUaQ-eVSf7H78rI01xZrkS2kQHSOvJJF78mXzCDA88pYCwuSXAHtN-jnP7nhIReC1AEnTeL7zWrrVwpddncwJvCkqhNMzH8D9mnGsASsskvFD4tySmW8t575dBJb8ts-k4Ob9NdkLK8xXykPd-km3lrJLZtthRYDmEdJaVJIGG8PmCj9hypGm1XlKTXhbZKr5zmuwCJY4R73ZjAqZRoxlMewPpTZnZwM0PGd6kqjDCoeP3-Y",
    avatarRingColor: "ring-emerald-600/30",
    isOnline: false,
  },
];

function RadialGauge({ score, size = 56 }: { score: number; size?: number }) {
  const radius = 15.9155;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative flex h-[56px] w-[56px] items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-surface-container"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <path
          className="text-primary"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="3.5"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-on-surface font-label text-sm font-black">{score}</span>
      </div>
    </div>
  );
}

function ArtisanCard({ artisan }: { artisan: ArtisanCardData }) {
  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,38,19,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_-6px_rgba(0,38,19,0.16)]">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="relative">
            <div
              className="h-16 w-16 overflow-hidden rounded-2xl shadow-md ring-2"
              style={{ borderColor: artisan.avatarRingColor }}
            >
              <Image
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                alt={artisan.name}
                src={artisan.avatar}
                width={64}
                height={64}
                sizes="64px"
              />
            </div>
            <span
              className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-md ring-2 ring-white"
              title="NIN Verified + Biometric Liveness Passed"
            >
              <span className="material-symbols-outlined text-[12px] font-black">verified</span>
            </span>
            {artisan.isOnline && (
              <span className="absolute -top-1 -left-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </span>
            )}
            {!artisan.isOnline && (
              <span className="absolute -top-1 -left-1 flex h-3 w-3">
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <RadialGauge score={artisan.trustScore} />
            <span className="mt-0.5 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-label text-[9px] font-extrabold tracking-tight text-emerald-900 uppercase">
              {artisan.trustTier}
            </span>
          </div>
        </div>

        <div>
          <div
            className="mb-1 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-label text-[11px] font-bold"
            style={{
              backgroundColor:
                artisan.tradeColor.split(" ")[0]?.replace("bg-", "") || "transparent",
              borderColor:
                artisan.tradeColor.split(" ")[2]?.replace("border-", "") || "transparent",
              color: artisan.tradeColor.split(" ")[1]?.replace("text-", "") || "inherit",
            }}
          >
            <span className="material-symbols-outlined text-[13px]">{artisan.tradeIcon}</span>
            <span>{artisan.trade}</span>
          </div>
          <h3 className="text-on-surface font-headline text-base leading-snug font-extrabold transition-colors group-hover:text-primary">
            {artisan.name}
          </h3>
          <p className="text-on-surface-variant mt-0.5 flex items-center gap-1 font-body text-xs">
            <span>{artisan.company}</span>
            <span className="text-outline-variant">•</span>
            <span className="font-semibold text-emerald-700">{artisan.experience}</span>
          </p>
        </div>

        <div className="border-outline-variant/30 grid grid-cols-2 gap-2 rounded-xl border bg-surface-container-low/70 p-2.5 text-xs">
          <div>
            <div className="text-outline font-label text-[10px] uppercase">Milestones</div>
            <div className="text-on-surface flex items-center gap-1 font-label font-bold">
              <span className="text-[#fe932c]">★</span> {artisan.rating}{" "}
              <span className="text-outline text-[11px] font-normal">({artisan.reviewCount})</span>
            </div>
          </div>
          <div>
            <div className="text-outline font-label text-[10px] uppercase">Completion</div>
            <div className="font-label font-black text-primary">{artisan.completionRate}</div>
          </div>
        </div>

        <div className="text-on-surface-variant space-y-1.5 font-label text-xs">
          <div className="flex items-center justify-between">
            <span className="text-on-surface inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-emerald-700">
                near_me
              </span>
              <span>{artisan.distance}</span>
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor:
                  artisan.availabilityColor.split(" ")[0]?.replace("bg-", "") || "transparent",
                color: artisan.availabilityColor.split(" ")[1]?.replace("text-", "") || "inherit",
              }}
            >
              {artisan.availability}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-outline text-[13px]">schedule</span>{" "}
              Avg arrival response:
            </span>
            <strong className="text-on-surface font-bold">{artisan.responseTime}</strong>
          </div>
        </div>

        <div className="border-t border-surface-container-high pt-2">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="text-outline font-label text-[10px] uppercase">
              Standard Diagnostic / Callout
            </span>
            <span className="text-[10px] font-bold text-emerald-800">Zero markups</span>
          </div>
          <div className="font-headline text-lg font-black text-primary">
            {artisan.calloutRange}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary font-label text-xs font-bold text-white shadow-sm transition-all group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary-container hover:bg-[#083a1e]">
          <span>Request Inspection</span>
          <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </button>
      </div>
    </article>
  );
}

export function ArtisanDirectory() {
  return (
    <section className="relative z-20 -mt-8 w-full bg-background py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/80 px-3 py-1 text-emerald-900">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
              <span className="font-label text-[11px] font-bold tracking-wider uppercase">
                Live Radar & Instant Dispatch
              </span>
            </div>
            <h2 className="text-on-surface font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
              Verified Artisans Near Lekki Phase 1
            </h2>
            <p className="text-on-surface-variant mt-1 font-body text-sm">
              Real-time geolocation filtered by biometric validation and continuous milestone escrow
              completion.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-on-surface-variant hidden font-label text-xs sm:inline">
              Sort by:{" "}
              <strong className="text-on-surface font-bold">Proximity + Trust Score</strong>
            </span>
            <button className="border-outline-variant/60 text-on-surface inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-label text-xs font-semibold shadow-xs transition-all hover:border-primary/40 hover:bg-surface-container">
              <span className="material-symbols-outlined text-[18px] text-secondary">tune</span>
              <span>Advanced Filter</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {artisans.map((artisan) => (
            <ArtisanCard key={artisan.id} artisan={artisan} />
          ))}
        </div>

        <EmergencyStrip />
      </div>
    </section>
  );
}

function EmergencyStrip() {
  return (
    <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-emerald-900/5 to-primary/5 p-5 md:flex-row">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#fe932c] to-[#904d00] text-white shadow-md">
          <span className="material-symbols-outlined text-[24px]">electric_bolt</span>
        </div>
        <div>
          <div className="text-on-surface font-headline text-base font-bold">
            Emergency burst pipe or electrical fire hazard?
          </div>
          <p className="text-on-surface-variant font-body text-xs sm:text-sm">
            Rapid Dispatch team bypasses search and connects you to nearest vetted responder within
            25 minutes in Lekki, Ikoyi & Victoria Island.
          </p>
        </div>
      </div>
      <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#083e20] px-6 py-3 font-label text-xs font-bold tracking-wider whitespace-nowrap text-white uppercase shadow-md transition-all hover:bg-primary-container md:w-auto">
        <span className="material-symbols-outlined text-[16px] text-[#ffdcc3]">bolt</span>
        <span>Trigger 25-Min Emergency Callout</span>
      </button>
    </div>
  );
}
