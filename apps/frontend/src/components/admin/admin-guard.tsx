"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/admin/login");
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted">Yuklanmoqda...</div>;
  }

  if (!user) return null;

  if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-2xl text-ink">Ruxsat yo&apos;q</p>
        <p className="text-muted">Bu bo&apos;limga kirish uchun admin huquqi kerak.</p>
      </div>
    );
  }

  return <>{children}</>;
}
