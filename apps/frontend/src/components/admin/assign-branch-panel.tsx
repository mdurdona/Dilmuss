"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";
import type { AdminBranch, AdminUser } from "@/lib/admin-types";

export function AssignBranchPanel({
  admin,
  onClose,
  onSaved,
}: {
  admin: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { accessToken } = useAuth();
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiGet<AdminBranch[]>("/branches?includeInactive=true", accessToken)
      .then((res) => {
        setBranches(res);
        const main = res.find((b) => b.isMain) ?? res[0];
        if (main) setBranchId(main.id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Filiallarni yuklashda xatolik"));
  }, [accessToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/branches/${branchId}/users/${admin.id}`, { isPrimary: true }, accessToken);
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Biriktirishda xatolik");
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
          <h2 className="font-display text-xl text-ink">Filialga biriktirish</h2>
          <button onClick={onClose} aria-label="Yopish" className="text-muted hover:text-brand">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          {admin.fullName} ({admin.phone}) uchun asosiy filial belgilanadi. Filialga oid bo&apos;limlar
          (masalan Ombor) shu filial bo&apos;yicha ochiladi.
        </p>

        {success ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">Filial muvaffaqiyatli biriktirildi.</p>
            <Button onClick={onClose} className="w-full">
              Yopish
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input" autoFocus>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.region}, {b.city})
                </option>
              ))}
            </select>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving || !branchId} className="flex-1">
                Biriktirish
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
