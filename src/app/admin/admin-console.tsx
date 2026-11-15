"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Banknote,
  CircleCheck,
  ExternalLink,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Scale,
  ScrollText,
  Search,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Logo } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
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
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useRequireAuth, useSignOut } from "@/hooks/use-auth";
import { api, apiWithMeta, errorMessage } from "@/lib/api";
import { MAX_SERVICE_FEE_BPS, MAX_SPONSORED_SLOTS, type PlatformSettings } from "@/lib/fees";
import { formatDateTime, humanize } from "@/lib/format";
import { formatMoney, formatRelativeTime } from "@/lib/locale";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  {
    id: "verifications",
    label: "Verifications",
    icon: BadgeCheck,
    count: "pendingVerifications",
  },
  { id: "disputes", label: "Disputes", icon: Scale, count: "openDisputes" },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning, count: "openComplaints" },
  { id: "reports", label: "Reports", icon: Flag, count: "openReports" },
  { id: "users", label: "Users", icon: Users },
  { id: "monetisation", label: "Monetisation", icon: Banknote },
  { id: "audit", label: "Audit log", icon: ScrollText },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Overview = {
  users: number;
  artisans: number;
  pendingVerifications: number;
  openDisputes: number;
  openComplaints: number;
  openReports: number;
  requests30d: number;
  completed30d: number;
  requestsByStatus: Record<string, number>;
};

/**
 * The admin area has its own frame, separate from the public site: a dark sidebar that stays put,
 * a slim top bar, and the working area. Below the `lg` breakpoint the sidebar becomes a drawer
 * opened from the top bar, so tables keep the full width of a phone.
 */
export function AdminConsole() {
  const me = useRequireAuth("admin");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const signOut = useSignOut();
  const [drawer, setDrawer] = useState(false);
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "overview") as TabId;
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api<Overview>("/admin/overview"),
    enabled: !!me,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  if (!me) return <PageLoading />;
  const name = `${me.firstName} ${me.lastName}`;
  const sideLink =
    "flex min-h-11 w-full items-center gap-3 pr-4 pl-5 text-left text-sm font-semibold text-paper/70 hover:bg-paper/10 hover:text-paper";

  return (
    <div className="min-h-dvh lg:pl-64">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:px-3 focus:py-2 focus:font-bold focus:text-accent-foreground"
      >
        Skip to content
      </a>
      {drawer && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-ink/60 lg:hidden"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        id="admin-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink text-paper transition-transform duration-150 lg:translate-x-0",
          drawer ? "translate-x-0" : "invisible -translate-x-full lg:visible",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b-2 border-paper/20 px-4">
          <div className="flex items-center gap-3">
            <Logo inverted />
            <span className="ticket-label text-danfo">Admin</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="flex size-11 items-center justify-center text-paper/70 hover:text-paper lg:hidden"
            onClick={() => setDrawer(false)}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <nav aria-label="Admin sections" className="flex-1 overflow-y-auto py-3">
          {TABS.map((t) => {
            const count = "count" in t ? overview.data?.[t.count] : undefined;
            const current = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-current={current ? "page" : undefined}
                onClick={() => {
                  setDrawer(false);
                  router.replace(t.id === "overview" ? pathname : `${pathname}?tab=${t.id}`, {
                    scroll: false,
                  });
                  window.scrollTo({ top: 0 });
                }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 border-l-4 px-4 text-left text-sm font-bold",
                  current
                    ? "border-danfo bg-paper/10 text-paper"
                    : "border-transparent text-paper/70 hover:bg-paper/10 hover:text-paper",
                )}
              >
                <t.icon className={cn("size-4.5 shrink-0", current && "text-danfo")} aria-hidden />
                <span className="flex-1">{t.label}</span>
                {!!count && (
                  <span className="bg-destructive px-1.5 font-label text-[11px] leading-5 text-destructive-foreground">
                    {count}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="shrink-0 border-t-2 border-paper/20 py-2">
          <Link href="/" className={sideLink}>
            <ExternalLink className="size-4.5" aria-hidden />
            View public site
          </Link>
          <ThemeToggle className={cn(sideLink, "[&_svg]:size-4.5")} />
          <button type="button" onClick={signOut} className={sideLink}>
            <LogOut className="size-4.5" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b-2 bg-background px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={drawer}
          aria-controls="admin-sidebar"
          className="-ml-2 flex size-11 items-center justify-center border-2 lg:hidden"
          onClick={() => setDrawer(true)}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate ticket-label text-muted-foreground">
          Admin <span aria-hidden>/</span>{" "}
          <span className="text-foreground">{TABS.find((t) => t.id === tab)?.label}</span>
        </p>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-right text-sm leading-tight sm:block">
            <span className="block font-bold">{name}</span>
            <span className="block text-xs text-muted-foreground">Administrator</span>
          </span>
          <Avatar name={name} className="size-9 text-base" />
        </div>
      </header>

      <main id="admin-main" className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section aria-labelledby="admin-section-title" className="mx-auto max-w-6xl space-y-6">
          <h1 id="admin-section-title" className="text-h1 font-extrabold">
            {TABS.find((t) => t.id === tab)?.label}
          </h1>
          {tab === "overview" && <OverviewPanel query={overview} />}
          {tab === "verifications" && <VerificationsPanel />}
          {tab === "disputes" && <DisputesPanel />}
          {tab === "complaints" && <ComplaintsPanel />}
          {tab === "reports" && <ReportsPanel />}
          {tab === "users" && <UsersPanel />}
          {tab === "monetisation" && <MonetisationPanel />}
          {tab === "audit" && <AuditPanel />}
        </section>
      </main>
    </div>
  );
}

function useInvalidateAdmin() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["admin"] });
}

function Panel<T>({
  query,
  empty,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; data?: T[]; refetch: () => void };
  empty: string;
  children: (items: T[]) => React.ReactNode;
}) {
  if (query.isPending) return <PageLoading />;
  if (query.isError)
    return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;
  if (!query.data?.length) return <EmptyState icon={CircleCheck} title={empty} />;
  return <>{children(query.data)}</>;
}

