import Link from "next/link";

const COLUMNS = [
  {
    title: "Customers",
    links: [
      ["Find artisans", "/search"],
      ["How trust works", "/how-trust-works"],
      ["My requests", "/requests"],
      ["Help and safety", "/help"],
    ],
  },
  {
    title: "Artisans",
    links: [
      ["Join as an artisan", "/artisan/onboarding"],
      ["Artisan dashboard", "/artisan"],
      ["Get verified", "/artisan/verification"],
    ],
  },
  {
    title: "Small print",
    links: [
      ["Terms of use", "/terms"],
      ["Privacy policy", "/privacy"],
      ["Contact support", "/help#contact"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-20 overflow-hidden bg-ink text-paper">
      <div className="h-4 hazard" aria-hidden />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)] lg:px-8">
        <p className="max-w-xs font-headline text-3xl leading-[0.95]">
          Oga <span className="text-danfo">= boss.</span>
          <br />
          Sabi <span className="text-danfo">= to know.</span>
          <span className="mt-3 block font-body text-sm leading-relaxed font-normal normal-case opacity-70">
            Find the boss who knows the work, with a trust score built from real, completed jobs.
          </span>
        </p>
        {COLUMNS.map((col, i) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 ticket-label text-danfo">
              {String(i + 1).padStart(2, "0")} / {col.title}
            </h2>
            <ul>
              {col.links.map(([label, href]) => (
                <li key={href} className="border-t border-paper/20">
                  <Link
                    href={href}
                    className="flex min-h-11 items-center justify-between text-sm hover:text-danfo"
                  >
                    {label} <span aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-7xl px-4 ticket-label opacity-60 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} OgaSabi · Artisans are independent businesses · Agree the price
        before work starts
      </p>
      <p
        aria-hidden
        className="pointer-events-none -mb-[0.2em] px-2 text-center font-display text-[25vw] leading-[0.8] tracking-tighter whitespace-nowrap text-danfo select-none"
      >
        OGASABI
      </p>
    </footer>
  );
}
