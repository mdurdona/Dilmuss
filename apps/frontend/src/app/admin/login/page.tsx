"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { PasswordInput } from "@/components/password-input";
import { Logo } from "@/components/logo";
import { useAuth, ApiError } from "@/lib/auth-context";

function AdminLoginContent() {
  const { user, loading: authLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && (user.role === "ADMIN" || user.role === "SUPERADMIN")) {
      router.replace(searchParams.get("redirect") || "/admin");
    }
  }, [authLoading, user, router, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
      router.push(searchParams.get("redirect") || "/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="text-sm font-medium text-muted">Admin panel</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
          <label className="block space-y-1">
            <span className="text-xs text-muted">Telefon raqam</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998901112233"
              className="input"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Parol</span>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Kirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </div>
    </div>
  );
}
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Yuklanmoqda...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
