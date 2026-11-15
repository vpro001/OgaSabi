import { Suspense } from "react";
import { PageLoading } from "@/components/ui/feedback";
import { AdminConsole } from "./admin-console";

export const metadata = { title: "Admin", robots: { index: false } };

// The admin area brings its own frame (sidebar and top bar), so it does not use the public Shell.
export default function AdminPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminConsole />
    </Suspense>
  );
}
