import { type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api";

/** Only same-site paths are accepted as a post-login destination (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : fallback;
}

/** Puts server-side field errors next to the right inputs; returns a message for anything else. */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  known: readonly string[],
): string | null {
  if (err instanceof ApiError) {
    const hits = Object.entries(err.fields).filter(([field]) => known.includes(field));
    for (const [field, message] of hits) setError(field as Path<T>, { message });
    if (hits.length > 0) return null;
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
