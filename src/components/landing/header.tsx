"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface AnnouncementBarProps {
  artisanCount?: number;
}

export function AnnouncementBar({ artisanCount = 4289 }: AnnouncementBarProps) {
  return (
    <div className="border-b border-[#0f4327]/60 bg-[#031d10] px-4 py-2 text-[#c6ebd2]">
      <div className="mx-auto flex max-w-7xl items-center justify-between font-label text-[11px] sm:text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fe932c] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#fe932c]" />
          </span>
          <span className="font-medium tracking-wide text-emerald-100/90">
            Over{" "}
            <strong className="font-bold text-white">
              {artisanCount.toLocaleString()} NIN-verified artisans
            </strong>{" "}
            active in Lagos, Abuja & Port Harcourt
            <span className="mx-1.5 hidden text-emerald-400/60 sm:inline">•</span>
            <span className="hidden text-[#ffdcc3] sm:inline">
              Escrow Protected by CBN-licensed custody
            </span>
          </span>
        </div>
        <div className="hidden items-center gap-5 text-emerald-200/80 md:flex">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#ffdcc3]">
              verified_user
            </span>
            <span>NDPR & CAC Certified</span>
          </span>
          <span className="h-3 w-px bg-emerald-800" />
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-emerald-300">
              headset_mic
            </span>
            <span>
              24/7 Priority Desk: <strong className="text-white">+234 (01) 888 7224</strong>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  activePath?: string;
}

export function Header({ activePath = "find-artisans" }: HeaderProps) {
  const navItems = [
    {
      path: "find-artisans",
      label: "Find Artisans",
      icon: <span className="h-1.5 w-1.5 rounded-full bg-secondary-container" />,
    },
    { path: "how-trust-score-works", label: "Trust Score Formula" },
    { path: "emergency-repairs", label: "25m Rapid Dispatch" },
    { path: "become-an-oga-sabi", label: "Artisan Portal" },
  ];

  return (
    <div className="border-b border-surface-container-high/70 bg-white/90 shadow-sm backdrop-blur-md transition-all duration-200">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="group flex items-center gap-2.5" data-path="find-artisans">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary-container p-2 shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[22px] text-white">handyman</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline text-xl leading-none font-black tracking-tight text-primary sm:text-2xl">
                OgaSabi
              </span>
              <span className="font-label text-[9px] font-bold tracking-widest text-secondary uppercase">
                Verified Nigeria
              </span>
            </div>
          </Link>
          <div className="border-outline-variant/40 text-on-surface group hidden cursor-pointer items-center gap-1.5 rounded-full border bg-surface-container px-3 py-1.5 shadow-xs transition-colors hover:border-primary/40 sm:flex">
            <span className="material-symbols-outlined text-[17px] text-secondary-container group-hover:animate-bounce">
              location_on
            </span>
            <span className="text-on-surface font-label text-xs font-semibold">
              Lekki Phase 1, Lagos
            </span>
            <span className="material-symbols-outlined text-outline text-[16px]">
              keyboard_arrow_down
            </span>
          </div>
        </div>

        <nav
          className="hidden items-center gap-1.5 lg:flex"
          data-active-classes="bg-primary text-white font-semibold"
        >
          {navItems.map((item) => {
            const isActive = item.path === activePath;
            return (
              <Link
                key={item.path}
                href={`#${item.path}`}
                className={cn(
                  "rounded-lg px-3.5 py-2 font-label text-xs font-semibold tracking-wider uppercase transition-colors",
                  isActive
                    ? "flex items-center gap-1.5 bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-primary",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="text-on-surface-variant relative rounded-xl p-2 transition-colors hover:bg-surface-container hover:text-primary"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ba1a1a] font-label text-[9px] font-bold text-white ring-2 ring-white">
              2
            </span>
          </button>

          <div className="flex items-center gap-2 border-l border-surface-container-high pl-1 sm:pl-2">
            <div className="relative">
              <div className="h-9 w-9 rounded-full bg-surface-container-high object-cover ring-2 ring-emerald-500/30" />
              <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                <span className="material-symbols-outlined text-[9px] font-black">check</span>
              </span>
            </div>
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-on-surface font-label text-xs leading-tight font-bold">
                Chidi O.
              </span>
              <span className="font-label text-[10px] font-semibold text-emerald-800">
                Tier 1 Verified
              </span>
            </div>
          </div>

          <Link
            href="#post-request"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl border border-[#fe932c]/50 bg-gradient-to-r from-primary via-[#083e20] to-[#012211] px-4 py-2.5 font-label text-xs font-bold text-white shadow-md shadow-primary/20 transition-all hover:scale-[1.02] hover:from-[#0a4d28] hover:to-[#012211] active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-[#ffdcc3] transition-transform group-hover:rotate-45">
                add_circle
              </span>
              <span>Post Request</span>
            </span>
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-all duration-1000 group-hover:translate-x-full" />
          </Link>
        </div>
      </div>
    </div>
  );
}
