"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Inbox,
  MessageCircle,
  ShieldCheck,
  Star,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Stamp, TrustBadge, TrustGauge } from "@/components/artisan/trust";
import { RequestList } from "@/components/request/request-list";
import { PageHeader } from "@/components/site/shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, Card, EmptyState, PageLoading } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useMe } from "@/hooks/use-auth";
import { OWN_ARTISAN_KEY, useOwnArtisan } from "@/hooks/use-own-artisan";
import { api, errorMessage } from "@/lib/api";
import { formatResponseTime, formatTime } from "@/lib/format";
import { type OwnArtisanProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const BENEFITS = [
  {
    icon: Inbox,
    title: "Requests come to you",
    body: "Customers near you send jobs straight to your phone. Accept, quote, or decline in one tap.",
  },
  {
    icon: TrendingUp,
    title: "Your good work adds up",
    body: "Every confirmed job and review raises a trust score that customers can see and check.",
  },
  {
    icon: ShieldCheck,
    title: "Stand out as verified",
    body: "Submit your ID once. A verified badge and a higher score tell customers you are who you say you are.",
  },
  {
    icon: MessageCircle,
    title: "Agree the price first",
    body: "Send a quote before you travel. Customers confirm completion, so there is a record both sides can rely on.",
  },
];

export function ArtisanHome() {
  const { me } = useMe();
  const profile = useOwnArtisan(!!me?.artisan);
  if (me === undefined || (me?.artisan && profile.isPending)) return <PageLoading />;

  if (!me?.artisan || !profile.data) {
    const href = me ? "/artisan/onboarding" : "/register?as=artisan&next=/artisan/onboarding";
    return (
      <div className="space-y-10">
        <section className="border-2 bg-accent text-accent-foreground shadow-xl">
          <div className="h-3 border-b-2 border-ink hazard" aria-hidden />
          <div className="p-6 sm:p-12">
            <p className="ticket-label">Artisans wanted</p>
            <h1 className="mt-4 text-display">
              You sabi the work.{" "}
              <span className="bg-ink px-[0.08em] text-danfo">Hang your sign.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg">
              A free profile, job requests from people near you, and a reputation that grows with
              every job you finish well.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href} className={buttonVariants({ size: "lg" })}>
                Create my free profile →
              </Link>
              {!me && (
                <Link
                  href="/login?next=/artisan"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  I already have an account
                </Link>
              )}
            </div>
          </div>
        </section>
        <ul className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex gap-4 p-5 card-surface">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-container text-accent-container-foreground">
                <b.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-bold">{b.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <Dashboard profile={profile.data} />;
}

function Dashboard({ profile: p }: { profile: OwnArtisanProfile }) {
  const toast = useToast();
  const client = useQueryClient();
  const available = useMutation({
    mutationFn: (on: boolean) =>
      api<{ isAvailableNow: boolean; availableNowUntil: string | null }>(
        "/me/artisan/available-now",
        { method: "POST", body: { available: on, hours: 4 } },
      ),
    onSuccess: (data) => {
      client.setQueryData<OwnArtisanProfile | null>(OWN_ARTISAN_KEY, (old) =>
        old ? { ...old, ...data } : old,
      );
      toast.success(
        data.isAvailableNow
          ? "You are shown as free for the next 4 hours."
          : "You are no longer shown as free right now.",
      );
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const v = p.verification;
  const stats = [
    { icon: Briefcase, label: "Jobs completed", value: String(p.completedJobsCount) },
    {
      icon: Star,
      label: "Rating",
      value:
        p.ratingAverage != null
          ? `${p.ratingAverage.toFixed(1)} (${p.ratingCount})`
          : "No reviews yet",
    },
    {
      icon: Timer,
      label: "You reply in",
      value: formatResponseTime(p.responseTimeMedianSec) ?? "Not known yet",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Artisan dashboard"
        title={p.businessName}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/artisan/profile"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit profile
            </Link>
            <Link
              href={`/artisans/${p.id}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View public profile
            </Link>
          </div>
        }
      />

      {p.status === "SUSPENDED" && (
        <Alert tone="danger" title="Your profile is suspended">
          Customers cannot find you or send requests. Contact support through the Help page to
          resolve this.
        </Alert>
      )}
      {p.verificationLevel === "NONE" && v?.status !== "PENDING" && (
        <Alert
          tone="warning"
          title={
            v?.status === "REJECTED"
              ? "Your documents were not accepted"
              : "Verify your identity to earn up to 15 trust points"
          }
        >
          {v?.status === "REJECTED" && v.rejectionReason
            ? `${v.rejectionReason} `
            : "Verified artisans appear in “ID verified only” searches. "}
          <Link href="/artisan/verification" className="font-semibold text-primary underline">
            {v?.status === "REJECTED" ? "Submit again" : "Get verified"}
          </Link>
        </Alert>
      )}
      {v?.status === "PENDING" && (
        <Alert tone="info" title="Your documents are being reviewed">
          We will notify you as soon as a decision is made, usually within two working days.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <TrustGauge
              score={p.trustScore}
              tier={p.trustTier}
              provisional={p.completedJobsCount < 3}
              className="w-52"
            />
            <div className="space-y-3">
              <p className="ticket-label text-muted-foreground">Your trust meter</p>
              <TrustBadge
                tier={p.trustTier}
                score={p.trustScore}
                provisional={p.completedJobsCount < 3}
              />
              {p.verificationLevel !== "NONE" && (
                <p>
                  <Stamp className="text-xs" tilt={-4}>
                    ✓ ID verified
                  </Stamp>
                </p>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 border-t pt-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <s.icon className="size-3.5" aria-hidden /> {s.label}
                </dt>
                <dd className="mt-0.5 text-sm font-bold">{s.value}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/how-trust-works"
            className="text-sm font-semibold text-primary hover:underline"
          >
            How to raise your score
          </Link>
        </Card>

        <Card
          className={cn(
            "flex flex-col justify-between gap-4",
            p.isAvailableNow && "border-success/50 bg-success/5",
          )}
        >
          <div>
            <p className="flex items-center gap-2 text-lg font-extrabold">
              <Zap
                className={cn(
                  "size-5",
                  p.isAvailableNow ? "fill-success text-success" : "text-muted-foreground",
                )}
                aria-hidden
              />
              {p.isAvailableNow ? "You are free right now" : "Free to take a job now?"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.isAvailableNow && p.availableNowUntil
                ? `Customers see “Free now” on your profile until ${formatTime(p.availableNowUntil)}. It switches off by itself.`
                : "Switch this on and you move up in search results for the next 4 hours."}
            </p>
          </div>
          <Button
            variant={p.isAvailableNow ? "outline" : "accent"}
            disabled={available.isPending || p.status !== "ACTIVE"}
            aria-pressed={p.isAvailableNow}
            onClick={() => available.mutate(!p.isAvailableNow)}
          >
            {p.isAvailableNow ? "Switch off" : "I am free now"}
          </Button>
        </Card>
      </div>

      <section aria-labelledby="jobs" className="space-y-4 pt-2">
        <h2 id="jobs" className="text-h2 font-extrabold">
          Your jobs
        </h2>
        <RequestList
          as="artisan"
          empty={
            <EmptyState icon={Inbox} title="No open jobs right now">
              New requests appear here and you get a notification. A complete profile with photos
              and a verified badge gets more of them.
            </EmptyState>
          }
        />
      </section>
    </div>
  );
}
