import { NextResponse } from "next/server";

/** The envelope every /api/v1 response uses. */
export type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { nextCursor?: string | null; total?: number };
};

export function ok<T>(
  data: T,
  init?: { status?: number; meta?: ApiEnvelope<T>["meta"]; headers?: HeadersInit },
) {
  const body: ApiEnvelope<T> = { success: true, data };
  if (init?.meta) body.meta = init.meta;
  return NextResponse.json(body, { status: init?.status ?? 200, headers: init?.headers });
}

export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
  headers?: HeadersInit,
) {
  const body: ApiEnvelope<never> = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return NextResponse.json(body, { status, headers });
}
