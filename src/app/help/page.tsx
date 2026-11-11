import Link from "next/link";
import { Shell, PageHeader } from "@/components/site/shell";
import { Prose } from "@/components/site/prose";
import { site } from "@/lib/site";

export const metadata = {
  title: "Help and safety",
  description:
    "How requests, quotes, disputes and complaints work on OgaSabi, and how to stay safe.",
};

const FAQ = [
  {
    q: "Does it cost anything to send a request?",
    a: "No. Sending a request and receiving a quote are free. You pay the artisan directly for the work, at the price you agreed.",
  },
  {
    q: "When does the artisan see my address?",
    a: "Only after the job is accepted, either by the artisan accepting your request or by you accepting their quote. Before that they see your area and a distance rounded to the nearest half kilometre. Phone numbers are shared at the same moment.",
  },
  {
    q: "What happens if the artisan does not respond?",
    a: "Requests expire after 24 hours without a response. You are notified and can send the request to someone else. Unanswered requests lower the artisan's trust score.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time before work starts. Please tell the artisan why, especially if they are already on the way.",
  },
  {
    q: "The artisan says the job is done. What now?",
    a: "Check the work, then confirm completion. If you do nothing for 72 hours the job is confirmed automatically. If something is wrong, choose “There is a problem” to open a dispute instead of confirming.",
  },
  {
    q: "What is the difference between a dispute and a complaint?",
    a: "A dispute pauses the job and asks our team to decide between the two sides; open one while a job is in progress or within 48 hours of completion. A complaint reports behaviour, such as rudeness or a no-show, without pausing anything. Both are reviewed by a person, and upheld ones lower the other party's standing.",
  },
  {
    q: "How do I pay?",
    a: "Pay the artisan directly, by transfer or cash, once you are satisfied. Where callout deposits are switched on you can pay the deposit online through Paystack; it counts towards the final price. OgaSabi does not hold the payment for the job itself.",
  },
];

export default function HelpPage() {
  return (
    <Shell width="narrow">
      <PageHeader
        title="Help and safety"
        description="Short answers to the questions we hear most."
      />
      <div className="space-y-2">
        {FAQ.map((f) => (
          <details key={f.q} className="group card-surface px-5 py-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span
                className="text-xl text-muted-foreground transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <p className="pb-4 text-foreground/85">{f.a}</p>
          </details>
        ))}
      </div>
      <Prose>
        <h2>Staying safe</h2>
        <ul>
          <li>
            Agree the price in a quote or in messages before work starts, so there is a record.
          </li>
          <li>
            Check the trust breakdown on the artisan&apos;s profile, not just the number. Look for a
            verified badge and recent reviews.
          </li>
          <li>
            Do not pay the full price upfront. A callout fee or a deposit for parts is normal; the
            balance is due when the work is done.
          </li>
          <li>
            Keep conversations in OgaSabi messages until the job is accepted. Our team can only
            review what happened here.
          </li>
          <li>
            If you ever feel unsafe, leave and contact the police. Then tell us, and we will suspend
            the account while we investigate.
          </li>
        </ul>
        <h2 id="contact">Contact us</h2>
        <p>
          For a problem with a specific job, open the job from{" "}
          <Link href="/requests">My requests</Link> and use “Open a dispute” or “File a complaint”.
          That gets it to the right person with all the details attached.
        </p>
        {site.supportEmail || site.supportPhone ? (
          <p>
            For anything else:{" "}
            {site.supportEmail && <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>}
            {site.supportEmail && site.supportPhone && " or "}
            {site.supportPhone && (
              <a href={`tel:${site.supportPhone.replace(/\s/g, "")}`}>{site.supportPhone}</a>
            )}
            .
          </p>
        ) : (
          <p>To report a profile, review or message, use the “Report” link next to it.</p>
        )}
      </Prose>
    </Shell>
  );
}
