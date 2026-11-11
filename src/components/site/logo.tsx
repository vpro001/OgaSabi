import Link from "next/link";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="OgaSabi home"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-[#032515] text-[#ffdcc3] shadow-md shadow-black/10 transition-transform group-hover:scale-105 dark:bg-primary-container dark:text-primary">
        <Wrench className="size-5" aria-hidden />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-headline text-xl font-black tracking-tight",
            inverted ? "text-white" : "text-primary",
          )}
        >
          OgaSabi
        </span>
        <span
          className={cn(
            "font-label text-[9px] font-bold tracking-[0.2em] uppercase",
            inverted ? "text-[#fe932c]" : "text-secondary",
          )}
        >
          Trusted artisans
        </span>
      </span>
    </Link>
  );
}
