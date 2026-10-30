"use client";

import { useState } from "react";
import { apiPatch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";
import type { AdminUser } from "@/lib/admin-types";

const BRANCH_SCOPES = ["OWN_BRANCH", "SELECTED_BRANCHES", "ALL_BRANCHES"] as const;

export function EditAdminPanel({
  admin,
  onClose,
  onSaved,
}: {
  admin: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({
    fullName: admin.fullName,
    phone: admin.phone,
    email: admin.email ?? "",
    branchScope: admin.branchScope,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      await apiPatch(
        `/users/${admin.id}`,
        {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email || undefined,
          branchScope: form.branchScope,
        },
        accessToken,
      );
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Ma&apos;lumotlarni tahrirlash</h2>
          <button onClick={onClose} aria-label="Yopish" className="text-muted hover:text-brand">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="To'liq ism"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Telefon (+998...)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
          <input
            placeholder="Email (ixtiyoriy)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
          <select
            value={form.branchScope}
            onChange={(e) => setForm({ ...form, branchScope: e.target.value as AdminUser["branchScope"] })}
            className="input"
          >
            {BRANCH_SCOPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
      </div>
    </div>
  );
}
