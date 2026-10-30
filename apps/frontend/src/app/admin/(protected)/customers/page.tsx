"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { AdminUser } from "@/lib/admin-types";

export default function AdminCustomersPage() {
  const { accessToken } = useAuth();
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load(query: string) {
    if (!accessToken) return;
    const path = query ? `/users/customers?search=${encodeURIComponent(query)}` : "/users/customers";
    apiGet<AdminUser[]>(path, accessToken)
      .then(setCustomers)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      });
  }

  useEffect(() => load(""), [accessToken]);

  if (forbidden) return <PermissionDenied />;

  async function toggleStatus(customer: AdminUser) {
    if (!accessToken) return;
    const next = customer.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setError(null);
    try {
      await apiPatch(`/users/${customer.id}/status`, { status: next }, accessToken);
      load(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div>
      <PageHeader title="Foydalanuvchilar" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ism yoki telefon bo'yicha qidirish"
          className="input max-w-sm"
        />
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-line bg-surface p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-3 py-2">Ism</th>
              <th className="px-3 py-2">Telefon</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Ro'yxatdan o'tgan</th>
              <th className="px-3 py-2">Holat</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2">{customer.fullName}</td>
                <td className="px-3 py-2 text-muted">{customer.phone}</td>
                <td className="px-3 py-2 text-muted">{customer.email ?? "—"}</td>
                <td className="px-3 py-2 text-muted">{new Date(customer.createdAt).toLocaleDateString("uz-UZ")}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={customer.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => toggleStatus(customer)} className="text-xs text-muted hover:text-brand">
                    {customer.status === "ACTIVE" ? "Bloklash" : "Faollashtirish"}
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted">
                  Foydalanuvchi topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
