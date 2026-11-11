import { type NextRequest, NextResponse } from "next/server";

// Pages that need a session. This is a courtesy redirect driven by a non-secret hint cookie:
// the real access control is in the API handlers, which verify the session on every call.
const PROTECTED = [
  "/requests",
  "/booking",
  "/favorites",
  "/notifications",
  "/settings",
  "/admin",
  "/artisan/onboarding",
  "/artisan/profile",
  "/artisan/verification",
];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.get("og_s")?.value === "1";

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && AUTH_PAGES.includes(pathname) && !request.nextUrl.searchParams.has("next")) {
    const url = request.nextUrl.clone();
    url.pathname = "/requests";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // A fresh nonce per request lets Next's own inline scripts run under a strict policy.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const storage = process.env.S3_PUBLIC_BASE_URL
    ? ` ${new URL(process.env.S3_PUBLIC_BASE_URL).origin}`
    : "";
  const s3 =
    process.env.STORAGE_PROVIDER === "s3"
      ? " https://*.amazonaws.com" +
        (process.env.S3_ENDPOINT ? ` ${new URL(process.env.S3_ENDPOINT).origin}` : "")
      : "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used for measured widths (progress bars); no inline scripts are allowed.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${storage}${s3}`,
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
