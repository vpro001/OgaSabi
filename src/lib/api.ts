// Browser client for /api/v1. Every response uses the same envelope (see server/http/response.ts).

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: { fields?: Record<string, string> } };
  meta?: { nextCursor?: string | null; total?: number };
};

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, shared by every request that hit a 401 together. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/v1/auth/refresh", { method: "POST", credentials: "same-origin" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send<T>(path: string, o: Options): Promise<Envelope<T> & { status: number }> {
  const res = await fetch(`/api/v1${path}`, {
    method: o.method ?? "GET",
    credentials: "same-origin",
    signal: o.signal,
    headers: {
      ...(o.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...o.headers,
    },
    body: o.form ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined),
  });
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  return { ...(json ?? { success: false }), status: res.status };
}

export async function apiWithMeta<T>(
  path: string,
  options: Options = {},
): Promise<{ data: T; meta: NonNullable<Envelope<T>["meta"]> }> {
  let res: Envelope<T> & { status: number };
  try {
    res = await send<T>(path, options);
    const isAuthCall = path.startsWith("/auth/") && path !== "/auth/me";
    if (res.status === 401 && !isAuthCall && (await refreshSession()))
      res = await send<T>(path, options);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      "NETWORK",
      "You appear to be offline. Check your connection and try again.",
      0,
    );
  }
  if (!res.success || res.data === undefined) {
    throw new ApiError(
      res.error?.code ?? "UNKNOWN",
      res.error?.message ?? "Something went wrong. Please try again.",
      res.status,
      res.error?.details?.fields,
    );
  }
  return { data: res.data, meta: res.meta ?? {} };
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  return (await apiWithMeta<T>(path, options)).data;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export type UploadPurpose = "avatar" | "portfolio" | "request" | "verification" | "evidence";

/** Shrinks large photos in the browser first: uploads over mobile data stay small and fast. */
async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.size < 400_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
): Promise<{ key: string; url: string }> {
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", await compressImage(file), file.name);
  return api<{ key: string; url: string }>("/uploads", { method: "POST", form });
}
