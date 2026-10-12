"use client";

export function GuaranteeBanner() {
  return (
    <section className="w-full bg-background pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-[#002613] via-[#05321a] to-[#00170a] p-8 text-white shadow-2xl sm:p-12">
          <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-[#fe932c]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative z-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ffdcc3] px-3.5 py-1 font-label text-xs font-bold tracking-wider text-[#663500] uppercase shadow-sm">
                <span className="material-symbols-outlined text-[16px] text-[#fe932c]">
                  verified
                </span>
                <span>₦500,000 Property Damage Indemnity Bond</span>
              </div>
              <h3 className="font-headline text-2xl leading-tight font-extrabold tracking-tight text-white sm:text-4xl">
                Safety, Identity Verification & Data Privacy Guaranteed
              </h3>
              <p className="max-w-2xl font-body text-sm leading-relaxed text-emerald-100/80 sm:text-base">
                Every artisan on OgaSabi undergoes biometric facial matching against federal
                databases (NIN/BVN), physical workshop audits, and police character verification.
                Your home address and phone contact are never broadcasted publicly.
              </p>
              <div className="flex flex-wrap items-center gap-6 pt-2 font-label text-xs text-emerald-200 sm:text-sm">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">
                    verified_user
                  </span>
                  <span>NDPR Certified Compliant</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">
                    lock
                  </span>
                  <span>256-Bit Bank Grade Encryption</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">
                    gavel
                  </span>
                  <span>Neutral Dispute Arbitration Desk</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-4">
              <button className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffd77d] via-[#fe932c] to-[#e87a10] font-label text-sm font-extrabold tracking-wider text-[#002613] uppercase shadow-xl shadow-[#fe932c]/20 transition-all hover:opacity-95 active:scale-[0.98]">
                <span>Post a Repair Request</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <a
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 text-center font-label text-xs font-bold text-white transition-colors hover:bg-white/15"
                href="#"
              >
                <span>Are you a master artisan? Apply to be vetted</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
