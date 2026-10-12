"use client";

interface TrustMetric {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}

const trustMetrics: TrustMetric[] = [
  {
    icon: <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>,
    value: "₦142,500,000+",
    label: "Escrow Protected",
    color: "text-[#fe932c]",
  },
  {
    icon: <span className="material-symbols-outlined text-[20px]">timer</span>,
    value: "3.4 Minutes",
    label: "Average Response Time",
    color: "text-emerald-300",
  },
  {
    icon: <span className="material-symbols-outlined text-[20px]">verified</span>,
    value: "99.2%",
    label: "Dispute-Free Completion",
    color: "text-[#ffdcc3]",
  },
  {
    icon: <span className="material-symbols-outlined text-[20px]">policy</span>,
    value: "CAC & NDPR",
    label: "Certified Sovereign Audit",
    color: "text-teal-300",
  },
];

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-[#012212] via-[#04331b] to-[#0a4224] pt-12 pb-24 text-white md:pb-28">
      <div className="pointer-events-none absolute inset-0 adire-pattern opacity-80" />
      <div className="pointer-events-none absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-[420px] w-[420px] rounded-full bg-[#fe932c]/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs text-emerald-100 shadow-inner backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#fe932c] shadow-[0_0_8px_#fe932c]" />
            <span className="font-label text-[11px] font-semibold tracking-wider uppercase">
              Active Escrow Shield v2.4
            </span>
            <span className="text-white/40">•</span>
            <span className="text-emerald-200">Zero Unvetted Freelancers Allowed</span>
          </div>
          <div className="hidden items-center gap-4 font-label text-xs text-emerald-200/90 lg:flex">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#ffdcc3]">verified</span>{" "}
              Strict NIN & BVN Liveness
            </span>
            <span className="h-1 w-1 rounded-full bg-emerald-500/60" />
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#fe932c]">security</span>{" "}
              ₦500k Damage Guarantee Bond
            </span>
          </div>
        </div>

        <div className="mb-10 max-w-4xl space-y-4">
          <h1 className="font-headline text-3xl leading-[1.12] font-extrabold tracking-tight sm:text-5xl lg:text-[58px]">
            Stop asking WhatsApp groups. <br className="hidden sm:inline" />
            Hire verified artisans who{" "}
            <span className="gold-gradient-text drop-shadow-[0_2px_12px_rgba(254,147,44,0.3)]">
              actually sabi work.
            </span>
          </h1>
          <p className="max-w-2xl font-body text-base leading-relaxed font-normal text-emerald-100/85 sm:text-xl">
            Over 4,200 vetted technicians, HVAC specialists, generator mechanics, and plumbers
            across Nigeria. Scored strictly by milestone escrow history, never manipulated reviews.
          </p>
        </div>

        <SearchConsole />
        <TrustMetricsStrip metrics={trustMetrics} />
      </div>
    </section>
  );
}

