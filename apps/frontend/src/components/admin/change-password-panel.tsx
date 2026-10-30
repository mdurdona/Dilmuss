"use client";

import { useState } from "react";
import { apiPatch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";
import type { AdminUser } from "@/lib/admin-types";

export function ChangePasswordPanel({ admin, onClose }: { admin: AdminUser; onClose: () => void }) {
  const { accessToken } = useAuth();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch(`/users/${admin.id}`, { password }, accessToken);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Parolni o'zgartirishda xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Parolni o&apos;zgartirish</h2>
          <button onClick={onClose} aria-label="Yopish" className="text-muted hover:text-brand">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          {admin.fullName} ({admin.phone}) uchun yangi parol o&apos;rnatiladi.
        </p>

        {success ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">Parol muvaffaqiyatli o&apos;zgartirildi.</p>
            <Button onClick={onClose} className="w-full">
              Yopish
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              minLength={6}
              type="password"
              placeholder="Yangi parol (kamida 6 belgi)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoFocus
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                Saqlash
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Bekor qilish
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
