
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { PasswordInput } from "@/components/password-input";
import { useAuth, ApiError } from "@/lib/auth-context";

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const redirect = searchParams.get("redirect");
  const registerHref = redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : "/register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
      router.push(redirect || "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-8 text-center font-display text-3xl text-ink">Kirish</h1>
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
        <p className="text-center text-xs text-muted">
          Hisobingiz yo&apos;qmi?{" "}
          <Link href={registerHref} className="text-brand hover:underline">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Yuklanmoqda...</div>}>
      <LoginContent />
    </Suspense>
  );
}