function SearchConsole() {
  return (
    <div className="text-on-surface relative rounded-2xl border border-white/40 bg-white/95 p-4 shadow-2xl backdrop-blur-xl sm:p-7">
      <div className="mb-4 scrollbar-none flex items-center gap-2 overflow-x-auto border-b border-surface-container-high/60 pb-4">
        <span className="text-outline mr-1 shrink-0 font-label text-[11px] font-bold uppercase">
          Popular:
        </span>
        <button className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 font-label text-xs font-bold text-white shadow-sm">
          <span className="material-symbols-outlined text-[15px] text-[#ffdcc3]">grid_view</span>
          <span>All Trades</span>
        </button>
        <button className="text-on-surface inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-1.5 font-label text-xs font-semibold transition-colors hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[15px] text-[#fe932c]">bolt</span>
          <span>Electrical</span>
        </button>
        <button className="text-on-surface inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-1.5 font-label text-xs font-semibold transition-colors hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[15px] text-teal-600">ac_unit</span>
          <span>AC & Chillers</span>
        </button>
        <button className="text-on-surface inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-1.5 font-label text-xs font-semibold transition-colors hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[15px] text-amber-600">settings</span>
          <span>Generators</span>
        </button>
        <button className="text-on-surface inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-1.5 font-label text-xs font-semibold transition-colors hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[15px] text-sky-600">water_drop</span>
          <span>Plumbing</span>
        </button>
        <button className="text-on-surface inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-1.5 font-label text-xs font-semibold transition-colors hover:bg-surface-container-high">
          <span className="material-symbols-outlined text-[15px] text-stone-600">
            directions_car
          </span>
          <span>Auto Diagnostics</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 sm:gap-4 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <label className="text-on-surface-variant mb-1.5 block font-label text-[11px] font-bold tracking-wider uppercase">
            Describe Issue or Equipment
          </label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-outline pointer-events-none absolute left-3.5 text-[20px]">
              search
            </span>
            <input
              className="border-outline-variant/60 text-on-surface placeholder:text-outline h-12 w-full rounded-xl border bg-surface-container-low pr-4 pl-11 font-body text-sm shadow-inner transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 focus:outline-none"
              id="search-input"
              placeholder="e.g. 'Inverter tripped with error E04' or '3HP AC compressor issue'..."
              type="text"
            />
          </div>
        </div>

        <div className="lg:col-span-3">
          <label className="text-on-surface-variant mb-1.5 block font-label text-[11px] font-bold tracking-wider uppercase">
            Specialty Filter
          </label>
          <div className="relative">
            <select className="border-outline-variant/60 text-on-surface h-12 w-full cursor-pointer appearance-none rounded-xl border bg-surface-container-low pr-10 pl-4 font-body text-sm transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 focus:outline-none">
              <option value="all">Any Qualified Trade</option>
              <option value="ac">HVAC & Cold Storage</option>
              <option value="electrician">Licensed Electrician (COREN)</option>
              <option value="generator">Diesel Generator & Inverter Tech</option>
              <option value="plumbing">Industrial & Home Plumbing</option>
              <option value="carpenter">Carpentry & Precision Fit</option>
            </select>
            <span className="material-symbols-outlined text-outline pointer-events-none absolute top-3 right-3">
              expand_more
            </span>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-on-surface-variant font-label text-[11px] font-bold tracking-wider uppercase">
              Search Radius
            </label>
            <span
              className="rounded bg-emerald-100 px-2 py-0.5 font-label text-xs font-black text-primary"
              id="radius-val"
            >
              5 km
            </span>
          </div>
          <div className="border-outline-variant/60 flex h-12 items-center rounded-xl border bg-surface-container-low px-3">
            <input
              className="w-full cursor-pointer accent-emerald-800"
              id="radius-slider"
              max="25"
              min="1"
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                const el = document.getElementById("radius-val");
                if (el) el.textContent = val + " km";
              }}
              type="range"
              value="5"
            />
          </div>
        </div>

        <div className="flex flex-col justify-end pt-1 lg:col-span-2 lg:pt-0">
          <label className="mb-1.5 hidden font-label text-[11px] text-transparent lg:block">
            Action
          </label>
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-gradient-to-r from-primary to-[#0a4d28] font-label text-xs font-bold tracking-wider text-white uppercase shadow-lg shadow-primary/30 transition-all hover:from-[#083a1e] hover:to-[#0b5e31] active:scale-[0.98]">
            <span>Find Sabi</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TrustMetricsStrip({ metrics }: { metrics: TrustMetric[] }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-center md:grid-cols-4 md:text-left">
      {metrics.map((metric, i) => (
        <div key={i} className="flex items-center justify-center gap-3 md:justify-start">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
            style={{ color: metric.color.replace("text-", "") }}
          >
            {metric.icon}
          </div>
          <div>
            <div className="font-headline text-lg leading-tight font-black text-white">
              {metric.value}
            </div>
            <div className="font-label text-[10px] tracking-wider text-emerald-200/70 uppercase">
              {metric.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
