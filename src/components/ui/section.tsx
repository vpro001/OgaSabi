"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export function Section({
  children,
  className,
  id,
  ariaLabelledBy,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  ariaLabelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn("mx-auto max-w-5xl px-6 py-12 sm:py-16 lg:py-20", className)}
    >
      {children}
    </section>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-5xl", className)}>{children}</div>;
}

export function SectionHeader({
  title,
  description,
  className,
  action,
}: {
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <header
      className={cn("mx-auto max-w-2xl space-y-3 text-center lg:mx-0 lg:text-left", className)}
    >
      <h2 className="font-display text-h2">{title}</h2>
      {description && <p className="text-lg text-muted-foreground">{description}</p>}
      {action && <div className="mt-6 lg:mt-0">{action}</div>}
    </header>
  );
}
