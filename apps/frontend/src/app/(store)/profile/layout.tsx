"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  {
    href: "/profile",
    label: "Shaxsiy ma'lumotlar",
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/profile/orders",
    label: "Buyurtmalarim",
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M21 8 12 4 3 8l9 4 9-4Z" strokeLinejoin="round" />
        <path d="M3 8v8l9 4 9-4V8" strokeLinejoin="round" />
        <path d="M12 12v8" />
      </svg>
    ),
  },
  {
    href: "/favorites",
    label: "Saralangan",
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.6 2.3 4 6 4c2.2 0 3.7 1.2 6 3.5C14.3 5.2 15.8 4 18 4c3.7 0 5.6 3.6 4 7.2-2.5 4.7-10 9.3-10 9.3Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/profile/addresses",
    label: "Manzillarim",
    exact: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z" strokeLinejoin="round" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
];

const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 opacity-40">
    <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ProfileLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted">Yuklanmoqda...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl text-ink">Mening profilim</h1>
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <aside className="w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface md:w-72">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-muted">{user.phone}</p>
            </div>
          </div>

          <nav className="divide-y divide-line">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition ${
                    active ? "bg-brand-light text-brand" : "text-ink/80 hover:bg-brand-light/50"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      active ? "bg-brand text-white" : "bg-line/60 text-ink/50"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronIcon />
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-line">
            <button
              onClick={async () => {
                if (!window.confirm("Chiqishni xohlaysizmi?")) return;
                await logout();
                router.push("/");
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink/70 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line/60 text-ink/50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="flex-1">Chiqish</span>
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
