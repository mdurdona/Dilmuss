"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiGet } from "@/lib/api";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Category } from "@/lib/types";

const NAV_LINKS = [
  { href: "/", label: "Bosh sahifa" },
  { href: "/catalog", label: "Katalog" },
  { href: "/catalog?sale=1", label: "Chegirma" },
];

/** Oy raqamiga qarab joriy mavsum — kolleksiya havolasi har mavsum avtomatik o'zgaradi. */
function currentSeason(): { value: string; label: string } {
  const month = new Date().getMonth(); // 0 = yanvar
  if (month >= 8 && month <= 10) return { value: "kuz", label: "Kuzgi kiyimlar" };
  if (month === 11 || month <= 1) return { value: "qish", label: "Qishki kolleksiya" };
  if (month >= 2 && month <= 4) return { value: "bahor", label: "Bahorgi kolleksiya" };
  return { value: "yoz", label: "Yozgi kolleksiya" };
}

export function Header() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    apiGet<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const clothing = categories[0];
  const season = currentSeason();

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(q ? `/catalog?search=${encodeURIComponent(q)}` : "/catalog");
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 md:gap-4">
        <button className="text-ink md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menyu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <form onSubmit={submitSearch} className="hidden flex-1 md:block">
          <div className="flex items-center rounded-full border border-line bg-surface pl-4 transition focus-within:border-brand">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Mahsulotlar va turkumlar izlash"
              className="w-full bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              aria-label="Qidirish"
              className="ml-2 flex h-10 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1 text-ink md:ml-0">
          <ThemeToggle className="hidden md:flex" />

          <div className="relative md:hidden">
            <button
              type="button"
              aria-label="Qidirish"
              onClick={() => setSearchOpen((v) => !v)}
              className={searchOpen ? "flex h-9 w-9 items-center justify-center text-brand" : "flex h-9 w-9 items-center justify-center hover:text-brand"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
            </button>

            {searchOpen && (
              <div className="fixed inset-x-4 top-16 z-50 rounded-xl border border-line bg-surface p-2 shadow-lg">
                <form onSubmit={submitSearch} className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Mahsulot qidirish..."
                    className="input flex-1"
                  />
                  <button type="submit" className="shrink-0 text-sm font-medium text-brand hover:underline">
                    Qidirish
                  </button>
                </form>
              </div>
            )}
          </div>

          <Link
            href={user ? "/profile" : "/login"}
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm hover:bg-brand-light hover:text-brand md:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
            </svg>
            {user ? "Profil" : "Kirish"}
          </Link>

          {user && (
            <Link
              href="/favorites"
              aria-label="Saralangan"
              className="flex items-center gap-1.5 rounded-full px-2 py-2 text-sm hover:bg-brand-light hover:text-brand md:px-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.6 2.3 4 6 4c2.2 0 3.7 1.2 6 3.5C14.3 5.2 15.8 4 18 4c3.7 0 5.6 3.6 4 7.2-2.5 4.7-10 9.3-10 9.3Z" strokeLinejoin="round" />
              </svg>
              <span className="hidden md:inline">Saralangan</span>
            </Link>
          )}

          <Link
            href="/cart"
            aria-label="Savat"
            className="flex items-center gap-1.5 rounded-full px-2 py-2 text-sm hover:bg-brand-light hover:text-brand md:px-3"
          >
            <span className="relative flex">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 8h12l-1 12H7L6 8Z" strokeLinejoin="round" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-medium text-white">
                  {itemCount}
                </span>
              )}
            </span>
            <span className="hidden md:inline">Savat</span>
          </Link>
        </div>
      </div>

      <div className="hidden border-t border-line md:block">
        <nav className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 py-2.5 text-sm text-ink/80 sm:px-6">
          <Link href="/catalog" className="shrink-0 font-semibold text-ink transition hover:text-brand">
            Barcha mahsulotlar
          </Link>
          <Link href={`/catalog?season=${season.value}`} className="shrink-0 whitespace-nowrap transition hover:text-brand">
            {season.label}
          </Link>
          {clothing?.children.map((child) => (
            <Link
              key={child.id}
              href={`/catalog?category=${child.slug}`}
              className="shrink-0 whitespace-nowrap transition hover:text-brand"
            >
              {child.name}
            </Link>
          ))}
          <Link href="/catalog?sale=1" className="shrink-0 whitespace-nowrap text-brand transition hover:underline">
            Chegirma
          </Link>
        </nav>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-line bg-cream px-4 py-3 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-2 py-2 text-sm text-ink/80 hover:bg-brand-light"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-1 flex items-center gap-2 border-t border-line px-2 pt-3 text-sm text-ink/80">
            <ThemeToggle />
            Qorong'u rejim
          </div>
        </nav>
      )}
    </header>
  );
}