function OpenToggle({ open, onChange }: { open: boolean; onChange: (open: boolean) => void }) {
  return (
    <div className="mb-4 inline-flex rounded-lg bg-muted p-1 text-sm font-bold">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={open === v}
          onClick={() => onChange(v)}
          className={cn(
            "min-h-9 rounded-md px-4",
            open === v ? "bg-card shadow-sm" : "text-muted-foreground",
          )}
        >
          {v ? "Open" : "Closed"}
        </button>
      ))}
    </div>
  );
}

function OverviewPanel({
  query,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    data?: Overview;
    refetch: () => void;
  };
}) {
  if (query.isPending) return <PageLoading />;
  if (query.isError || !query.data)
    return <ErrorState message={errorMessage(query.error)} onRetry={query.refetch} />;
  const d = query.data;
  const tiles = [
    {
      label: "Verifications waiting",
      value: d.pendingVerifications,
      href: "?tab=verifications",
      urgent: d.pendingVerifications > 0,
    },
    {
      label: "Open disputes",
      value: d.openDisputes,
      href: "?tab=disputes",
      urgent: d.openDisputes > 0,
    },
    {
      label: "Open complaints",
      value: d.openComplaints,
      href: "?tab=complaints",
      urgent: d.openComplaints > 0,
    },
    {
      label: "Open reports",
      value: d.openReports,
      href: "?tab=reports",
      urgent: d.openReports > 0,
    },
    { label: "Users", value: d.users, href: "?tab=users" },
    { label: "Active artisans", value: d.artisans },
    { label: "Requests, last 30 days", value: d.requests30d },
    { label: "Completed, last 30 days", value: d.completed30d },
  ];
  const total = Object.values(d.requestsByStatus).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const inner = (
            <>
              <span
                className={cn(
                  "font-headline text-3xl font-black tabular-nums",
                  t.urgent && "text-destructive",
                )}
              >
                {t.value.toLocaleString("en-NG")}
              </span>
              <span className="text-sm text-muted-foreground">{t.label}</span>
            </>
          );
          return (
            <li key={t.label}>
              {t.href ? (
                <Link
                  href={`/admin${t.href}`}
                  className="flex h-full flex-col p-4 card-surface hover:border-primary/40"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex h-full flex-col p-4 card-surface">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <Card>
        <h2 className="text-lg font-extrabold">All requests by status</h2>
        <dl className="mt-4 space-y-2.5">
          {Object.entries(d.requestsByStatus)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div
                key={status}
                className="grid grid-cols-[11rem_1fr_3rem] items-center gap-3 text-sm"
              >
                <dt className="truncate font-medium">{humanize(status)}</dt>
                <dd className="h-2 overflow-hidden rounded-none bg-muted" aria-hidden>
                  <span
                    className="block h-full rounded-none bg-primary"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </dd>
                <dd className="text-right tabular-nums">{count}</dd>
              </div>
            ))}
        </dl>
      </Card>
    </div>
  );
}

