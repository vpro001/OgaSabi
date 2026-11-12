"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  CircleCheck,
  EyeOff,
  FileQuestion,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Stars, TrustBadge } from "@/components/artisan/trust";
import { Chat } from "@/components/request/chat";
import {
  CompleteDialog,
  ComplaintDialog,
  DisputeDialog,
  QuoteDialog,
  ReasonDialog,
  ReviewDialog,
} from "@/components/request/request-dialogs";
import { StatusBadge } from "@/components/request/request-list";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Alert,
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageLoading,
  Spinner,
} from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ME_KEY, useRequireAuth } from "@/hooks/use-auth";
import { api, ApiError, errorMessage } from "@/lib/api";
import {
  EVENT_LABEL,
  formatDateTime,
  formatDistance,
  humanize,
  STATUS,
  waLink,
} from "@/lib/format";
import { formatMoney, formatRelativeTime } from "@/lib/locale";
import { type RequestActionName, type RequestDetail, type RequestStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type DialogName =
  | "quote"
  | "decline"
  | "cancel"
  | "reject_quote"
  | "complete"
  | "review"
  | "dispute"
  | "complaint"
  | null;

const FLOW: { status: RequestStatus; label: string }[] = [
  { status: "PENDING", label: "Sent" },
  { status: "ACCEPTED", label: "Booked" },
  { status: "IN_PROGRESS", label: "In progress" },
  { status: "AWAITING_CONFIRMATION", label: "Done" },
  { status: "COMPLETED", label: "Confirmed" },
];
const FLOW_INDEX: Partial<Record<RequestStatus, number>> = {
  PENDING: 0,
  QUOTED: 0,
  ACCEPTED: 1,
  EN_ROUTE: 1,
  IN_PROGRESS: 2,
  AWAITING_CONFIRMATION: 3,
  COMPLETED: 4,
};

export function RequestView({ id }: { id: string }) {
  const me = useRequireAuth();
  const toast = useToast();
  const client = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [dialog, setDialog] = useState<DialogName>(null);
  const [reply, setReply] = useState("");
  const key = ["requests", id];

  const query = useQuery({
    queryKey: key,
    queryFn: () => api<RequestDetail>(`/requests/${id}`),
    enabled: !!me,
    refetchInterval: (q) =>
      q.state.data &&
      ["COMPLETED", "DECLINED", "CANCELLED", "EXPIRED"].includes(q.state.data.status)
        ? false
        : 15_000,
  });

  // Opening a request is what reads its notifications, so the bell count is refreshed.
  useEffect(() => {
    if (query.isSuccess) client.invalidateQueries({ queryKey: ME_KEY });
  }, [query.isSuccess, client]);

  const refresh = () => {
    client.invalidateQueries({ queryKey: ["requests"] });
    client.invalidateQueries({ queryKey: ME_KEY });
  };
  const done = (message: string) => {
    setDialog(null);
    toast.success(message);
    refresh();
  };

  const act = useMutation({
    mutationFn: (body: { action: RequestActionName } & Record<string, unknown>) =>
      api<RequestDetail>(`/requests/${id}/actions`, { method: "POST", body }),
    onSuccess: (data, vars) => {
      client.setQueryData(key, data);
      done(ACTION_DONE[vars.action]);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "INVALID_TRANSITION") {
        setDialog(null);
        refresh();
      }
      if (!dialog) toast.error(errorMessage(err));
    },
  });
  const post = useMutation({
    mutationFn: ({ path, body }: { path: string; body: unknown; message: string }) =>
      api(path, { method: "POST", body }),
    onSuccess: (_d, vars) => done(vars.message),
    onError: (err) => {
      if (!dialog) toast.error(errorMessage(err));
    },
  });
  const pay = useMutation({
    mutationFn: () =>
      api<{ authorizationUrl: string }>(`/requests/${id}/payment`, { method: "POST" }),
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (!me || query.isPending) return <PageLoading label="Loading request" />;
  if (query.isError) {
    return query.error instanceof ApiError && query.error.status === 404 ? (
      <EmptyState
        icon={FileQuestion}
        title="We could not find that request"
        action={
          <Link href="/requests" className={buttonVariants()}>
            Back to my requests
          </Link>
        }
      >
        It may belong to a different account.
      </EmptyState>
    ) : (
      <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
    );
  }

  const r = query.data;
  const isCustomer = r.role === "CUSTOMER";
  const isArtisan = r.role === "ARTISAN";
  const can = (a: RequestActionName) => r.allowedActions.includes(a);
  const pendingQuote = r.quotes.find((q) => q.status === "PENDING");
  const other = isCustomer
    ? {
        name: r.artisan.businessName,
        phone: r.artisan.phone,
        whatsapp: r.artisan.whatsappNumber,
        avatar: r.artisan.avatarUrl,
      }
    : {
        name: r.customer.name,
        phone: r.customer.phone,
        whatsapp: null,
        avatar: r.customer.avatarUrl,
      };
  const flowIndex = FLOW_INDEX[r.status];
  const busy = act.isPending || post.isPending;
  const dialogError = act.isError
    ? errorMessage(act.error)
    : post.isError
      ? errorMessage(post.error)
      : null;
  const closeDialog = () => {
    setDialog(null);
    act.reset();
    post.reset();
  };
  const backHref = isArtisan ? "/artisan" : r.role === "ADMIN" ? "/admin" : "/requests";

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />{" "}
        {isArtisan ? "All jobs" : r.role === "ADMIN" ? "Admin" : "All requests"}
      </Link>

      {params.get("sent") === "1" && r.status === "PENDING" && (
        <Alert tone="success" title="Request sent">
          {r.artisan.businessName} has been notified. You will get a notification as soon as they
          respond.{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => router.replace(pathname)}
          >
            Dismiss
          </button>
        </Alert>
      )}
      {params.get("paid") === "1" && (
        <Alert tone="success" title="Thank you">
          Your payment is being confirmed. This page updates on its own.
        </Alert>
      )}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{r.category.name} job</h1>
          <StatusBadge status={r.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {r.reference} · sent {formatRelativeTime(new Date(r.createdAt))}
        </p>
        {flowIndex != null && (
          <ol className="flex gap-1.5 pt-2" aria-label="Progress">
            {FLOW.map((step, i) => (
              <li
                key={step.status}
                className="flex-1"
                aria-current={i === flowIndex ? "step" : undefined}
              >
                <span
                  className={cn(
                    "block h-3 border-2",
                    i <= flowIndex ? "bg-accent" : "bg-transparent opacity-40",
                  )}
                />
                <span
                  className={cn(
                    "mt-1 block font-label text-[11px] font-bold",
                    i <= flowIndex ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          {/* What to do next */}
          {r.role !== "ADMIN" && (
            <Card className={cn("border-2", r.allowedActions.length > 0 ? "border-accent/50" : "")}>
              <p className="font-bold">
                {isCustomer ? STATUS[r.status].customer : STATUS[r.status].artisan}
              </p>
              {r.status === "PENDING" && r.expiresAt && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {isArtisan ? "Respond" : "Expires"} {formatRelativeTime(new Date(r.expiresAt))}{" "}
                  {isArtisan && "or the request expires, which lowers your trust score."}
                </p>
              )}
              {r.status === "DECLINED" && r.declineReason && (
                <p className="mt-1 text-sm text-muted-foreground">Reason: {r.declineReason}</p>
              )}
              {r.status === "CANCELLED" && r.cancellationReason && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Cancelled by{" "}
                  {r.cancelledByRole === "ADMIN"
                    ? "OgaSabi"
                    : r.cancelledByRole === r.role
                      ? "you"
                      : isCustomer
                        ? "the artisan"
                        : "the customer"}
                  : {r.cancellationReason}
                </p>
              )}

              {pendingQuote && (
                <div className="mt-4 rounded-xl bg-accent-container/50 p-4">
                  <p className="font-label text-xs font-bold tracking-wide text-accent-container-foreground uppercase">
                    Quote
                  </p>
                  <p className="font-headline text-3xl font-black tabular-nums">
                    {formatMoney(pendingQuote.amountKobo)}
                  </p>
                  {pendingQuote.note && (
                    <p className="mt-1 text-sm whitespace-pre-line">{pendingQuote.note}</p>
                  )}
                  {pendingQuote.validUntil && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Valid until {formatDateTime(pendingQuote.validUntil)}
                    </p>
                  )}
                </div>
              )}

              {r.allowedActions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {can("accept") && (
                    <Button
                      variant="accent"
                      disabled={busy}
                      onClick={() => act.mutate({ action: "accept" })}
                    >
                      <Check className="size-4" aria-hidden /> Accept job
                    </Button>
                  )}
                  {can("quote") && (
                    <Button
                      variant={can("accept") ? "outline" : "accent"}
                      disabled={busy}
                      onClick={() => setDialog("quote")}
                    >
                      {r.status === "QUOTED" ? "Change quote" : "Send a quote"}
                    </Button>
                  )}
                  {can("accept_quote") && (
                    <Button
                      variant="accent"
                      disabled={busy}
                      onClick={() => act.mutate({ action: "accept_quote" })}
                    >
                      <Check className="size-4" aria-hidden /> Accept quote and book
                    </Button>
                  )}
                  {can("reject_quote") && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setDialog("reject_quote")}
                    >
                      Reject quote
                    </Button>
                  )}
                  {can("en_route") && (
                    <Button
                      variant="accent"
                      disabled={busy}
                      onClick={() => act.mutate({ action: "en_route" })}
                    >
                      I am on my way
                    </Button>
                  )}
                  {can("start") && (
                    <Button
                      variant={can("en_route") ? "outline" : "accent"}
                      disabled={busy}
                      onClick={() => act.mutate({ action: "start" })}
                    >
                      Start the job
                    </Button>
                  )}
                  {can("mark_complete") && (
                    <Button variant="accent" disabled={busy} onClick={() => setDialog("complete")}>
                      Mark job as complete
                    </Button>
                  )}
                  {can("confirm") && (
                    <Button
                      variant="accent"
                      disabled={busy}
                      onClick={() => act.mutate({ action: "confirm" })}
                    >
                      <CircleCheck className="size-4" aria-hidden /> Confirm job is done
                    </Button>
                  )}
                  {can("confirm") && r.canDispute && (
                    <Button variant="outline" disabled={busy} onClick={() => setDialog("dispute")}>
                      There is a problem
                    </Button>
                  )}
                  {can("decline") && (
                    <Button variant="ghost" disabled={busy} onClick={() => setDialog("decline")}>
                      Decline
                    </Button>
                  )}
                  {can("cancel") && (
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => setDialog("cancel")}
                    >
                      Cancel {isCustomer ? "request" : "job"}
                    </Button>
                  )}
                  {busy && !dialog && <Spinner className="self-center" />}
                </div>
              )}

              {r.payment.depositDue && r.calloutFeeKobo != null && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                  <div>
                    <p className="font-bold">Callout deposit: {formatMoney(r.calloutFeeKobo)}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid securely through Paystack. It counts towards the final price.
                    </p>
                  </div>
                  <Button disabled={pay.isPending} onClick={() => pay.mutate()}>
                    {pay.isPending && <Spinner className="size-4" />} Pay deposit
                  </Button>
                </div>
              )}
              {r.payment.depositPaid && (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
                  <CircleCheck className="size-4" aria-hidden /> Callout deposit paid
                </p>
              )}

              {r.canReview && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-container/50 p-4">
                  <p className="font-semibold">
                    How did it go? Your review helps other customers choose.
                  </p>
                  <Button variant="accent" onClick={() => setDialog("review")}>
                    Leave a review
                  </Button>
                </div>
              )}
            </Card>
          )}

          {r.dispute && (
            <Card className="border-destructive/40">
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                <ShieldAlert className="size-5 text-destructive" aria-hidden /> Dispute{" "}
                <Badge tone={r.dispute.status.startsWith("RESOLVED") ? "success" : "danger"}>
                  {humanize(r.dispute.status)}
                </Badge>
              </h2>
              <p className="mt-2 text-sm">
                <span className="font-semibold">{r.dispute.reason}.</span> Opened by{" "}
                {r.dispute.openedByRole === r.role
                  ? "you"
                  : `the ${r.dispute.openedByRole.toLowerCase()}`}{" "}
                on {formatDateTime(r.dispute.createdAt)}.
              </p>
              <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                {r.dispute.description}
              </p>
              {r.dispute.resolutionNote && (
                <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                  <p className="font-semibold">Decision from OgaSabi</p>
                  <p className="mt-1 whitespace-pre-line">{r.dispute.resolutionNote}</p>
                  {r.dispute.refundAmountKobo != null && r.dispute.refundAmountKobo > 0 && (
                    <p className="mt-1 font-semibold">
                      Refund agreed: {formatMoney(r.dispute.refundAmountKobo)}
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-extrabold">The job</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line">{r.description}</p>
            {r.photos.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {r.photos.map((p) => (
                  <li key={p.id}>
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- storage-provider URLs */}
                      <img
                        src={p.url}
                        alt="Photo of the problem"
                        loading="lazy"
                        className="aspect-square w-full rounded-lg object-cover"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-5 space-y-3 border-t pt-4 text-sm">
              <div className="flex gap-3">
                <dt className="sr-only">Location</dt>
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <dd>
                  {r.addressLine ? (
                    <>
                      <span className="font-semibold">{r.addressLine}</span>
                      <span className="block text-muted-foreground">
                        {[r.landmark, r.areaLabel, r.city].filter(Boolean).join(" · ")}
                      </span>
                      {isArtisan && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          Get directions
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">
                        {r.areaLabel}
                        {r.distanceKm != null &&
                          ` · about ${formatDistance(r.distanceKm)} from you`}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <EyeOff className="size-3.5" aria-hidden /> The street address is shared
                        once the job is accepted.
                      </span>
                    </>
                  )}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Timing</dt>
                {r.isImmediate ? (
                  <Zap className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <CalendarClock
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <dd className="font-semibold">
                  {r.isImmediate
                    ? "As soon as possible"
                    : r.scheduledFor
                      ? formatDateTime(r.scheduledFor)
                      : "Flexible"}
                </dd>
              </div>
            </dl>
            {(r.quotedAmountKobo != null || r.finalAmountKobo != null) && (
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
                {r.quotedAmountKobo != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {r.acceptedAt ? "Agreed price" : "Quoted price"}
                    </dt>
                    <dd className="font-display text-3xl leading-none tabular-nums">
                      {formatMoney(r.quotedAmountKobo)}
                    </dd>
                  </div>
                )}
                {r.finalAmountKobo != null && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Final amount</dt>
                    <dd className="font-display text-3xl leading-none tabular-nums">
                      {formatMoney(r.finalAmountKobo)}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </Card>

          {r.review && (
            <Card>
              <h2 className="text-lg font-extrabold">
                {isCustomer ? "Your review" : "Customer review"}
              </h2>
              <div className="mt-2 flex items-center gap-3">
                <Stars value={r.review.rating} />
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(r.review.createdAt)}
                </span>
              </div>
              {r.review.comment && <p className="mt-3 whitespace-pre-line">{r.review.comment}</p>}
              {r.review.tags.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {r.review.tags.map((t) => (
                    <li key={t}>
                      <Badge>{humanize(t)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {r.review.replyBody ? (
                <div className="mt-4 rounded-lg border-l-4 border-primary/30 bg-muted/60 p-3 text-sm">
                  <p className="font-semibold">
                    {isArtisan ? "Your reply" : `Reply from ${r.artisan.businessName}`}
                  </p>
                  <p className="mt-1 whitespace-pre-line">{r.review.replyBody}</p>
                </div>
              ) : (
                r.canReplyToReview && (
                  <form
                    className="mt-4 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      post.mutate({
                        path: `/reviews/${r.review?.id}/reply`,
                        body: { body: reply.trim() },
                        message: "Reply posted",
                      });
                    }}
                  >
                    <label htmlFor="review-reply" className="text-sm font-semibold">
                      Reply publicly
                    </label>
                    <Textarea
                      id="review-reply"
                      value={reply}
                      maxLength={1000}
                      onChange={(e) => setReply(e.target.value)}
                      className="min-h-20"
                      placeholder="Thank the customer, or calmly give your side. You can reply once."
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={reply.trim().length < 2 || post.isPending}
                    >
                      Post reply
                    </Button>
                  </form>
                )
              )}
            </Card>
          )}

          <Card>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <MessageCircle className="size-5 text-secondary" aria-hidden /> Messages
            </h2>
            <div className="mt-3">
              <Chat requestId={r.id} canSend={r.canMessage} otherName={other.name} />
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <h2 className="font-label text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {isCustomer ? "Artisan" : "Customer"}
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={other.name} src={other.avatar} className="size-12" />
              <div className="min-w-0">
                {isCustomer ? (
                  <Link
                    href={`/artisans/${r.artisan.id}`}
                    className="block truncate font-bold hover:underline"
                  >
                    {other.name}
                  </Link>
                ) : (
                  <p className="truncate font-bold">{other.name}</p>
                )}
                {isCustomer && (
                  <TrustBadge
                    tier={r.artisan.trustTier}
                    score={r.artisan.trustScore}
                    className="mt-1"
                  />
                )}
              </div>
            </div>
            {other.phone ? (
              <div className="mt-4 grid gap-2">
                <a href={`tel:${other.phone}`} className={buttonVariants({ variant: "outline" })}>
                  <Phone className="size-4" aria-hidden /> Call {other.phone}
                </a>
                <a
                  href={waLink(other.whatsapp ?? other.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              </div>
            ) : (
              r.role !== "ADMIN" && (
                <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                  <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden /> Phone numbers are shared
                  once the job is accepted. Use messages until then.
                </p>
              )
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-extrabold">Timeline</h2>
            <ol className="mt-4 space-y-4 border-l-2 border-border pl-4">
              {r.events.map((e) => (
                <li key={e.id} className="relative">
                  <span
                    className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-none bg-primary ring-4 ring-card"
                    aria-hidden
                  />
                  <p className="text-sm font-semibold">{EVENT_LABEL[e.type] ?? humanize(e.type)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>

          {r.role !== "ADMIN" && (r.canDispute || r.canComplain || r.complaints.length > 0) && (
            <Card>
              <h2 className="text-lg font-extrabold">Something wrong?</h2>
              {r.complaints.map((c) => (
                <div key={c.id} className="mt-3 rounded-lg bg-muted p-3 text-sm">
                  <p className="flex items-center justify-between gap-2 font-semibold">
                    {humanize(c.category)}{" "}
                    <Badge
                      tone={
                        c.status === "UPHELD"
                          ? "success"
                          : c.status === "DISMISSED"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {humanize(c.status)}
                    </Badge>
                  </p>
                  {c.resolutionNote && (
                    <p className="mt-1 text-muted-foreground">{c.resolutionNote}</p>
                  )}
                </div>
              ))}
              <div className="mt-3 grid gap-2">
                {r.canDispute && !can("confirm") && (
                  <Button variant="outline" onClick={() => setDialog("dispute")}>
                    Open a dispute
                  </Button>
                )}
                {r.canComplain && (
                  <Button variant="ghost" onClick={() => setDialog("complaint")}>
                    File a complaint
                  </Button>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                A dispute pauses the job for our team to decide. A complaint reports behaviour
                without pausing it.{" "}
                <Link href="/help" className="underline">
                  Learn more
                </Link>
              </p>
            </Card>
          )}
        </aside>
      </div>

      <QuoteDialog
        key={`q-${dialog}`}
        open={dialog === "quote"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        onSubmit={(amountKobo, note) =>
          act.mutate({ action: "quote", amountKobo, note: note || undefined })
        }
      />
      <CompleteDialog
        key={`c-${dialog}`}
        open={dialog === "complete"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        quotedKobo={r.quotedAmountKobo}
        onSubmit={(finalAmountKobo) => act.mutate({ action: "mark_complete", finalAmountKobo })}
      />
      <ReasonDialog
        key={`d-${dialog}`}
        open={dialog === "decline"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        title="Decline this request"
        description="The customer is told why, so they can look for someone else. Declining promptly does not hurt your trust score."
        label="Reason"
        submitLabel="Decline request"
        suggestions={[
          "Fully booked",
          "Too far from me",
          "Not my kind of job",
          "Need parts I do not have",
        ]}
        onSubmit={(reason) => act.mutate({ action: "decline", reason })}
      />
      <ReasonDialog
        key={`x-${dialog}`}
        open={dialog === "cancel"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        title={isCustomer ? "Cancel this request" : "Cancel this job"}
        description={
          isArtisan
            ? "Cancelling a job you accepted lowers your trust score. Only cancel if you truly cannot do it."
            : "The artisan will be told. If they are already on the way, please message them too."
        }
        label="Reason"
        submitLabel={isCustomer ? "Cancel request" : "Cancel job"}
        suggestions={
          isCustomer
            ? ["Problem solved", "Found someone else", "Sent by mistake", "Timing no longer works"]
            : ["Emergency came up", "Cannot reach the customer", "Job is outside my skills"]
        }
        onSubmit={(reason) => act.mutate({ action: "cancel", reason })}
      />
      <ReasonDialog
        key={`r-${dialog}`}
        open={dialog === "reject_quote"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        title="Reject this quote"
        description="The artisan can send a new quote or decline the job."
        label="Tell the artisan why"
        submitLabel="Reject quote"
        required={false}
        suggestions={["Price is too high", "Need it done sooner", "Scope is not what I asked for"]}
        onSubmit={(reason) => act.mutate({ action: "reject_quote", reason: reason || undefined })}
      />
      <ReviewDialog
        key={`v-${dialog}`}
        open={dialog === "review"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        artisanName={r.artisan.businessName}
        onSubmit={(body) =>
          post.mutate({
            path: `/requests/${id}/review`,
            body,
            message: "Thank you. Your review is live.",
          })
        }
      />
      <DisputeDialog
        key={`s-${dialog}`}
        open={dialog === "dispute"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        onSubmit={(body) =>
          post.mutate({
            path: `/requests/${id}/dispute`,
            body,
            message: "Dispute opened. Our team will be in touch.",
          })
        }
      />
      <ComplaintDialog
        key={`m-${dialog}`}
        open={dialog === "complaint"}
        onClose={closeDialog}
        pending={busy}
        error={dialogError}
        isCustomer={isCustomer}
        onSubmit={(body) =>
          post.mutate({
            path: `/requests/${id}/complaint`,
            body,
            message: "Complaint submitted. We will review it.",
          })
        }
      />
    </div>
  );
}

const ACTION_DONE: Record<RequestActionName, string> = {
  accept: "Job accepted. The address and phone number are now visible.",
  decline: "Request declined.",
  quote: "Quote sent to the customer.",
  accept_quote: "Quote accepted. The job is booked.",
  reject_quote: "Quote rejected.",
  en_route: "The customer knows you are on the way.",
  start: "Job started.",
  mark_complete: "Marked complete. Waiting for the customer to confirm.",
  confirm: "Job confirmed as complete.",
  cancel: "Cancelled.",
};
