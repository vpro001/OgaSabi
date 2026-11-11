import Link from "next/link";
import { Shell, PageHeader } from "@/components/site/shell";
import { Prose } from "@/components/site/prose";
import { site } from "@/lib/site";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <Shell width="narrow">
      <PageHeader title="Terms of use" description="Last updated 11 November 2026" />
      <Prose>
        <p>
          These terms are an agreement between you and {site.legalEntity} (“OgaSabi”, “we”). By
          creating an account or using OgaSabi you accept them.
        </p>
        <h2>1. What OgaSabi is</h2>
        <p>
          OgaSabi is a marketplace that helps customers find independent artisans and helps artisans
          find work. We are not a party to the agreement between a customer and an artisan, we do
          not employ artisans, and we do not carry out or supervise the work.
        </p>
        <h2>2. Your account</h2>
        <ul>
          <li>You must be at least 18 and give accurate information.</li>
          <li>
            Keep your password private. You are responsible for what happens under your account.
          </li>
          <li>One person, one account. You may use the same account to hire and to be hired.</li>
        </ul>
        <h2>3. Requests, quotes and jobs</h2>
        <ul>
          <li>
            A request is an invitation, not a booking. A job is booked when the artisan accepts the
            request or the customer accepts a quote.
          </li>
          <li>
            The price is whatever the customer and artisan agree. Record it in a quote or in
            messages.
          </li>
          <li>
            Payment for the work is made directly between customer and artisan. Where an online
            callout deposit is offered, it is processed by our payment partner and counts towards
            the final price.
          </li>
          <li>
            The customer confirms completion. A job not confirmed or disputed within 72 hours of
            being marked complete is confirmed automatically.
          </li>
        </ul>
        <h2>4. Rules for artisans</h2>
        <ul>
          <li>Offer only work you are trained and, where the law requires, licensed to do.</li>
          <li>Identity documents you submit must be your own and genuine.</li>
          <li>
            Do not ask customers for reviews in exchange for discounts, and do not review yourself.
          </li>
        </ul>
        <h2>5. Reviews and trust scores</h2>
        <p>
          Reviews must describe a real experience of a completed job. We may hide reviews that are
          abusive, fake or off-topic. Trust scores are calculated automatically as described on{" "}
          <Link href="/how-trust-works">How the trust score works</Link>. A score is information to
          help you decide, not a guarantee of future work.
        </p>
        <h2>6. Disputes and complaints</h2>
        <p>
          If something goes wrong you can open a dispute or file a complaint from the job page. We
          will review what both sides say and record a decision. Our decision affects standing on
          OgaSabi; it does not replace your legal rights against the other party.
        </p>
        <h2>7. What is not allowed</h2>
        <ul>
          <li>Harassment, threats, discrimination or fraud.</li>
          <li>Using contact details obtained through OgaSabi for anything other than the job.</li>
          <li>
            Attempting to manipulate reviews, scores or search results, or to access other
            people&apos;s data.
          </li>
        </ul>
        <p>We may suspend or close accounts that break these rules.</p>
        <h2>8. Our responsibility</h2>
        <p>
          We work to verify identities and keep scores accurate, but we cannot guarantee the
          quality, safety or legality of any artisan&apos;s work or any customer&apos;s conduct. To
          the extent the law allows, OgaSabi is not liable for loss or damage arising from a job
          arranged through the platform. Nothing in these terms limits liability that cannot be
          limited by law.
        </p>
        <h2>9. Closing your account</h2>
        <p>
          You can delete your account at any time from <Link href="/settings">Settings</Link>, once
          any jobs in progress are finished.
        </p>
        <h2>10. Changes and governing law</h2>
        <p>
          We may update these terms and will tell you about significant changes. These terms are
          governed by the laws of the Federal Republic of Nigeria.
        </p>
      </Prose>
    </Shell>
  );
}
