"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { PasswordInput } from "@/components/password-input";
import { useAuth, ApiError } from "@/lib/auth-context";
import { apiPost } from "@/lib/api";

type Step = "details" | "otp" | "password";

function RegisterContent() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const redirect = searchParams.get("redirect");
  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function sendOtp() {
    setError(null);
    setLoading(true);
    try {
      await apiPost("/auth/register/request-otp", { phone });
      setCooldown(60);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kod yuborishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendOtp();
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/auth/register/verify-otp", { phone, code });
      setStep("password");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kod tasdiqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(fullName, phone, password);
      router.push(redirect || "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ro'yxatdan o'tishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-8 text-center font-display text-3xl text-ink">Ro&apos;yxatdan o&apos;tish</h1>

      {step === "details" && (
        <form onSubmit={handleDetailsSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
          <label className="block space-y-1">
            <span className="text-xs text-muted">To&apos;liq ism</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" required />
          </label>
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Yuborilmoqda..." : "Tasdiqlash kodini olish"}
          </Button>
          <p className="text-center text-xs text-muted">
            Hisobingiz bormi?{" "}
            <Link href={loginHref} className="text-brand hover:underline">
              Kirish
            </Link>
          </p>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleOtpSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
          <p className="text-sm text-muted">
            <strong className="text-ink">{phone}</strong> raqamiga 6 xonali tasdiqlash kodi yuborildi.
          </p>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Tasdiqlash kodi</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="123456"
              className="input text-center text-lg tracking-[0.5em]"
              maxLength={6}
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? "Tekshirilmoqda..." : "Kodni tasdiqlash"}
          </Button>
          <button
            type="button"
            onClick={sendOtp}
            disabled={cooldown > 0 || loading}
            className="w-full text-center text-xs text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          >
            {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : "Kodni qayta yuborish"}
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
          <p className="text-sm text-muted">
            Telefon raqamingiz tasdiqlandi. Endi hisobingiz uchun parol o&apos;rnating.
          </p>
          <label className="block space-y-1">
            <span className="text-xs text-muted">Parol</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Yuborilmoqda..." : "Ro'yxatdan o'tishni yakunlash"}
          </Button>
        </form>
      )}
    </div>
  );
}
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Yuklanmoqda...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
