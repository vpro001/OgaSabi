import { type ReactNode } from "react";
import { Logo } from "@/components/site/logo";
import { Stamp } from "@/components/artisan/trust";

const POINTS = [
  "ID checked by a person",
  "Reviews only from finished jobs",
  "Address hidden until you book",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r-2 bg-accent text-accent-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="h-4 border-b-2 border-ink hazard" aria-hidden />
        <div className="p-12">
          <Logo />
        </div>
        <div className="relative p-12 pt-0">
          <p className="font-display text-[clamp(4rem,8.5vw,9rem)] leading-[0.82] tracking-tight">
            Know who dey come fix am.
          </p>
          <Stamp tone="signal" tilt={-8} className="absolute -top-12 right-10 bg-accent text-xl">
            Before they arrive
          </Stamp>
          <ul className="mt-10 border-t-2 border-ink">
            {POINTS.map((p, i) => (
              <li
                key={p}
                className="flex items-center gap-4 border-b-2 border-ink py-3 font-semibold"
              >
                <span className="ticket-label">{String(i + 1).padStart(2, "0")}</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="h-4 border-t-2 border-ink hazard" aria-hidden />
      </aside>
      <main id="main" className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
