import { Shell } from "@/components/site/shell";
import { BookingWizard } from "./booking-wizard";

export const metadata = { title: "Send a request" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Shell width="narrow">
      <BookingWizard artisanId={id} />
    </Shell>
  );
}
