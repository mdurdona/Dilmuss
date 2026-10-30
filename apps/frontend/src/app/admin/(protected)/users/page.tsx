"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { PermissionsPanel } from "@/components/admin/permissions-panel";
import { EditAdminPanel } from "@/components/admin/edit-admin-panel";
import { ChangePasswordPanel } from "@/components/admin/change-password-panel";
import { AssignBranchPanel } from "@/components/admin/assign-branch-panel";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { AdminUser } from "@/lib/admin-types";

const BRANCH_SCOPES = ["OWN_BRANCH", "SELECTED_BRANCHES", "ALL_BRANCHES"] as const;

export default function AdminUsersPage() {
  const { accessToken, user: currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === "SUPERADMIN";
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "", branchScope: "OWN_BRANCH" });
  const [error, setError] = useState<string | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<AdminUser | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null);
  const [branchFor, setBranchFor] = useState<AdminUser | null>(null);
  const [forbidden, setForbidden] = useState(false);

  function load() {
    if (!accessToken) return;
    apiGet<AdminUser[]>("/users/admins", accessToken)
      .then(setAdmins)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      });
  }

  useEffect(load, [accessToken]);

  if (forbidden) return <PermissionDenied />;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await apiPost("/users/admins", { ...form, email: form.email || undefined }, accessToken);
      setForm({ fullName: "", phone: "", email: "", password: "", branchScope: "OWN_BRANCH" });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yaratishda xatolik");
    }
  }

  async function toggleStatus(admin: AdminUser) {
    if (!accessToken) return;
    const next = admin.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setError(null);
    try {
      await apiPatch(`/users/${admin.id}/status`, { status: next }, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  const visibleAdmins = admins.filter((admin) => admin.role !== "SUPERADMIN");

  return (
    <div>
      <PageHeader
        title="Adminlar"
        action={
          isSuperadmin && (
            <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Bekor qilish" : "+ Yangi admin"}
            </Button>
          )
        }
      />

      {isSuperadmin && showForm && (
        <form onSubmit={handleCreate} className="mb-6 grid gap-3 rounded-xl border border-line bg-surface p-6 sm:grid-cols-2">
          <input required placeholder="To'liq ism" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input" />
          <input required placeholder="Telefon (+998...)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          <input placeholder="Email (ixtiyoriy)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          <input required type="password" placeholder="Parol" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" />
          <select value={form.branchScope} onChange={(e) => setForm({ ...form, branchScope: e.target.value })} className="input sm:col-span-2">
            {BRANCH_SCOPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="sm:col-span-2">
            Saqlash
          </Button>
        </form>
      )}

      {error && !showForm && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-line bg-surface p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-3 py-2">Ism</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Filial huquqi</th>
              <th className="px-3 py-2">Holat</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleAdmins.map((admin) => (
              <tr key={admin.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">{admin.fullName}</td>
                <td className="px-3 py-2 text-muted">{admin.phone}</td>
                <td className="px-3 py-2 text-muted">{admin.role}</td>
                <td className="px-3 py-2 text-muted">{admin.branchScope}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={admin.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-3">
                    {isSuperadmin && (
                      <button onClick={() => setEditingAdmin(admin)} className="text-xs text-muted hover:text-brand">
                        Tahrirlash
                      </button>
                    )}
                    {isSuperadmin && (
                      <button onClick={() => setPermissionsFor(admin)} className="text-xs text-muted hover:text-brand">
                        Huquqlar
                      </button>
                    )}
                    {isSuperadmin && (
                      <button onClick={() => setPasswordFor(admin)} className="text-xs text-muted hover:text-brand">
                        Parol
                      </button>
                    )}
                    {isSuperadmin && (
                      <button onClick={() => setBranchFor(admin)} className="text-xs text-muted hover:text-brand">
                        Filial
                      </button>
                    )}
                    {admin.id !== currentUser?.id && (
                      <button onClick={() => toggleStatus(admin)} className="text-xs text-muted hover:text-brand">
                        {admin.status === "ACTIVE" ? "Bloklash" : "Faollashtirish"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleAdmins.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  Adminlar topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {permissionsFor && <PermissionsPanel admin={permissionsFor} onClose={() => setPermissionsFor(null)} />}
      {editingAdmin && (
        <EditAdminPanel admin={editingAdmin} onClose={() => setEditingAdmin(null)} onSaved={load} />
      )}
      {passwordFor && <ChangePasswordPanel admin={passwordFor} onClose={() => setPasswordFor(null)} />}
      {branchFor && <AssignBranchPanel admin={branchFor} onClose={() => setBranchFor(null)} onSaved={load} />}
    </div>
  );
}
