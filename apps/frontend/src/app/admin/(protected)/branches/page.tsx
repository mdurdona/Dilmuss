"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/use-permissions";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { AdminBranch } from "@/lib/admin-types";

interface BranchForm {
  name: string;
  code: string;
  region: string;
  city: string;
  address: string;
  phone: string;
}

const EMPTY_FORM: BranchForm = { name: "", code: "", region: "", city: "", address: "", phone: "" };

export default function AdminBranchesPage() {
  const { accessToken } = useAuth();
  const { has, loading: permissionsLoading, error: permissionsError } = usePermissions();
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BranchForm>(EMPTY_FORM);

  function load() {
    if (!accessToken) return;
    apiGet<AdminBranch[]>("/branches?includeInactive=true", accessToken)
      .then(setBranches)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Filiallarni yuklashda xatolik"));
  }

  useEffect(load, [accessToken]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await apiPost("/branches", form, accessToken);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yaratishda xatolik");
    }
  }

  function startEdit(branch: AdminBranch) {
    setEditingId(branch.id);
    setEditForm({
      name: branch.name,
      code: branch.code,
      region: branch.region,
      city: branch.city,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  async function saveEdit(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiPatch(`/branches/${id}`, editForm, accessToken);
      cancelEdit();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tahrirlashda xatolik");
    }
  }

  async function toggleActive(branch: AdminBranch) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiPatch(`/branches/${branch.id}`, { isActive: !branch.isActive }, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  if (permissionsLoading) return null;
  if (permissionsError) return <p className="text-sm text-red-600">Huquqlarni tekshirishda xatolik. Sahifani yangilab ko&apos;ring.</p>;
  if (!has("BRANCH_VIEW")) return <PermissionDenied />;

  return (
    <div>
      <PageHeader
        title="Filiallar"
        action={
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Bekor qilish" : "+ Yangi filial"}
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid gap-3 rounded-xl border border-line bg-surface p-6 sm:grid-cols-2">
          <input required placeholder="Nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input required placeholder="Kod (masalan BRANCH2)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input" />
          <input required placeholder="Viloyat" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="input" />
          <input required placeholder="Shahar" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" />
          <input placeholder="Manzil" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
          <input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="sm:col-span-2">
            Saqlash
          </Button>
        </form>
      )}

      {!showForm && error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-line bg-surface p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-3 py-2">Nomi</th>
              <th className="px-3 py-2">Kod</th>
              <th className="px-3 py-2">Hudud</th>
              <th className="px-3 py-2">Manzil</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Asosiy</th>
              <th className="px-3 py-2">Holat</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) =>
              editingId === b.id ? (
                <tr key={b.id} className="border-b border-line last:border-0 bg-brand-light/30">
                  <td className="px-3 py-2">
                    <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input w-full" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} className="input w-full" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <input placeholder="Viloyat" value={editForm.region} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} className="input w-full" />
                      <input placeholder="Shahar" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="input w-full" />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="input w-full" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input w-full" />
                  </td>
                  <td className="px-3 py-2">{b.isMain ? "Ha" : "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={b.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => saveEdit(b.id)} className="text-xs text-brand hover:underline">
                        Saqlash
                      </button>
                      <button onClick={cancelEdit} className="text-xs text-muted hover:underline">
                        Bekor qilish
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{b.name}</td>
                  <td className="px-3 py-2 text-muted">{b.code}</td>
                  <td className="px-3 py-2 text-muted">
                    {b.region}, {b.city}
                  </td>
                  <td className="px-3 py-2 text-muted">{b.address || "—"}</td>
                  <td className="px-3 py-2 text-muted">{b.phone || "—"}</td>
                  <td className="px-3 py-2">{b.isMain ? "Ha" : "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={b.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(b)} className="text-xs text-brand hover:underline">
                        Tahrirlash
                      </button>
                      <button onClick={() => toggleActive(b)} className="text-xs text-brand hover:underline">
                        {b.isActive ? "Faolsizlantirish" : "Faollashtirish"}
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
