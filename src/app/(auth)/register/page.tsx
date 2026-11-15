import { Suspense } from "react";
import { smsEnabled } from "@/server/providers/messaging";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm emailRequired={!smsEnabled()} />
    </Suspense>
  );
}
