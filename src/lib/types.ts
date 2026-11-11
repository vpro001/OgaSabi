// Shapes returned by /api/v1, as the browser sees them (dates arrive as ISO strings).

export type TrustTier = "NEW" | "TRUSTED" | "HIGHLY_TRUSTED" | "TOP_RATED";
export type VerificationLevel = "NONE" | "ID_VERIFIED" | "ID_SELFIE_VERIFIED" | "ADMIN_REVIEWED";
export type RequestStatus =
  | "PENDING"
  | "QUOTED"
  | "ACCEPTED"
  | "EN_ROUTE"
  | "IN_PROGRESS"
  | "AWAITING_CONFIRMATION"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED"
  | "DISPUTED";
export type RequestActionName =
  | "accept"
  | "decline"
  | "quote"
  | "accept_quote"
  | "reject_quote"
  | "en_route"
  | "start"
  | "mark_complete"
  | "confirm"
  | "cancel";

export type Me = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  roles: ("CUSTOMER" | "ARTISAN" | "ADMIN")[];
  avatarUrl: string | null;
  marketingConsent: boolean;
  createdAt: string;
  artisan: {
    id: string;
    status: "DRAFT" | "ACTIVE" | "SUSPENDED";
    businessName: string;
    verificationLevel: VerificationLevel;
  } | null;
  unreadNotifications: number;
  paymentsEnabled: boolean;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconKey: string;
  artisanCount: number;
};

export type ArtisanCardData = {
  id: string;
  businessName: string;
  headline: string;
  areaLabel: string | null;
  trustScore: number;
  trustTier: TrustTier;
  isVerified: boolean;
  isProvisional: boolean;
  completedJobsCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  calloutMinKobo: number | null;
  calloutMaxKobo: number | null;
  isAvailableNow: boolean;
  responseTimeMedianSec: number | null;
  yearsExperience: number;
  distanceKm: number | null;
  avatarUrl: string | null;
};

export type Slot = { dayOfWeek: number; startMinute: number; endMinute: number };
export type Photo = { id: string; url: string; caption?: string | null };

export type ArtisanProfile = {
  id: string;
  businessName: string;
  ownerName: string;
  ownerUserId: string;
  avatarUrl: string | null;
  memberSince: string;
  headline: string;
  bio: string;
  yearsExperience: number;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  categories: { id: string; name: string; slug: string; iconKey: string; isPrimary: boolean }[];
  verificationLevel: VerificationLevel;
  areaLabel: string | null;
  city: string | null;
  state: string | null;
  approxLat: number | null;
  approxLng: number | null;
  serviceRadiusKm: number;
  calloutMinKobo: number | null;
  calloutMaxKobo: number | null;
  isAvailableNow: boolean;
  availableNowUntil: string | null;
  responseTimeMedianSec: number | null;
  trustScore: number;
  trustTier: TrustTier;
  isProvisional: boolean;
  completedJobsCount: number;
  completionRate: number | null;
  ratingAverage: number | null;
  ratingCount: number;
  ratingDistribution: { star: number; count: number }[];
  trust: {
    components: Record<string, number>;
    max: Record<string, number>;
    computedAt: string;
    formulaVersion: string;
  } | null;
  portfolio: Photo[];
  availability: Slot[];
  isFavorite: boolean;
  isOwner: boolean;
};

export type Review = {
  id: string;
  rating: number;
  tags: string[];
  comment: string | null;
  replyBody: string | null;
  repliedAt: string | null;
  createdAt: string;
  authorName: string;
  jobCategory: string;
};

export type OwnArtisanProfile = {
  id: string;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  businessName: string;
  bio: string;
  yearsExperience: number;
  categoryIds: string[];
  primaryCategoryId: string | null;
  areaLabel: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
  serviceRadiusKm: number;
  calloutMinKobo: number | null;
  calloutMaxKobo: number | null;
  whatsappNumber: string;
  isAvailableNow: boolean;
  availableNowUntil: string | null;
  verificationLevel: VerificationLevel;
  trustScore: number;
  trustTier: TrustTier;
  completedJobsCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  responseTimeMedianSec: number | null;
  availability: Slot[];
  portfolio: Photo[];
  verification: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SUPERSEDED";
    idType: string;
    documentLast4: string | null;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
};

export type RequestSummary = {
  id: string;
  reference: string;
  status: RequestStatus;
  role: "CUSTOMER" | "ARTISAN" | "ADMIN";
  description: string;
  category: { id: string; name: string; slug: string };
  areaLabel: string;
  city: string | null;
  state: string | null;
  addressLine: string | null;
  landmark: string | null;
  lat: number;
  lng: number;
  distanceKm: number | null;
  addressReleased: boolean;
  isImmediate: boolean;
  scheduledFor: string | null;
  quotedAmountKobo: number | null;
  finalAmountKobo: number | null;
  calloutFeeKobo: number | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledByRole: string | null;
  cancellationReason: string | null;
  declineReason: string | null;
  customer: { id: string; name: string; phone: string | null; avatarUrl: string | null };
  artisan: {
    id: string;
    userId: string;
    businessName: string;
    ownerName: string;
    avatarUrl: string | null;
    trustScore: number;
    trustTier: TrustTier;
    phone: string | null;
    whatsappNumber: string | null;
  };
  unreadMessages: number;
  reviewRating?: number | null;
};

export type RequestDetail = RequestSummary & {
  photos: { id: string; url: string }[];
  quotes: {
    id: string;
    amountKobo: number;
    note: string | null;
    status: string;
    validUntil: string | null;
    createdAt: string;
  }[];
  events: {
    id: string;
    type: string;
    actorRole: string;
    toStatus: RequestStatus | null;
    createdAt: string;
  }[];
  review: {
    id: string;
    rating: number;
    tags: string[];
    comment: string | null;
    replyBody: string | null;
    repliedAt: string | null;
    createdAt: string;
  } | null;
  dispute: {
    id: string;
    status: string;
    reason: string;
    description: string;
    openedByRole: string;
    resolutionNote: string | null;
    refundAmountKobo: number | null;
    createdAt: string;
    resolvedAt: string | null;
  } | null;
  complaints: {
    id: string;
    category: string;
    status: string;
    description: string;
    resolutionNote: string | null;
    createdAt: string;
  }[];
  allowedActions: RequestActionName[];
  canMessage: boolean;
  canReview: boolean;
  canReplyToReview: boolean;
  canDispute: boolean;
  canComplain: boolean;
  payment: { enabled: boolean; depositDue: boolean; depositPaid: boolean };
};

export type ChatMessage = {
  id: string;
  mine: boolean;
  kind: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};
