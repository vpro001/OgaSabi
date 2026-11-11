import Link from "next/link";
import { Shell, PageHeader } from "@/components/site/shell";
import { Prose } from "@/components/site/prose";
import { site } from "@/lib/site";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <Shell width="narrow">
      <PageHeader title="Privacy policy" description="Last updated 11 November 2026" />
      <Prose>
        <p>
          This policy explains what personal data {site.legalEntity} (“OgaSabi”) collects, why, and
          the choices you have. We handle personal data in line with the Nigeria Data Protection Act
          2023.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, phone number and/or email address, and a
            password stored only as a one-way hash.
          </li>
          <li>
            <strong>Artisan profile:</strong> business name, description, trades, working area,
            callout fee, working hours and photos you choose to publish.
          </li>
          <li>
            <strong>Identity verification (artisans):</strong> a photo of your ID and, optionally, a
            selfie. We keep only the last four characters of the ID number and a one-way fingerprint
            used to detect the same ID on more than one account.
          </li>
          <li>
            <strong>Jobs:</strong> the description, photos, address and time you give for a request,
            quotes, messages, reviews, complaints and disputes.
          </li>
          <li>
            <strong>Location:</strong> the area you choose, or your device location if you allow it,
            to find artisans near you. It is stored in your browser and sent only when you search or
            send a request.
          </li>
          <li>
            <strong>Technical data:</strong> IP address and browser type, kept in security logs.
          </li>
        </ul>
        <h2>How we use it</h2>
        <ul>
          <li>To run the service: matching, messaging, notifications and job history.</li>
          <li>To calculate trust scores and keep reviews genuine.</li>
          <li>To prevent fraud and abuse, and to resolve disputes and complaints.</li>
          <li>To send service messages by SMS or email. Marketing is sent only if you opt in.</li>
        </ul>
        <h2>Who sees what</h2>
        <ul>
          <li>
            <strong>Before a job is accepted</strong> an artisan sees only your first name, your
            area and a rounded distance. <strong>After acceptance</strong> the artisan sees your
            full name, street address and phone number, and you see theirs.
          </li>
          <li>
            Artisan profiles, published photos and reviews (with the reviewer&apos;s first name and
            last initial) are public.
          </li>
          <li>
            Identity documents and dispute evidence are private. Only authorised OgaSabi reviewers
            can open them, through links that expire within minutes.
          </li>
          <li>
            We use service providers for SMS, email, file storage and payments. They process data
            only on our instructions. We do not sell personal data.
          </li>
        </ul>
        <h2>How long we keep it</h2>
        <p>
          We keep your data while your account is open. When you delete your account we erase your
          name, contact details and photo. Job records and reviews are kept without your name so
          that trust scores stay accurate, and security and audit logs are kept for as long as the
          law requires.
        </p>
        <h2>Your rights</h2>
        <p>
          You can see and correct your details in <Link href="/settings">Settings</Link>, choose
          which notifications reach you by SMS or email, and delete your account there. You may also
          ask for a copy of your data, object to how it is used, or complain to the Nigeria Data
          Protection Commission.
          {site.supportEmail && (
            <>
              {" "}
              Contact us at <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
            </>
          )}
        </p>
        <h2>Cookies</h2>
        <p>
          We use only the cookies needed to keep you signed in. Your theme and chosen area are
          stored in your browser. We do not use advertising or third-party tracking cookies.
        </p>
      </Prose>
    </Shell>
  );
}
