"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-8" aria-hidden />
      </span>
      <h1 className="text-h1 font-extrabold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        That was our fault, not yours. Try again, and if it keeps happening please let us know.
      </p>
      {error.digest && (
        <p className="font-label text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Button variant="accent" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </div>
    </main>
  );
}
