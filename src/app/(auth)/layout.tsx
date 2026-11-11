import { type ReactNode } from "react";
import { ShieldCheck, Star, EyeOff } from "lucide-react";
import { Logo } from "@/components/site/logo";

const POINTS = [
  { icon: ShieldCheck, text: "Artisans verified by real people, not just a form" },
  { icon: Star, text: "Reviews only from confirmed, completed jobs" },
  { icon: EyeOff, text: "Your address stays private until a job is accepted" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#032515] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 adire-pattern" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-[#fe932c]/15 blur-3xl"
          aria-hidden
        />
        <Logo inverted className="relative" />
        <div className="relative space-y-8">
          <p className="max-w-md font-headline text-4xl leading-tight font-extrabold">
            Know who is coming to fix it,{" "}
            <span className="gold-gradient-text">before they arrive.</span>
          </p>
          <ul className="space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-emerald-100/90">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/10">
                  <p.icon className="size-5 text-[#fe932c]" aria-hidden />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-emerald-100/50">© {new Date().getFullYear()} OgaSabi</p>
      </aside>
      <main id="main" className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-8 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
