import Link from "next/link";
import { Logo } from "@/components/site/logo";

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
    title: "Company",
    links: [
      ["Terms of use", "/terms"],
      ["Privacy policy", "/privacy"],
      ["Contact support", "/help#contact"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-[#031d10] text-emerald-100/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed">
            Find electricians, plumbers, AC and generator technicians and more, with a trust score
            built from real, completed jobs.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 font-label text-xs font-bold tracking-widest text-[#fe932c] uppercase">
              {col.title}
            </h2>
            <ul className="space-y-1">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex min-h-9 items-center text-sm hover:text-white hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-emerald-100/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} OgaSabi. Artisans are independent businesses; agree the price
          before work starts.
        </p>
      </div>
    </footer>
  );
}
