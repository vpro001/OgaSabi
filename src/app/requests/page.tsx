import { Shell, PageHeader } from "@/components/site/shell";
import { MyRequests } from "./my-requests";

export const metadata = { title: "My requests" };

export default function RequestsPage() {
  return (
    <Shell>
      <PageHeader
        title="My requests"
        description="Every request you have sent, and where each one stands."
      />
      <MyRequests />
    </Shell>
  );
}
