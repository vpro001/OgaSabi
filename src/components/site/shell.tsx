import { type ReactNode } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { cn } from "@/lib/utils";

/** Header + main + footer. `width` picks the reading measure for the page. */
export function Shell({
  children,
  width = "default",
  className,
  bare,
}: {
  children: ReactNode;
  width?: "narrow" | "default" | "wide";
  className?: string;
  bare?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="main"
        className={cn(
          "flex-1",
          !bare && "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
          !bare &&
            (width === "narrow" ? "max-w-2xl" : width === "wide" ? "max-w-7xl" : "max-w-5xl"),
          className,
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="font-label text-xs font-bold tracking-widest text-secondary uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-h1 font-extrabold">{title}</h1>
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
