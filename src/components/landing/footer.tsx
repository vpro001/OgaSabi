export function Footer() {
  return (
    <footer className="text-on-surface w-full border-t border-surface-container-high/80 bg-white pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-surface-container-high pb-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary-container p-2 text-white">
                <span className="material-symbols-outlined text-[20px]">handyman</span>
              </div>
              <span className="font-headline text-2xl font-black tracking-tight text-primary">
                OgaSabi
              </span>
            </div>
            <p className="text-on-surface-variant max-w-sm font-body text-sm leading-relaxed">
              Nigeria&rsquo;s highest-trust infrastructure connecting households and businesses with
              verified electricians, HVAC technicians, mechanics, and plumbers.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 font-label text-xs text-emerald-900">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                <span className="material-symbols-outlined text-[15px] text-emerald-700">
                  verified
                </span>
                <span>NIN & BVN Verified</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                <span className="material-symbols-outlined text-[15px] text-emerald-700">
                  security
                </span>
                <span>CBN Custody Escrow</span>
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-on-surface mb-4 font-label text-xs font-bold tracking-wider uppercase">
              Core Trades
            </h4>
            <ul className="text-on-surface-variant space-y-2.5 font-body text-sm">
              <li>
                <a className="transition-colors hover:text-primary" href="#find-artisans">
                  Generators & Inverters
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#find-artisans">
                  Licensed Electricians (COREN)
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#find-artisans">
                  Plumbing & Water Systems
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#find-artisans">
                  AC Chillers & Refrigeration
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#find-artisans">
                  Custom Woodwork & Fittings
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#find-artisans">
                  Auto Diagnostics & Mechanics
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-on-surface mb-4 font-label text-xs font-bold tracking-wider uppercase">
              Trust & Safety
            </h4>
            <ul className="text-on-surface-variant space-y-2.5 font-body text-sm">
              <li>
                <a className="transition-colors hover:text-primary" href="#how-trust-score-works">
                  Bayesian Trust Score Framework
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#guarantee">
                  ₦500,000 Safety Indemnity
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#escrow">
                  Escrow Milestone Rules
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#disputes">
                  Dispute Arbitration Desk
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#ethics">
                  Artisan Code of Ethics
                </a>
              </li>
              <li>
                <a className="transition-colors hover:text-primary" href="#reviews">
                  Customer Review Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-on-surface mb-4 font-label text-xs font-bold tracking-wider uppercase">
              Active Hubs
            </h4>
            <ul className="text-on-surface-variant space-y-3 font-body text-xs">
              <li>
                <strong className="text-on-surface block font-label">Lagos Mega Hub:</strong>
                <span>Lekki, Ikoyi, Victoria Island, Ikeja GRA, Yaba</span>
              </li>
              <li>
                <strong className="text-on-surface block font-label">Abuja FCT:</strong>
                <span>Maitama, Wuse II, Garki, Jabi, Guzape</span>
              </li>
              <li>
                <strong className="text-on-surface block font-label">Port Harcourt:</strong>
                <span>GRA Phase 2, Peter Odili, Trans-Amadi</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="text-on-surface-variant flex flex-col items-center justify-between gap-4 pt-8 font-label text-xs sm:flex-row">
          <p>
            © 2025 OgaSabi Technologies Ltd. Built for Nigerian commerce with integrity & escrow
            safety.
          </p>
          <div className="flex items-center gap-6">
            <a className="transition-colors hover:text-primary" href="#privacy">
              Privacy Policy
            </a>
            <a className="transition-colors hover:text-primary" href="#terms">
              Terms of Service
            </a>
            <a className="transition-colors hover:text-primary" href="#ndpr">
              NDPR Compliance
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
