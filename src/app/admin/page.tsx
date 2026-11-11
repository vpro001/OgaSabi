import { Suspense } from "react";
import { Shell } from "@/components/site/shell";
import { PageLoading } from "@/components/ui/feedback";
import { AdminConsole } from "./admin-console";

export const metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <Shell width="wide">
      <Suspense fallback={<PageLoading />}>
        <AdminConsole />
      </Suspense>
    </Shell>
  );
}
