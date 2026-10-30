"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPatch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/button";
import type { AuthUser } from "@/lib/types";

export default function AdminProfilePage() {
  const { user, accessToken, setUser } = useAuth();
  const [form, setForm] = useState({ fullName: user?.fullName ?? "", email: user?.email ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiPatch<AuthUser>(
        "/users/me",
        { fullName: form.fullName, email: form.email || undefined },
        accessToken,
      );
      setUser(updated);
      setSuccess("Saqlandi");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader
        title="Mening profilim"
        action={
          <Link href="/admin">
            <Button variant="outline">← Orqaga</Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-line bg-surface p-6">
        <label className="block space-y-1">
          <span className="text-xs text-muted">To&apos;liq ism</span>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="input"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted">Email</span>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </label>
        <div className="space-y-1 border-t border-line pt-3 text-sm">
          <p className="text-xs text-muted">Telefon</p>
          <p className="text-ink">{user.phone}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button type="submit" disabled={saving}>
          Saqlash
        </Button>
      </form>
    </div>
  );
}
