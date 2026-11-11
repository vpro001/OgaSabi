import { localeConfig } from "@/lib/locale";
import { type RequestStatus, type TrustTier, type VerificationLevel } from "@/lib/types";

export const TIER_LABEL: Record<TrustTier, string> = {
  NEW: "New",
  TRUSTED: "Trusted",
  HIGHLY_TRUSTED: "Highly trusted",
  TOP_RATED: "Top rated",
};

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  NONE: "Not yet verified",
  ID_VERIFIED: "ID verified",
  ID_SELFIE_VERIFIED: "ID and selfie verified",
  ADMIN_REVIEWED: "ID verified and reviewed in person",
};

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

export const STATUS: Record<
  RequestStatus,
  { label: string; tone: Tone; customer: string; artisan: string }
> = {
  PENDING: {
    label: "Waiting for artisan",
    tone: "warning",
    customer: "Waiting for the artisan to respond.",
    artisan: "New request. Accept it, send a quote, or decline.",
  },
  QUOTED: {
    label: "Quote sent",
    tone: "info",
    customer: "The artisan sent a quote. Accept or reject it.",
    artisan: "Waiting for the customer to answer your quote.",
  },
  ACCEPTED: {
    label: "Booked",
    tone: "success",
    customer: "Booked. The artisan will let you know when they set off.",
    artisan: "Booked. Tell the customer when you are on the way.",
  },
  EN_ROUTE: {
    label: "On the way",
    tone: "info",
    customer: "The artisan is on the way.",
    artisan: "You are on the way. Start the job when you arrive.",
  },
  IN_PROGRESS: {
    label: "In progress",
    tone: "info",
    customer: "Work is in progress.",
    artisan: "Work in progress. Mark it complete when you finish.",
  },
  AWAITING_CONFIRMATION: {
    label: "Confirm completion",
    tone: "accent",
    customer: "The artisan says the job is done. Check and confirm.",
    artisan: "Waiting for the customer to confirm.",
  },
  COMPLETED: {
    label: "Completed",
    tone: "success",
    customer: "This job is complete.",
    artisan: "This job is complete.",
  },
  DECLINED: {
    label: "Declined",
    tone: "neutral",
    customer: "The artisan could not take this job.",
    artisan: "You declined this request.",
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "neutral",
    customer: "This request was cancelled.",
    artisan: "This request was cancelled.",
  },
  EXPIRED: {
    label: "Expired",
    tone: "neutral",
    customer: "The request expired without a response.",
    artisan: "This request expired.",
  },
  DISPUTED: {
    label: "In dispute",
    tone: "danger",
    customer: "Our team is reviewing this dispute.",
    artisan: "Our team is reviewing this dispute.",
  },
};

export const EVENT_LABEL: Record<string, string> = {
  CREATED: "Request sent",
  VIEWED: "Seen by the artisan",
  ACCEPTED: "Request accepted",
  DECLINED: "Request declined",
  QUOTED: "Quote sent",
  QUOTE_ACCEPTED: "Quote accepted",
  QUOTE_REJECTED: "Quote rejected",
  EN_ROUTE: "Artisan on the way",
  STARTED: "Work started",
  MARKED_COMPLETE: "Marked complete by the artisan",
  CONFIRMED_COMPLETE: "Completion confirmed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  DISPUTE_OPENED: "Dispute opened",
  DISPUTE_RESOLVED: "Dispute resolved",
  REVIEW_POSTED: "Review posted",
  PAYMENT_RECEIVED: "Callout deposit paid",
};

export const TRUST_COMPONENT: Record<string, { label: string; help: string }> = {
  verification: { label: "Identity verification", help: "Government ID checked by our team." },
  ratings: { label: "Customer ratings", help: "Weighted average of reviews from completed jobs." },
  reliability: {
    label: "Reliability",
    help: "Jobs finished versus jobs cancelled or left unanswered.",
  },
  experience: { label: "Jobs completed", help: "Track record on OgaSabi." },
  responsiveness: { label: "Response speed", help: "How quickly requests get a first answer." },
  loyalty: { label: "Repeat customers", help: "Customers who came back." },
  recency: { label: "Recent activity", help: "Completed work in the last few months." },
};

export function humanize(value: string): string {
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatResponseTime(sec: number | null | undefined): string | null {
  if (sec == null) return null;
  if (sec < 90) return "about a minute";
  const min = Math.round(sec / 60);
  if (min < 60) return `about ${min} min`;
  const hr = Math.round(min / 60);
  return hr < 24 ? `about ${hr} hr` : "over a day";
}

export function formatDistance(km: number | null | undefined): string | null {
  if (km == null) return null;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

const dateTime = () =>
  new Intl.DateTimeFormat(localeConfig.locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: localeConfig.timezone,
  });
const dateOnly = () =>
  new Intl.DateTimeFormat(localeConfig.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: localeConfig.timezone,
  });
const timeOnly = () =>
  new Intl.DateTimeFormat(localeConfig.locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: localeConfig.timezone,
  });

export const formatDateTime = (iso: string | Date) => dateTime().format(new Date(iso));
export const formatDate = (iso: string | Date) => dateOnly().format(new Date(iso));
export const formatTime = (iso: string | Date) => timeOnly().format(new Date(iso));

export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/** Local phone format for display and tel:/wa.me links. */
export function waLink(e164: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}`;
}
