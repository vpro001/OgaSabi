"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Star,
  CheckCircle,
  Clock,
  AlertTriangle,
  Car,
  Home,
  Shield,
  DollarSign,
  TrendingUp,
  User,
  Phone,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtisanProfile {
  id: string;
  businessName: string;
  headline: string;
  bio: string;
  yearsExperience: number;
  categories: { name: string }[];
  status: "ACTIVE" | "SUSPENDED" | "DRAFT";
  verificationLevel: "NONE" | "ID_VERIFIED" | "ID_SELFIE_VERIFIED" | "ADMIN_REVIEWED";
  areaLabel: string;
  city: string;
  state: string;
  serviceRadiusKm: number;
  calloutMinKobo: number | null;
  calloutMaxKobo: number | null;
  isAvailableNow: boolean;
  trustScore: number;
  trustTier: "NEW" | "TRUSTED" | "HIGHLY_TRUSTED" | "TOP_RATED";
  completedJobsCount: number;
  ratingAverage: number | null;
  ratingCount: number;
  responseTimeMedianSec: number | null;
  availabilityLabel: string | null;
  lat: number;
  lng: number;
  portfolio: { url: string; alt?: string }[];
  identityVerification: unknown;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  tags?: string[];
}

export default function ArtisanProfilePage({ params }: { params: { id: string } }) {
  const {
    data: artisan,
    isLoading,
    error,
  } = useQuery<ArtisanProfile>({
    queryKey: ["artisan", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/artisans/${params.id}`);
      if (!res.ok) {
        if (res.status === 404) return notFound();
        throw new Error("Failed to load artisan profile");
      }
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60,
  });

  if (isLoading)
    return (
      <div className="py-16 text-center text-muted-foreground">Loading artisan profile...</div>
    );

  if (error)
    return <div className="py-16 text-center text-destructive">Error: {error.message}</div>;

  if (!artisan) return notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="font-display text-h1 font-bold">{artisan.businessName}</h1>
          <p className="text-lg text-muted-foreground">{artisan.headline}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {artisan.yearsExperience} years commercial experience
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <TrustTierBadge tier={artisan.trustTier} score={artisan.trustScore} />
          <div className="flex items-center gap-1 text-sm">
            <Star className="size-4 fill-accent text-accent" />{" "}
            {artisan.ratingAverage?.toFixed(1) ?? "New"}
            <span className="text-muted-foreground">({artisan.ratingCount})</span>
          </div>
        </div>
      </div>

      {/* Main grid: left profile summary, right trust breakdown */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: profile, portfolio, reviews */}
        <div className="space-y-8 lg:col-span-2">
          {/* Profile & Verification */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-display mb-6 text-h2">Profile & Verification</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {artisan.areaLabel}, {artisan.city}, {artisan.state}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Verification</p>
                    <p className="text-sm text-muted-foreground">
                      {artisan.verificationLevel.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Response Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatResponseTime(artisan.responseTimeMedianSec)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Available Now</p>
                    <p className="text-sm text-muted-foreground">
                      {artisan.isAvailableNow ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Callout Range</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPriceRange(artisan.calloutMinKobo, artisan.calloutMaxKobo)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Service Radius</p>
                    <p className="text-sm text-muted-foreground">{artisan.serviceRadiusKm} km</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Car className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Distance to Lekki Phase 1</p>
                    <p className="text-sm text-muted-foreground">
                      {calculateDistance(artisan.lat, artisan.lng, 6.468, 3.441).toFixed(1)} km
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Home className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Coverage Area</p>
                    <p className="text-sm text-muted-foreground">Lekki Phase 1 & Surrounds</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <h3 className="text-h3 font-display mb-4">About</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                {artisan.bio}
              </p>
            </div>
          </section>

          {/* Portfolio */}
          {artisan.portfolio && artisan.portfolio.length > 0 && (
            <section className="rounded-xl border bg-card p-6">
              <h2 className="font-display mb-6 text-h2">Verified Work Portfolio</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {artisan.portfolio.map((item, idx) => (
                  <Image
                    key={idx}
                    src={item.url}
                    alt={item.alt || `Portfolio ${idx + 1}`}
                    className="aspect-square w-full rounded-lg object-cover"
                    width={400}
                    height={400}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-display mb-6 text-h2">Verified Customer Reviews</h2>
            {renderReviewsSection()}
          </section>
        </div>

        {/* Right column: Trust Score Breakdown and Request */}
        <div className="space-y-6">
          {/* Trust Score Breakdown */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-display mb-6 text-h2">Trust Score Breakdown</h2>
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-success" />
                    <span>Completed Jobs</span>
                  </div>
                  <span className="font-medium">{artisan.completedJobsCount}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-success"
                    style={{ width: `${Math.min(100, artisan.completedJobsCount)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-info" />
                    <span>Completion Rate</span>
                  </div>
                  <span className="font-medium">{artisan.completedJobsCount > 0 ? 85 : 0}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-info" style={{ width: "85%" }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="size-4 fill-accent text-accent" />
                    <span>Review Score</span>
                  </div>
                  <span className="font-medium">{artisan.ratingAverage?.toFixed(1) ?? "N/A"}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{
                      width: `${artisan.ratingAverage ? (artisan.ratingAverage / 5) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-warning" />
                    <span>Response Time</span>
                  </div>
                  <span className="font-medium">
                    {formatResponseTime(artisan.responseTimeMedianSec) || "N/A"}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-warning"
                    style={{
                      width: artisan.responseTimeMedianSec
                        ? Math.max(0, 100 - (artisan.responseTimeMedianSec / 60) * 100)
                        : 0,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-tier-trusted" />
                    <span>Verification Level</span>
                  </div>
                  <span className="font-medium">
                    {artisan.verificationLevel.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-tier-trusted" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Trust Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold text-primary">
                    {artisan.trustScore}
                  </span>
                  <span className="text-sm text-muted-foreground">out of 100</span>
                </div>
              </div>
              <TrustTierBadge tier={artisan.trustTier} score={artisan.trustScore} />
            </div>
          </section>

          {/* Service Coverage & Protection */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-display mb-4 text-h2">Service Coverage & Protection</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Car className="size-5 text-info" />
                <div>
                  <p className="text-sm font-medium">Covered Areas</p>
                  <p className="text-sm text-muted-foreground">
                    Lekki Phase 1, Phase 2, Eko Atlantic, Victoria Island
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="size-5 text-success" />
                <div>
                  <p className="text-sm font-medium">Protection</p>
                  <p className="text-sm text-muted-foreground">
                    Cancellation allowed up to 2 hours before appointment
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">Dispute Window</p>
                  <p className="text-sm text-muted-foreground">Up to 48 hours after completion</p>
                </div>
              </div>
            </div>
          </section>

          {/* Request Inspection */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="font-display mb-4 text-h2">Request Inspection</h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Callout Fee</p>
                <p className="font-display text-2xl font-bold text-primary">
                  {formatPriceRange(artisan.calloutMinKobo, artisan.calloutMaxKobo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pay only if satisfied with diagnostics
                </p>
              </div>
              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={() => void console.warn("Request inspection for", artisan.id)}
              >
                Request inspection
              </Button>
              <p className="text-xs text-muted-foreground">2 min response · 24/7 support</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TrustTierBadge({ tier, score }: { tier: string; score: number }) {
  const tierColors = {
    NEW: { dot: "bg-tier-new", label: "New Sabi" },
    TRUSTED: { dot: "bg-tier-trusted", label: "Trusted Sabi" },
    HIGHLY_TRUSTED: { dot: "bg-tier-highly-trusted", label: "Highly Trusted" },
    TOP_RATED: { dot: "bg-tier-top-rated", label: "Top Rated Oga" },
  } as const;
  const s = tierColors[tier as keyof typeof tierColors] ?? tierColors.NEW;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
      <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
      {s.label} <span className="tabular-nums opacity-70">({Math.round(score)})</span>
    </span>
  );
}

function formatResponseTime(sec: number | null): string {
  if (!sec) return "N/A";
  if (sec < 60) return `${Math.round(sec)}s response`;
  const min = Math.round(sec / 60);
  return min < 60 ? `${min} min response` : `${Math.round(min / 60)} hr response`;
}

function formatPriceRange(minKobo: number | null, maxKobo: number | null): string {
  if (!minKobo && !maxKobo) return "Free";
  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  });
  if (minKobo && maxKobo)
    return `${formatter.format(minKobo / 100)} – ${formatter.format(maxKobo / 100)}`;
  if (minKobo) return `${formatter.format(minKobo / 100)}`;
  if (maxKobo) return `up to ${formatter.format(maxKobo / 100)}`;
  return "Free";
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function renderReviewsSection() {
  // Placeholder reviews – would come from API
  const placeholderReviews: Review[] = [
    {
      id: "1",
      rating: 4.9,
      comment:
        "Engr. Babatunde was amazing! Fixed my AC in 2 hours, professional and polite. Will definitely use again.",
      createdAt: "2024-12-15",
      customerName: "Aisha K.",
      tags: ["Fast", "Professional"],
    },
    {
      id: "2",
      rating: 5.0,
      comment:
        "Excellent service! The generator technician arrived on time and explained everything clearly. Great value for money.",
      createdAt: "2024-11-28",
      customerName: "Mr. Okafor",
      tags: ["Knowledgeable", "Good Value"],
    },
  ];
  return (
    <div className="space-y-4">
      {placeholderReviews.map((review) => (
        <div key={review.id} className="rounded-lg border bg-muted/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="size-4 fill-accent text-accent" /> {review.rating}
              </div>
              <span className="text-sm font-medium">{review.customerName}</span>
              <span className="text-xs text-muted-foreground">
                • {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex gap-1">
              {review.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-foreground/80">{review.comment}</p>
        </div>
      ))}
      <div className="pt-4 text-center">
        <a href="#reviews" className="text-sm text-primary hover:underline">
          View all reviews →
        </a>
      </div>
    </div>
  );
}
