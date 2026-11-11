import { Shell, PageHeader } from "@/components/site/shell";
import { Notifications } from "./notifications";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Shell width="narrow">
      <PageHeader title="Notifications" />
      <Notifications />
    </Shell>
  );
}
