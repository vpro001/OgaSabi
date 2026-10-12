import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Request sent" };

/** Confirmation shown after the booking wizard creates a service request. */
export default function BookingSuccessPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-16 text-center">
      <h1 className="font-display text-h1">Request sent</h1>
      <p className="text-muted-foreground">
        The artisan has been notified and will respond shortly. Your callout fee is held securely
        and is only released after the work is done.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "accent" }))}>
          Find another sabi
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back home
        </Link>
      </div>
    </main>
  );
}
