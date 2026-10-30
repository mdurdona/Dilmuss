"use client";

import { useAuth } from "@/lib/auth-context";

// Intl'ning "uz-UZ" lokali oy nomlarini to'liq bermaydi (masalan "M09" chiqadi) — shu sabab qo'lda ro'yxat.
const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const createdAt = new Date(user.createdAt);
  const memberSince = `${UZ_MONTHS[createdAt.getMonth()]} ${createdAt.getFullYear()}`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-4 bg-brand-light p-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-semibold text-white">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{user.fullName}</p>
          <p className="text-xs text-muted">{memberSince} dan beri a&apos;zo</p>
        </div>
      </div>

      <div className="divide-y divide-line">
        <Row
          label="Ism"
          value={user.fullName}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
            </svg>
          }
        />
        <Row
          label="Telefon"
          value={user.phone}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6.5 4h3l1.5 4.5-2 1.5a11 11 0 0 0 5 5l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z" strokeLinejoin="round" />
            </svg>
          }
        />
        <Row
          label="Email"
          value={user.email ?? "Kiritilmagan"}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 6.5 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 text-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line/60 text-ink/50">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-ink">{value}</p>
      </div>
    </div>
  );
}
