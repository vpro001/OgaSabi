import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: { default: "OgaSabi: artisans you can trust", template: "%s | OgaSabi" },
  description:
    "Find verified, trust-scored electricians, plumbers, AC and generator technicians, mechanics and more near you.",
  applicationName: "OgaSabi",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1612" },
  ],
};

// Applies the saved/system colour scheme before first paint so there is no light-to-dark flash.
const themeScript = `(function(){try{var t=localStorage.getItem('ogasabi-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
