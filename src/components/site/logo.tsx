import Link from "next/link";
import { cn } from "@/lib/utils";

/** The wordmark is set like a painted shop sign: a yellow plate, a hard shadow, no icon. */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-stretch", className)}
      aria-label="OgaSabi home"
    >
      <span
        className={cn(
          "flex items-center border-2 px-2 font-display text-2xl leading-none tracking-tight transition-transform group-hover:-rotate-2",
          inverted
            ? "border-paper bg-paper text-ink"
            : "border-foreground bg-foreground text-background",
        )}
      >
        OGA
      </span>
      <span
        className={cn(
          "flex items-center border-2 border-l-0 bg-danfo px-2 font-display text-2xl leading-none tracking-tight text-ink transition-transform group-hover:rotate-2",
          inverted ? "border-paper" : "border-foreground",
        )}
      >
        SABI
      </span>
    </Link>
  );
}
