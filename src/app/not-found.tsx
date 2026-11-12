import Link from "next/link";
import { Compass } from "lucide-react";
import { Shell } from "@/components/site/shell";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Shell width="narrow">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-none bg-accent-container text-accent-container-foreground">
          <Compass className="size-8" aria-hidden />
        </span>
        <h1 className="text-h1 font-extrabold">We could not find that page</h1>
        <p className="max-w-md text-muted-foreground">
          The link may be old, or the page may have moved. Let us get you back to something useful.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/search" className={buttonVariants({ variant: "accent" })}>
            Find an artisan
          </Link>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Go home
          </Link>
        </div>
      </div>
    </Shell>
  );
}
