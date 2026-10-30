"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function Footer() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <footer className="border-t border-line bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="border-t border-line pt-8">
          <div className="mb-6 flex items-center gap-8">
            <Logo />
            <div className="flex gap-2">
              <a href="https://www.instagram.com/dilmussuzzz/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500 text-white hover:opacity-90 transition-opacity">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17" cy="7" r="1" fill="currentColor" />
                </svg>
              </a>
              <a href="https://t.me/dilmusschilonzor" target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0088cc] text-white hover:opacity-90 transition-opacity">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.898 2.009l-17.798 6.602c-1.067.395-1.275 1.051-.221 1.336l4.613 1.425 10.672-6.604c.499-.304.955-.146.579.254l-8.65 7.807 1.099 3.56c.156.808.707 1.005 1.397.633l3.392-2.701 4.461 3.368c.82.613 1.412.288 1.6-.99l2.858-13.487c.286-1.134-.217-1.696-1.052-1.403z" />
                </svg>
              </a>
            </div>
            <nav className="flex gap-6 text-sm text-ink">
              <Link href="#" className="hover:text-brand">Biz haqimizda</Link>
              <Link href="#" className="hover:text-brand">Yetkazib berish</Link>
              <button onClick={() => setContactOpen(!contactOpen)} className="hover:text-brand">
                Aloqa
              </button>
            </nav>
            {contactOpen && (
              <div className="flex gap-3 ml-auto">
                <a href="tel:+998900474444" className="text-sm text-brand hover:underline">
                  +998900474444
                </a>
                <a href="tel:+998900474747" className="text-sm text-brand hover:underline">
                  +998900474747
                </a>
              </div>
            )}
          </div>
          <p className="text-xs text-muted">&copy; 2026 Dilmuss. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </footer>
  );
}
