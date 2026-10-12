import { AnnouncementBar, Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { ArtisanDirectory } from "@/components/landing/artisan-directory";
import { TrustScoreSection } from "@/components/landing/trust-score";
import { EscrowProtectionSection } from "@/components/landing/escrow-protection";
import { GuaranteeBanner } from "@/components/landing/guarantee-banner";
import { Footer } from "@/components/landing/footer";
import { Providers } from "@/components/providers";

export const metadata = {
  title: "OgaSabi - Nigeria's Premier Verified Artisan Marketplace",
  description:
    "Over 4,200 NIN-verified artisans. Escrow-protected payments, Bayesian trust scores, 25-min emergency dispatch. Stop asking WhatsApp groups.",
  openGraph: {
    title: "OgaSabi - Nigeria's Premier Verified Artisan Marketplace",
    description:
      "Over 4,200 NIN-verified artisans. Escrow-protected payments, Bayesian trust scores, 25-min emergency dispatch.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <Providers>
      <div className="text-on-surface flex min-h-dvh flex-col bg-background font-body antialiased selection:bg-secondary-container selection:text-white">
        <header className="fixed top-0 left-0 z-50 w-full">
          <AnnouncementBar artisanCount={4289} />
          <Header activePath="find-artisans" />
        </header>
        <main className="min-h-screen w-full bg-background pt-[112px]">
          <Hero />
          <ArtisanDirectory />
          <TrustScoreSection />
          <EscrowProtectionSection />
          <GuaranteeBanner />
        </main>
        <Footer />
      </div>
    </Providers>
  );
}
