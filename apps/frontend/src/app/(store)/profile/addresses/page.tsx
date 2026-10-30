"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";

interface Address {
  id: string;
  recipientName: string;
  phone: string;
  region: string;
  district: string;
  street: string | null;
  house: string | null;
  isDefault: boolean;
}

export default function AddressesPage() {
  const { accessToken } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ recipientName: "", phone: "", region: "", district: "", street: "", house: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiGet<Address[]>("/addresses", accessToken)
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [accessToken]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await apiPost("/addresses", form, accessToken);
      setForm({ recipientName: "", phone: "", region: "", district: "", street: "", house: "" });
      setShowForm(false);
      load();
    } catch {
      setError("Manzilni saqlashda xatolik yuz berdi");
    }
  }

  async function handleDelete(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiDelete(`/addresses/${id}`, accessToken);
      load();
    } catch {
      setError("O'chirishda xatolik yuz berdi");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Saqlangan manzillar</h2>
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Bekor qilish" : "+ Yangi manzil"}
          </Button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {loading ? (
          <p className="text-muted">Yuklanmoqda...</p>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-line/60 text-ink/40">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z" strokeLinejoin="round" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </span>
            <p className="text-muted">Hozircha manzil qo&apos;shilmagan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <div key={address.id} className="flex items-center gap-3 rounded-lg border border-line p-3 text-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line/60 text-ink/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12Z" strokeLinejoin="round" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{address.recipientName}</p>
                    {address.isDefault && (
                      <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-medium text-brand">Standart</span>
                    )}
                  </div>
                  <p className="text-muted">
                    {address.region}, {address.district} {address.street} {address.house}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(address.id)}
                  aria-label="O'chirish"
                  className="shrink-0 rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="grid gap-3 rounded-xl border border-line bg-surface p-6 sm:grid-cols-2">
          <input
            required
            placeholder="Qabul qiluvchi ismi"
            value={form.recipientName}
            onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Viloyat"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            className="input"
          />
          <input
            required
            placeholder="Tuman"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            className="input"
          />
          <input
            placeholder="Ko'cha"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            className="input"
          />
          <input
            placeholder="Uy"
            value={form.house}
            onChange={(e) => setForm({ ...form, house: e.target.value })}
            className="input"
          />
          <Button type="submit" className="sm:col-span-2">
            Saqlash
          </Button>
        </form>
      )}
    </div>
  );
}