// ── Verifications ──────────────────────────────────────────────────────────────────────────

type Verification = {
  id: string;
  idType: string;
  documentLast4: string | null;
  createdAt: string;
  hasSelfie: boolean;
  documentUrl: string | null;
  selfieUrl: string | null;
  sameIdOnOtherAccounts: number;
  artisan: {
    id: string;
    businessName: string;
    location: string;
    ownerName: string;
    contact: string | null;
  };
};

function VerificationsPanel() {
  const toast = useToast();
  const invalidate = useInvalidateAdmin();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["admin", "verifications"],
    queryFn: () => api<Verification[]>("/admin/verifications"),
  });
  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api(`/admin/verifications/${id}`, { method: "POST", body }),
    onSuccess: () => {
      toast.success("Decision recorded.");
      setRejecting(null);
      setReason("");
      invalidate();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  return (
    <Panel query={query} empty="No verifications waiting">
      {(items) => (
        <ul className="grid gap-4 lg:grid-cols-2">
          {items.map((v) => (
            <li key={v.id}>
              <Card className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/artisans/${v.artisan.id}`} className="font-bold hover:underline">
                      {v.artisan.businessName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {v.artisan.ownerName} · {v.artisan.location} · {v.artisan.contact}
                    </p>
                  </div>
                  <Badge tone="warning">{formatRelativeTime(new Date(v.createdAt))}</Badge>
                </div>
                <p className="text-sm">
                  <span className="font-semibold">{humanize(v.idType)}</span> ending{" "}
                  <span className="font-label font-bold">{v.documentLast4 ?? "—"}</span>
                </p>
                {v.sameIdOnOtherAccounts > 0 && (
                  <Alert tone="danger">
                    This ID number was also submitted on {v.sameIdOnOtherAccounts} other account(s).
                  </Alert>
                )}
                <div className="flex flex-wrap gap-2">
                  {v.documentUrl && (
                    <a
                      href={v.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      <ExternalLink className="size-4" aria-hidden /> Open ID document
                    </a>
                  )}
                  {v.selfieUrl && (
                    <a
                      href={v.selfieUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      <ExternalLink className="size-4" aria-hidden /> Open selfie
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({
                        id: v.id,
                        body: { decision: "approve", level: "ID_VERIFIED" },
                      })
                    }
                  >
                    Approve ID
                  </Button>
                  {v.hasSelfie && (
                    <Button
                      size="sm"
                      variant="accent"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          id: v.id,
                          body: { decision: "approve", level: "ID_SELFIE_VERIFIED" },
                        })
                      }
                    >
                      Approve ID + selfie
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={decide.isPending}
                    onClick={() => setRejecting(v.id)}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            </li>
          ))}
          <Dialog
            open={!!rejecting}
            onClose={() => setRejecting(null)}
            title="Reject this submission"
            description="The artisan sees this reason and can submit again."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (rejecting)
                  decide.mutate({
                    id: rejecting,
                    body: { decision: "reject", reason: reason.trim() },
                  });
              }}
            >
              <Field label="Reason" htmlFor="reject-reason">
                <Textarea
                  id="reject-reason"
                  value={reason}
                  maxLength={300}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. The photo is blurred; the ID number cannot be read."
                  className="min-h-20"
                />
              </Field>
              <Button
                type="submit"
                variant="destructive"
                disabled={reason.trim().length < 5 || decide.isPending}
              >
                Reject submission
              </Button>
            </form>
          </Dialog>
        </ul>
      )}
    </Panel>
  );
}

// ── Disputes, complaints, reports: one decision dialog ─────────────────────────────────────

type Decision = {
  path: string;
  title: string;
  outcomes: [string, string][];
  refund?: boolean;
  severity?: string;
};

function DecisionDialog({ decision, onClose }: { decision: Decision | null; onClose: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateAdmin();
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState("");
  const [severity, setSeverity] = useState("");
  const chosen = outcome || decision?.outcomes[0]?.[0] || "";
  const submit = useMutation({
    mutationFn: () =>
      api(decision?.path ?? "", {
        method: "POST",
        body: {
          outcome: chosen,
          note: note.trim(),
          ...(decision?.refund && refund
            ? { refundAmountKobo: Math.round(Number(refund) * 100) }
            : {}),
          ...(decision?.severity && severity ? { severity } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Decision recorded and both sides notified.");
      setNote("");
      setOutcome("");
      setRefund("");
      onClose();
      invalidate();
    },
  });
  return (
    <Dialog
      open={!!decision}
      onClose={onClose}
      title={decision?.title ?? ""}
      description="Your note is sent to the people involved and stored in the audit log."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <Field label="Outcome" htmlFor="decision-outcome">
          <Select id="decision-outcome" value={chosen} onChange={(e) => setOutcome(e.target.value)}>
            {decision?.outcomes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {decision?.severity && (
          <Field
            label="Severity"
            htmlFor="decision-severity"
            hint="Higher severity removes more trust points when upheld."
          >
            <Select
              id="decision-severity"
              value={severity || decision.severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {decision?.refund && (
          <Field
            label="Refund agreed (₦)"
            htmlFor="decision-refund"
            optional
            hint="Recorded for both parties. Settle the money outside OgaSabi."
          >
            <Input
              id="decision-refund"
              inputMode="numeric"
              value={refund}
              onChange={(e) => setRefund(e.target.value.replace(/[^\d]/g, ""))}
            />
          </Field>
        )}
        <Field label="Explanation" htmlFor="decision-note">
          <Textarea
            id="decision-note"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        {submit.isError && <Alert tone="danger">{errorMessage(submit.error)}</Alert>}
        <Button type="submit" disabled={note.trim().length < 10 || submit.isPending}>
          {submit.isPending && <Spinner className="size-4" />} Record decision
        </Button>
      </form>
    </Dialog>
  );
}

function EvidenceLinks({ evidence }: { evidence: { id: string; url: string }[] }) {
  if (!evidence.length) return null;
  return (
    <p className="flex flex-wrap gap-2 text-sm">
      {evidence.map((e, i) => (
        <a
          key={e.id}
          href={e.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden /> Evidence {i + 1}
        </a>
      ))}
    </p>
  );
}

type Dispute = {
  id: string;
  status: string;
  reason: string;
  description: string;
  openedByRole: string;
  resolutionNote: string | null;
  createdAt: string;
  evidence: { id: string; url: string }[];
  request: {
    id: string;
    description: string;
    category: string;
    areaLabel: string;
    amountKobo: number | null;
    customer: { name: string; contact: string | null };
    artisan: { id: string; businessName: string; contact: string | null };
  };
};

function DisputesPanel() {
  const [open, setOpen] = useState(true);
  const [decision, setDecision] = useState<Decision | null>(null);
  const query = useQuery({
    queryKey: ["admin", "disputes", open],
    queryFn: () => api<Dispute[]>(`/admin/disputes?open=${open}`),
  });
  return (
    <>
      <OpenToggle open={open} onChange={setOpen} />
      <Panel query={query} empty={open ? "No open disputes" : "No closed disputes yet"}>
        {(items) => (
          <ul className="space-y-4">
            {items.map((d) => (
              <li key={d.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold">{d.reason}</h2>
                    <div className="flex items-center gap-2">
                      <Badge tone={d.status.startsWith("RESOLVED") ? "success" : "danger"}>
                        {humanize(d.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(d.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-line">{d.description}</p>
                  <EvidenceLinks evidence={d.evidence} />
                  <dl className="grid gap-3 rounded-lg bg-muted p-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Customer{d.openedByRole === "CUSTOMER" && " (opened it)"}
                      </dt>
                      <dd className="font-semibold">{d.request.customer.name}</dd>
                      <dd className="text-muted-foreground">{d.request.customer.contact}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Artisan{d.openedByRole === "ARTISAN" && " (opened it)"}
                      </dt>
                      <dd className="font-semibold">{d.request.artisan.businessName}</dd>
                      <dd className="text-muted-foreground">{d.request.artisan.contact}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Job</dt>
                      <dd className="font-semibold">
                        {d.request.category} ·{" "}
                        {d.request.amountKobo != null
                          ? formatMoney(d.request.amountKobo)
                          : "no amount"}
                      </dd>
                      <dd>
                        <Link
                          href={`/requests/${d.request.id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          Open job and messages
                        </Link>
                      </dd>
                    </div>
                  </dl>
                  {d.resolutionNote && (
                    <p className="rounded-lg border p-3 text-sm">
                      <span className="font-semibold">Note: </span>
                      {d.resolutionNote}
                    </p>
                  )}
                  {open && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setDecision({
                          path: `/admin/disputes/${d.id}`,
                          title: "Decide this dispute",
                          refund: true,
                          outcomes: [
                            ["RESOLVED_FOR_CUSTOMER", "Resolve for the customer"],
                            ["RESOLVED_FOR_ARTISAN", "Resolve for the artisan"],
                            ["RESOLVED_SPLIT", "Split outcome"],
                            ["UNDER_REVIEW", "Keep under review (add a note)"],
                          ],
                        })
                      }
                    >
                      Decide
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <DecisionDialog key={decision?.path} decision={decision} onClose={() => setDecision(null)} />
    </>
  );
}

type Complaint = {
  id: string;
  requestId: string;
  category: string;
  severity: string;
  status: string;
  description: string;
  filedByRole: string;
  filedBy: string;
  against: string;
  resolutionNote: string | null;
  createdAt: string;
  evidence: { id: string; url: string }[];
};

function ComplaintsPanel() {
  const [open, setOpen] = useState(true);
  const [decision, setDecision] = useState<Decision | null>(null);
  const query = useQuery({
    queryKey: ["admin", "complaints", open],
    queryFn: () => api<Complaint[]>(`/admin/complaints?open=${open}`),
  });
  return (
    <>
      <OpenToggle open={open} onChange={setOpen} />
      <Panel query={query} empty={open ? "No open complaints" : "No closed complaints yet"}>
        {(items) => (
          <ul className="space-y-4">
            {items.map((c) => (
              <li key={c.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{humanize(c.category)}</h2>
                    <Badge
                      tone={
                        c.severity === "CRITICAL" || c.severity === "HIGH"
                          ? "danger"
                          : c.severity === "MEDIUM"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {humanize(c.severity)} severity
                    </Badge>
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
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{c.filedBy}</span> (
                    {c.filedByRole.toLowerCase()}) against{" "}
                    <span className="font-semibold text-foreground">{c.against}</span>
                  </p>
                  <p className="text-sm whitespace-pre-line">{c.description}</p>
                  <EvidenceLinks evidence={c.evidence} />
                  {c.resolutionNote && (
                    <p className="rounded-lg border p-3 text-sm">
                      <span className="font-semibold">Note: </span>
                      {c.resolutionNote}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/requests/${c.requestId}`}
                      className="inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-semibold hover:bg-muted"
                    >
                      Open job
                    </Link>
                    {open && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setDecision({
                            path: `/admin/complaints/${c.id}`,
                            title: "Decide this complaint",
                            severity: c.severity,
                            outcomes: [
                              ["UPHELD", "Uphold the complaint"],
                              ["DISMISSED", "Dismiss the complaint"],
                              ["UNDER_REVIEW", "Keep under review (add a note)"],
                            ],
                          })
                        }
                      >
                        Decide
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <DecisionDialog key={decision?.path} decision={decision} onClose={() => setDecision(null)} />
    </>
  );
}

type Report = {
  id: string;
  targetType: string;
  reason: string;
  details: string | null;
  status: string;
  actionTaken: string | null;
  createdAt: string;
  reporter: string;
  excerpt: string;
};

function ReportsPanel() {
  const [open, setOpen] = useState(true);
  const [decision, setDecision] = useState<Decision | null>(null);
  const query = useQuery({
    queryKey: ["admin", "reports", open],
    queryFn: () => api<Report[]>(`/admin/reports?open=${open}`),
  });
  const actionLabel: Record<string, string> = {
    USER: "Suspend the user",
    REVIEW: "Hide the review",
    MESSAGE: "Remove the message",
  };
  return (
    <>
      <OpenToggle open={open} onChange={setOpen} />
      <Panel query={query} empty={open ? "No open reports" : "No closed reports yet"}>
        {(items) => (
          <ul className="space-y-4">
            {items.map((r) => (
              <li key={r.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">
                      {humanize(r.reason)} · {r.targetType.toLowerCase()}
                    </h2>
                    {!open && (
                      <Badge tone={r.status === "ACTIONED" ? "success" : "neutral"}>
                        {humanize(r.status)}
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(r.createdAt)}
                    </span>
                  </div>
                  <blockquote className="rounded-lg border-l-4 border-border bg-muted p-3 text-sm">
                    {r.excerpt}
                  </blockquote>
                  {r.details && <p className="text-sm whitespace-pre-line">{r.details}</p>}
                  <p className="text-xs text-muted-foreground">Reported by {r.reporter}</p>
                  {r.actionTaken && (
                    <p className="rounded-lg border p-3 text-sm">
                      <span className="font-semibold">Note: </span>
                      {r.actionTaken}
                    </p>
                  )}
                  {open && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setDecision({
                          path: `/admin/reports/${r.id}`,
                          title: "Handle this report",
                          outcomes: [
                            ["ACTIONED", actionLabel[r.targetType] ?? "Take action"],
                            ["DISMISSED", "Dismiss: no action needed"],
                          ],
                        })
                      }
                    >
                      Handle
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <DecisionDialog key={decision?.path} decision={decision} onClose={() => setDecision(null)} />
    </>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  status: string;
  suspensionReason: string | null;
  createdAt: string;
  artisan: {
    id: string;
    businessName: string;
    trustScore: number;
    status: string;
    verificationLevel: string;
    sponsoredUntil: string | null;
  } | null;
  requestCount: number;
  complaintsAgainst: number;
};

function UsersPanel() {
  const toast = useToast();
  const invalidate = useInvalidateAdmin();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [sponsoring, setSponsoring] = useState<SponsorTarget | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["admin", "users", term],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiWithMeta<{ users: AdminUser[] }>(
        `/admin/users?limit=25${term ? `&q=${encodeURIComponent(term)}` : ""}${pageParam ? `&cursor=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
  const suspend = useMutation({
    mutationFn: () =>
      api(`/admin/users/${target?.id}`, {
        method: "POST",
        body: { suspended: target?.status !== "SUSPENDED", reason: reason.trim() },
      }),
    onSuccess: () => {
      toast.success("Account updated.");
      setTarget(null);
      setReason("");
      invalidate();
    },
  });
  const users = query.data?.pages.flatMap((p) => p.data.users) ?? [];
  return (
    <div className="space-y-4">
      <form
        role="search"
        className="flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(q.trim());
        }}
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Search users"
            placeholder="Name, email, phone or business"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {query.isPending ? (
        <PageLoading />
      ) : query.isError ? (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : users.length === 0 ? (
        <EmptyState icon={Search} title="No users match that search" />
      ) : (
        <div className="overflow-x-auto card-surface">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b text-left font-label text-xs tracking-wide text-muted-foreground uppercase">
                {["User", "Contact", "Roles", "Activity", "Status", ""].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <th scope="row" className="px-4 py-3 text-left">
                    <span className="block font-bold">
                      {u.firstName} {u.lastName}
                    </span>
                    {u.artisan && (
                      <Link
                        href={`/artisans/${u.artisan.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {u.artisan.businessName} · {Math.round(u.artisan.trustScore)}
                      </Link>
                    )}
                    {isSponsoredNow(u.artisan?.sponsoredUntil) && (
                      <Badge tone="warning" className="ml-2">
                        Sponsored
                      </Badge>
                    )}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="block">{u.email ?? "—"}</span>
                    <span className="block">{u.phone ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">{u.roles.map((r) => humanize(r)).join(", ")}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u.requestCount} requests
                    {u.complaintsAgainst > 0 && (
                      <span className="block font-semibold text-destructive">
                        {u.complaintsAgainst} complaints against
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>
                      {humanize(u.status)}
                    </Badge>
                    {u.suspensionReason && (
                      <span
                        className="mt-1 block max-w-40 truncate text-xs text-muted-foreground"
                        title={u.suspensionReason}
                      >
                        {u.suspensionReason}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {u.artisan && u.artisan.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => u.artisan && setSponsoring(u.artisan)}
                      >
                        Sponsor
                      </Button>
                    )}
                    {!u.roles.includes("ADMIN") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={u.status === "SUSPENDED" ? "" : "text-destructive"}
                        onClick={() => setTarget(u)}
                      >
                        {u.status === "SUSPENDED" ? "Reinstate" : "Suspend"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          Show more
        </Button>
      )}
      <Dialog
        open={!!target}
        onClose={() => setTarget(null)}
        title={
          target?.status === "SUSPENDED"
            ? `Reinstate ${target.firstName}?`
            : `Suspend ${target?.firstName ?? ""}?`
        }
        description={
          target?.status === "SUSPENDED"
            ? "They will be able to sign in again."
            : "They are signed out everywhere and cannot sign in. An artisan profile is hidden from search."
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            suspend.mutate();
          }}
        >
          <Field label="Reason (kept in the audit log)" htmlFor="suspend-reason">
            <Textarea
              id="suspend-reason"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-20"
            />
          </Field>
          {suspend.isError && <Alert tone="danger">{errorMessage(suspend.error)}</Alert>}
          <Button
            type="submit"
            variant={target?.status === "SUSPENDED" ? "default" : "destructive"}
            disabled={reason.trim().length < 5 || suspend.isPending}
          >
            {target?.status === "SUSPENDED" ? "Reinstate account" : "Suspend account"}
          </Button>
        </form>
      </Dialog>
      <SponsorDialog target={sponsoring} onClose={() => setSponsoring(null)} />
    </div>
  );
}

// ── Monetisation ───────────────────────────────────────────────────────────────────────────

type SponsorTarget = {
  id: string;
  businessName: string;
  verificationLevel?: string;
  sponsoredUntil: string | null;
};

type Monetisation = {
  settings: PlatformSettings;
  paymentsEnabled: boolean;
  feesCollectedKobo: number;
  feePayments: number;
  sponsored: {
    id: string;
    businessName: string;
    city: string | null;
    status: string;
    trustScore: number;
    sponsoredUntil: string;
  }[];
};

const isSponsoredNow = (until: string | null | undefined) =>
  !!until && new Date(until).getTime() > Date.now();

/** Starts, extends or ends one artisan's sponsored placement. */
function SponsorDialog({ target, onClose }: { target: SponsorTarget | null; onClose: () => void }) {
  const toast = useToast();
  const invalidate = useInvalidateAdmin();
  const [days, setDays] = useState("30");
  const active = isSponsoredNow(target?.sponsoredUntil);
  const save = useMutation({
    mutationFn: (d: number) =>
      api(`/admin/artisans/${target?.id}/sponsorship`, { method: "POST", body: { days: d } }),
    onSuccess: (_data, d) => {
      toast.success(d > 0 ? `Sponsored for ${d} days.` : "Sponsorship ended.");
      onClose();
      invalidate();
    },
  });
  return (
    <Dialog
      open={!!target}
      onClose={() => {
        save.reset();
        onClose();
      }}
      title={`Sponsor ${target?.businessName ?? ""}`}
      description={
        "They lead matching searches with a “Sponsored” label while sponsored placement is switched on. " +
        "Their trust score does not change. Collect payment before you start; the app does not charge for this yet."
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(Number(days));
        }}
      >
        {active && target?.sponsoredUntil && (
          <Alert tone="info">
            Sponsored until {formatDateTime(target.sponsoredUntil)}. Saving replaces that date.
          </Alert>
        )}
        <Field label="Run for" htmlFor="sponsor-days">
          <Select id="sponsor-days" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </Select>
        </Field>
        {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner className="size-4" />}{" "}
            {active ? "Replace sponsorship" : "Start sponsorship"}
          </Button>
          {active && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={save.isPending}
              onClick={() => save.mutate(0)}
            >
              End now
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function MonetisationPanel() {
  const toast = useToast();
  const client = useQueryClient();
  const [target, setTarget] = useState<SponsorTarget | null>(null);
  const [feePercent, setFeePercent] = useState<string | null>(null);
  const [slots, setSlots] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "monetisation"],
    queryFn: () => api<Monetisation>("/admin/settings"),
  });
  const save = useMutation({
    mutationFn: (next: PlatformSettings) =>
      api<{ settings: PlatformSettings }>("/admin/settings", { method: "PUT", body: next }),
    onSuccess: ({ settings }) => {
      client.setQueryData<Monetisation>(["admin", "monetisation"], (old) =>
        old ? { ...old, settings } : old,
      );
      setFeePercent(null);
      setSlots(null);
      toast.success("Saved. It applies from the next request.");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (query.isPending) return <PageLoading />;
  if (query.isError)
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  const d = query.data;
  const s = d.settings;
  const percentText = feePercent ?? String(s.serviceFeeBps / 100);
  const bps = Math.round(Number(percentText) * 100);
  const bpsValid = percentText.trim() !== "" && bps >= 0 && bps <= MAX_SERVICE_FEE_BPS;
  const slotsText = slots ?? String(s.sponsoredSlots);
  const slotsValue = Number(slotsText);
  const exampleFee = Math.round((500_000 * s.serviceFeeBps) / 10_000 / 100) * 100;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-extrabold">Service fee on callout deposits</h2>
            <Badge tone={s.serviceFeeEnabled ? "success" : "neutral"}>
              {s.serviceFeeEnabled ? "On" : "Off"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Added on top of the deposit and shown to the customer before they pay. The artisan’s
            deposit is not reduced. Example: on a {formatMoney(500_000)} deposit the customer pays{" "}
            {formatMoney(exampleFee)} extra.
          </p>
          {!d.paymentsEnabled && (
            <Alert tone="warning" className="mt-4">
              Online deposits are switched off on this server (PAYMENTS_ENABLED), so no fee can be
              charged yet. You can still set this up now.
            </Alert>
          )}
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (bpsValid) save.mutate({ ...s, serviceFeeBps: bps });
            }}
          >
            <Field
              label="Fee (% of deposit)"
              htmlFor="fee-percent"
              error={bpsValid ? undefined : `Enter 0 to ${MAX_SERVICE_FEE_BPS / 100}`}
            >
              <Input
                id="fee-percent"
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_SERVICE_FEE_BPS / 100}
                step={0.5}
                value={percentText}
                invalid={!bpsValid}
                onChange={(e) => setFeePercent(e.target.value)}
                className="w-28"
              />
            </Field>
            <Button
              type="submit"
              variant="outline"
              disabled={!bpsValid || bps === s.serviceFeeBps || save.isPending}
            >
              Save rate
            </Button>
          </form>
          <Button
            className="mt-4"
            variant={s.serviceFeeEnabled ? "outline" : "default"}
            disabled={save.isPending}
            onClick={() => save.mutate({ ...s, serviceFeeEnabled: !s.serviceFeeEnabled })}
          >
            {s.serviceFeeEnabled ? "Turn service fee off" : "Turn service fee on"}
          </Button>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Fees collected</dt>
              <dd className="font-headline text-2xl font-black tabular-nums">
                {formatMoney(d.feesCollectedKobo)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Paid deposits with a fee</dt>
              <dd className="font-headline text-2xl font-black tabular-nums">{d.feePayments}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-extrabold">Sponsored placement in search</h2>
            <Badge tone={s.sponsoredEnabled ? "success" : "neutral"}>
              {s.sponsoredEnabled ? "On" : "Off"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Sponsored artisans who match a search lead the “Recommended” order, labelled
            “Sponsored”. Sorting by distance, trust or rating is never changed, and neither is any
            trust score. Sponsor an artisan from the Users tab.
          </p>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ ...s, sponsoredSlots: slotsValue });
            }}
          >
            <Field label="Sponsored places per search" htmlFor="sponsored-slots">
              <Select
                id="sponsored-slots"
                value={slotsText}
                onChange={(e) => setSlots(e.target.value)}
                className="w-28"
              >
                {Array.from({ length: MAX_SPONSORED_SLOTS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="submit"
              variant="outline"
              disabled={slotsValue === s.sponsoredSlots || save.isPending}
            >
              Save
            </Button>
          </form>
          <Button
            className="mt-4"
            variant={s.sponsoredEnabled ? "outline" : "default"}
            disabled={save.isPending}
            onClick={() => save.mutate({ ...s, sponsoredEnabled: !s.sponsoredEnabled })}
          >
            {s.sponsoredEnabled ? "Turn sponsored placement off" : "Turn sponsored placement on"}
          </Button>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-extrabold">Sponsored artisans ({d.sponsored.length})</h2>
        {d.sponsored.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nobody is sponsored. Find an artisan in the Users tab and choose Sponsor.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {d.sponsored.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/artisans/${a.id}`} className="font-bold hover:underline">
                    {a.businessName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {a.city ?? "No city"} · trust {Math.round(a.trustScore)} · until{" "}
                    {formatDateTime(a.sponsoredUntil)}
                    {a.status !== "ACTIVE" && ` · ${humanize(a.status)}, hidden from search`}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setTarget(a)}>
                  Change
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <SponsorDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorRole: string;
  actor: string;
  createdAt: string;
};

function AuditPanel() {
  const query = useInfiniteQuery({
    queryKey: ["admin", "audit"],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      apiWithMeta<{ entries: AuditEntry[] }>(
        `/admin/audit?limit=50${pageParam ? `&cursor=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.meta.nextCursor ?? undefined,
  });
  if (query.isPending) return <PageLoading />;
  if (query.isError)
    return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  const entries = query.data.pages.flatMap((p) => p.data.entries);
  if (!entries.length)
    return (
      <EmptyState icon={CircleCheck} title="Nothing recorded yet">
        Sensitive actions such as verifications, suspensions and dispute decisions are logged here
        and cannot be edited.
      </EmptyState>
    );
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto card-surface">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b text-left font-label text-xs tracking-wide text-muted-foreground uppercase">
              {["When", "Who", "Action", "Record"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                  {formatDateTime(e.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  {e.actor}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({e.actorRole.toLowerCase()})
                  </span>
                </td>
                <td className="px-4 py-2.5 font-label font-semibold">{e.action}</td>
                <td className="px-4 py-2.5 font-label text-xs text-muted-foreground">
                  {e.entityType} {e.entityId?.slice(-8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          Show older
        </Button>
      )}
    </div>
  );
}
