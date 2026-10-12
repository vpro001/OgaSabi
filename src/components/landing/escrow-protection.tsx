"use client";

export function EscrowProtectionSection() {
  return (
    <section className="bg-surface w-full py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-label text-xs font-bold tracking-wider text-emerald-900 uppercase">
            <span className="material-symbols-outlined text-[15px]">lock</span>
            <span>Escrow Architecture</span>
          </div>
          <h2 className="text-on-surface font-headline text-2xl font-extrabold tracking-tight sm:text-4xl">
            How OgaSabi Protects Your Home & Wallet
          </h2>
          <p className="text-on-surface-variant mt-2 font-body text-base sm:text-lg">
            Zero surprises. No unapproved runaway costs. Complete accountability from doorbell to
            finish.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="absolute top-12 right-[18%] left-[18%] z-0 hidden h-0.5 bg-gradient-to-r from-emerald-600 via-[#fe932c] to-emerald-600 opacity-40 md:block" />

          <EscrowStep
            number="01"
            numberBg="from-primary to-primary-container"
            title="Search Problem & See Trust"
            description="Describe the fault. Inspect true GPS proximity, real milestone job logs, and guaranteed inspection rates before inviting anyone inside."
            highlightIcon={
              <span className="material-symbols-outlined text-[18px] text-emerald-800">
                visibility_off
              </span>
            }
            highlightText="Your exact house address stays completely shielded until you confirm inspection."
          />

          <EscrowStep
            number="02"
            numberBg="from-[#fe932c] to-[#904d00]"
            title="Lock Payment in Escrow"
            description="Approve diagnostic or repair estimates. Your funds stay secured in institutional custody—never sent directly into private artisan accounts upfront."
            highlightIcon={
              <span className="material-symbols-outlined text-[18px] text-[#fe932c]">
                assured_workload
              </span>
            }
            highlightText="Held in regulated custody under CBN-licensed merchant partner bank."
          />

          <EscrowStep
            number="03"
            numberBg="from-primary to-[#0a4d28]"
            title="Inspect & Release with OTP"
            description="The technician tests circuits, pipes, or motors right in your presence. When satisfied, generate your one-time release OTP to authorize payment."
            highlightIcon={
              <span className="material-symbols-outlined text-[18px] text-emerald-800">
                verified
              </span>
            }
            highlightText="Covered automatically by OgaSabi 14-day warranty and rework guarantee."
          />
        </div>
      </div>
    </section>
  );
}

function EscrowStep({
  number,
  numberBg,
  title,
  description,
  highlightIcon,
  highlightText,
}: {
  number: string;
  numberBg: string;
  title: string;
  description: string;
  highlightIcon: React.ReactNode;
  highlightText: string;
}) {
  return (
    <div className="group relative z-10 flex flex-col justify-between rounded-2xl border border-emerald-900/10 bg-white p-7 shadow-md transition-all duration-300 hover:shadow-xl">
      <div>
        <div
          className={cn(
            "mb-6 flex h-14 w-14 items-center justify-center rounded-2xl font-label text-xl font-black text-white shadow-md transition-transform group-hover:scale-110",
            numberBg,
          )}
          style={{
            boxShadow: `0 4px 12px -2px ${numberBg.split(" ")[1]?.replace("to-", "") || numberBg.split(" ")[0]?.replace("from-", "")}40`,
          }}
        >
          {number}
        </div>
        <h3 className="text-on-surface mb-2 font-headline text-lg font-bold">{title}</h3>
        <p className="text-on-surface-variant font-body text-sm leading-relaxed">{description}</p>
      </div>
      <div className="border-outline-variant/30 text-on-surface mt-6 flex items-start gap-2 rounded-xl border bg-surface-container-low p-3 text-xs">
        {highlightIcon}
        <span className="text-on-surface-variant leading-tight">{highlightText}</span>
      </div>
    </div>
  );
}
