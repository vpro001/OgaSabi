import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "OgaSabi: artisans you can trust", template: "%s | OgaSabi" },
  description:
    "Find verified, trust-scored electricians, plumbers, AC and generator technicians, mechanics and more near you.",
  applicationName: "OgaSabi",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: { type: "website", siteName: "OgaSabi", locale: "en_NG" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4fbf6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1410" },
  ],
};

// Applies the saved/system colour scheme before first paint so there is no light-to-dark flash.
const themeScript = `(function(){try{var t=localStorage.getItem('ogasabi-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by src/proxy.ts; lets this one inline script run under the Content-Security-Policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
