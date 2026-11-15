-- Monetisation switches (ADR-023): a service fee on the callout deposit and sponsored placement
-- in search. Both are off until an administrator turns them on.

-- AlterTable
ALTER TABLE "artisan_profiles" ADD COLUMN     "sponsoredUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "platformFeeKobo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "serviceFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "serviceFeeBps" INTEGER NOT NULL DEFAULT 500,
    "sponsoredEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sponsoredSlots" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artisan_profiles_sponsoredUntil_idx" ON "artisan_profiles"("sponsoredUntil");

-- Integrity rules Prisma cannot express.
ALTER TABLE "platform_settings"
  ADD CONSTRAINT "platform_settings_singleton_chk" CHECK ("id" = 1),
  ADD CONSTRAINT "platform_settings_fee_chk" CHECK ("serviceFeeBps" BETWEEN 0 AND 3000),
  ADD CONSTRAINT "platform_settings_slots_chk" CHECK ("sponsoredSlots" BETWEEN 1 AND 5);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_fee_chk" CHECK ("platformFeeKobo" >= 0 AND "platformFeeKobo" < "amountKobo");

INSERT INTO "platform_settings" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);
