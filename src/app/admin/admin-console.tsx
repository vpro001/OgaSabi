"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageLoading,
  Spinner,
} from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useRequireAuth } from "@/hooks/use-auth";
import { api, apiWithMeta, errorMessage } from "@/lib/api";
import { formatDateTime, humanize } from "@/lib/format";
import { formatMoney, formatRelativeTime } from "@/lib/locale";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "verifications", label: "Verifications", count: "pendingVerifications" },
  { id: "disputes", label: "Disputes", count: "openDisputes" },
  { id: "complaints", label: "Complaints", count: "openComplaints" },
  { id: "reports", label: "Reports", count: "openReports" },
  { id: "users", label: "Users" },
  { id: "audit", label: "Audit log" },
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

export function AdminConsole() {
  const me = useRequireAuth("admin");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "overview") as TabId;
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api<Overview>("/admin/overview"),
    enabled: !!me,
    refetchInterval: 60_000,
  });

  if (!me) return <PageLoading />;
  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-extrabold">Admin</h1>
      <div
        role="tablist"
        aria-label="Admin sections"
        className="-mx-4 scrollbar-none flex gap-1 overflow-x-auto border-b px-4"
      >
        {TABS.map((t) => {
          const count = "count" in t ? overview.data?.[t.count] : undefined;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() =>
                router.replace(t.id === "overview" ? pathname : `${pathname}?tab=${t.id}`, {
                  scroll: false,
                })
              }
              className={cn(
                "-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-bold",
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {!!count && (
                <span className="rounded-full bg-destructive px-1.5 font-label text-[11px] leading-5 text-destructive-foreground">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        {tab === "overview" && <OverviewPanel query={overview} />}
        {tab === "verifications" && <VerificationsPanel />}
        {tab === "disputes" && <DisputesPanel />}
        {tab === "complaints" && <ComplaintsPanel />}
        {tab === "reports" && <ReportsPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "audit" && <AuditPanel />}
      </div>
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
                  className="flex h-full flex-col card-surface p-4 hover:border-primary/40"
                >
                  {inner}
                </Link>
              ) : (
                <div className="flex h-full flex-col card-surface p-4">{inner}</div>
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
                <dd className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-primary"
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
  artisan: { id: string; businessName: string; trustScore: number } | null;
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
                  <td className="px-4 py-3 text-right">
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
