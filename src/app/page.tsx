import { ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex items-center gap-2 text-primary">
        <ShieldCheck className="size-7" aria-hidden />
        <span className="font-display text-2xl font-bold tracking-tight">OgaSabi</span>
      </div>
      <h1 className="font-display text-display text-balance">Know who is coming to fix it.</h1>
      <p className="max-w-xl text-lg text-pretty text-muted-foreground">
        Verified electricians, plumbers, AC and generator technicians near you, ranked by a trust
        score you can read, not just stars.
      </p>
    </main>
  );
}
