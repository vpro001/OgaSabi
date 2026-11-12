import * as React from "react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, type Tone } from "@/lib/format";

const TONES: Record<Tone, string> = {
  neutral: "border-muted-foreground text-muted-foreground",
  info: "border-foreground bg-foreground text-background",
  success: "border-success bg-success text-success-foreground",
  warning: "border-foreground bg-accent text-accent-foreground",
  danger: "border-destructive bg-destructive text-destructive-foreground",
  accent: "border-foreground bg-accent text-accent-foreground",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border-[1.5px] px-1.5 py-0.5 font-label text-[11px] leading-none font-bold tracking-wider whitespace-nowrap uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-5 animate-spin", className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} aria-hidden />;
}

export function PageLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-[40vh] items-center justify-center gap-3 text-muted-foreground"
    >
      <Spinner />
      <span>{label}…</span>
    </div>
  );
}

const ALERT = {
  info: { icon: Info, cls: "border-foreground bg-card" },
  success: { icon: CircleCheck, cls: "border-success bg-card [&>svg]:text-success" },
  warning: {
    icon: TriangleAlert,
    cls: "border-foreground bg-primary-container text-primary-container-foreground",
  },
  danger: { icon: CircleAlert, cls: "border-destructive bg-card [&>svg]:text-destructive" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof ALERT;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls } = ALERT[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 border-2 border-l-8 p-3.5 text-sm", cls, className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-label text-xs font-bold tracking-wider uppercase">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 border-2 border-dashed px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center border-2 bg-accent text-accent-foreground shadow-sm">
        <Icon className="size-7" />
      </span>
      <h3 className="font-headline text-2xl">{title}</h3>
      {children && <p className="max-w-md text-muted-foreground">{children}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden border-2 border-foreground bg-accent font-display text-lg text-accent-foreground",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads come from the storage provider, not a fixed host
        <img src={src} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

export function Card({
  className,
  children,
  as: Tag = "section",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" | "aside" }) {
  return (
    <Tag className={cn("p-5 card-surface sm:p-6", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 border-2 border-destructive px-6 py-12 text-center">
      <CircleAlert className="size-8 text-destructive" aria-hidden />
      <p className="max-w-md font-medium">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="tap-target rounded-md px-4 font-semibold text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
