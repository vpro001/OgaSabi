"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  ChevronDown,
  ClipboardList,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/feedback";
import { Dialog } from "@/components/ui/dialog";
import { Logo } from "@/components/site/logo";
import { LocationPicker } from "@/components/site/location-picker";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { useMe, useSignOut } from "@/hooks/use-auth";
import { usePlace } from "@/hooks/use-place";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/search", label: "Find artisans" },
  { href: "/how-trust-works", label: "How trust works" },
  { href: "/artisan", label: "For artisans" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { me } = useMe();
  const { place } = usePlace();
  const signOut = useSignOut();
  const [picker, setPicker] = useState(false);
  const [menu, setMenu] = useState(false);

  const accountLinks = me
    ? [
        { href: "/requests", label: "My requests", icon: ClipboardList },
        ...(me.artisan ? [{ href: "/artisan", label: "Artisan dashboard", icon: Briefcase }] : []),
        ...(me.roles.includes("ADMIN")
          ? [{ href: "/admin", label: "Admin", icon: LayoutDashboard }]
          : []),
        { href: "/favorites", label: "Saved artisans", icon: Heart },
        { href: "/notifications", label: "Notifications", icon: Bell },
        { href: "/settings", label: "Settings", icon: Settings },
      ]
    : [];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const name = me ? `${me.firstName} ${me.lastName}` : "";

  return (
    <header className="sticky top-0 z-40 border-b-2 bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-stretch justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Logo />
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="hidden min-h-10 max-w-52 items-center gap-1.5 border-2 border-dashed px-2.5 ticket-label hover:border-solid hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          >
            <MapPin className="size-4 shrink-0 text-accent" aria-hidden />
            <span className="truncate">
              {place ? `${place.label}${place.city ? `, ${place.city}` : ""}` : "Set your area"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </div>

        <nav aria-label="Main" className="hidden items-stretch lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="flex items-center border-l-2 px-4 ticket-label last:border-r-2 hover:bg-accent hover:text-accent-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {me ? (
            <>
              <Link
                href="/notifications"
                aria-label={`Notifications${me.unreadNotifications ? `, ${me.unreadNotifications} unread` : ""}`}
                className="relative inline-flex tap-target items-center justify-center hover:bg-accent hover:text-accent-foreground"
              >
                <Bell className="size-5" aria-hidden />
                {me.unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex min-w-4.5 items-center justify-center rounded-none bg-destructive px-1 font-label text-[10px] leading-4.5 font-bold text-destructive-foreground ring-2 ring-background">
                    {me.unreadNotifications > 9 ? "9+" : me.unreadNotifications}
                  </span>
                )}
              </Link>
              <details className="group relative hidden lg:block">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 pr-2 pl-1 hover:bg-accent hover:text-accent-foreground [&::-webkit-details-marker]:hidden">
                  <Avatar name={name} src={me.avatarUrl} className="size-9" />
                  <span className="max-w-28 truncate text-sm font-semibold">{me.firstName}</span>
                  <ChevronDown
                    className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="absolute right-0 mt-2 w-64 border-2 bg-card p-1.5 shadow-lg">
                  {accountLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold hover:bg-accent hover:text-accent-foreground"
                    >
                      <l.icon className="size-4.5 text-muted-foreground" aria-hidden />
                      {l.label}
                    </Link>
                  ))}
                  <hr className="my-1.5" />
                  <ThemeToggle className="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-semibold hover:bg-accent hover:text-accent-foreground [&_svg]:size-4.5 [&_svg]:text-muted-foreground" />
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="size-4.5" aria-hidden />
                    Sign out
                  </button>
                </div>
              </details>
            </>
          ) : (
            me === null && (
              <>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "hidden sm:inline-flex",
                  )}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: "accent", size: "sm" }),
                    "hidden sm:inline-flex",
                  )}
                >
                  Get started
                </Link>
              </>
            )
          )}
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-label="Open menu"
            className="inline-flex tap-target items-center justify-center border-2 hover:bg-accent lg:hidden"
          >
            <Menu className="size-6" aria-hidden />
          </button>
        </div>
      </div>

      <LocationPicker open={picker} onClose={() => setPicker(false)} />

      <Dialog
        open={menu}
        onClose={() => setMenu(false)}
        title={me ? `Hello, ${me.firstName}` : "Menu"}
      >
        <nav
          aria-label="Mobile"
          className="space-y-1"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setMenu(false)}
        >
          <button
            type="button"
            onClick={() => {
              setMenu(false);
              setPicker(true);
            }}
            className="flex min-h-12 w-full items-center gap-3 px-3 text-left font-semibold hover:bg-accent hover:text-accent-foreground"
          >
            <MapPin className="size-5 text-accent" aria-hidden />
            <span className="truncate">
              {place ? `${place.label}${place.city ? `, ${place.city}` : ""}` : "Set your area"}
            </span>
          </button>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-12 items-center gap-3 px-3 font-semibold hover:bg-accent hover:text-accent-foreground"
            >
              {item.href === "/search" ? (
                <UserRound className="size-5 text-muted-foreground" aria-hidden />
              ) : item.href === "/artisan" ? (
                <Briefcase className="size-5 text-muted-foreground" aria-hidden />
              ) : (
                <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
              )}
              {item.label}
            </Link>
          ))}
          {accountLinks.length > 0 && <hr className="my-2" />}
          {accountLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex min-h-12 items-center gap-3 px-3 font-semibold hover:bg-accent hover:text-accent-foreground"
            >
              <l.icon className="size-5 text-muted-foreground" aria-hidden />
              {l.label}
            </Link>
          ))}
          <hr className="my-2" />
          <ThemeToggle className="flex min-h-12 w-full items-center gap-3 px-3 font-semibold hover:bg-accent hover:text-accent-foreground [&_svg]:text-muted-foreground" />
          {me ? (
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-5" aria-hidden />
              Sign out
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants({ variant: "accent" })}>
                Get started
              </Link>
            </div>
          )}
        </nav>
      </Dialog>
    </header>
  );
}
