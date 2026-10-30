"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/button";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { AdminBranch, AdminBranchInventoryRow } from "@/lib/admin-types";

const REASONS = ["MANUAL_ADJUSTMENT", "INITIAL_STOCK", "DAMAGE_LOSS", "CORRECTION"];

export default function AdminInventoryPage() {
  const { accessToken } = useAuth();
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<AdminBranchInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<Record<string, { delta: string; reason: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    // Admin faqat o'ziga biriktirilgan filial(lar)ni ko'radi — "asosiy" filial uning
    // ro'yxatida bo'lmasligi mumkin (masalan, boshqa filialga biriktirilgan bo'lsa).
    apiGet<AdminBranch[]>("/branches/mine", accessToken)
      .then((res) => {
        setBranches(res);
        const main = res.find((b) => b.isMain) ?? res[0];
        if (main) setBranchId(main.id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Filiallarni yuklashda xatolik"))
      .finally(() => setBranchesLoaded(true));
  }, [accessToken]);

  function load() {
    if (!accessToken || !branchId) return;
    setLoading(true);
    apiGet<AdminBranchInventoryRow[]>(`/inventory/branch/${branchId}`, accessToken)
      .then(setRows)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [accessToken, branchId]);

  if (forbidden) return <PermissionDenied />;
  if (branchesLoaded && !branchId) {
    return <p className="text-muted">Sizga hech qanday filial biriktirilmagan. Superadmindan filial biriktirishni so&apos;rang.</p>;
  }

  async function handleAdjust(row: AdminBranchInventoryRow) {
    if (!accessToken) return;
    const state = adjusting[row.id];
    const delta = Number(state?.delta ?? 0);
    if (!delta) return;
    setError(null);
    try {
      await apiPost(
        "/inventory/adjust",
        { branchId: row.branchId, variantId: row.variantId, delta, reason: state?.reason ?? "MANUAL_ADJUSTMENT" },
        accessToken,
      );
      setAdjusting((prev) => ({ ...prev, [row.id]: { delta: "", reason: state?.reason ?? "MANUAL_ADJUSTMENT" } }));
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div>
      <PageHeader
        title="Ombor"
        action={
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input w-56">
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-line bg-surface p-2">
        {loading ? (
          <p className="p-4 text-muted">Yuklanmoqda...</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-muted">Ombor yozuvlari yo&apos;q.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-3 py-2">Mahsulot</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Rang/O&apos;lcham</th>
                <th className="px-3 py-2">Mavjud</th>
                <th className="px-3 py-2">Band</th>
                <th className="px-3 py-2">Sotiladigan</th>
                <th className="px-3 py-2">Tuzatish</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const available = row.onHand - row.reserved;
                const isLow = available <= row.lowStockThreshold;
                const state = adjusting[row.id] ?? { delta: "", reason: "MANUAL_ADJUSTMENT" };
                return (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">{row.variant.product.name}</td>
                    <td className="px-3 py-2 text-muted">{row.variant.sku}</td>
                    <td className="px-3 py-2">
                      {row.variant.color} / {row.variant.size}
                    </td>
                    <td className="px-3 py-2">{row.onHand}</td>
                    <td className="px-3 py-2">{row.reserved}</td>
                    <td className={`px-3 py-2 font-medium ${isLow ? "text-red-600" : "text-ink"}`}>{available}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="±"
                          value={state.delta}
                          onChange={(e) =>
                            setAdjusting((prev) => ({ ...prev, [row.id]: { ...state, delta: e.target.value } }))
                          }
                          className="input w-20"
                        />
                        <select
                          value={state.reason}
                          onChange={(e) =>
                            setAdjusting((prev) => ({ ...prev, [row.id]: { ...state, reason: e.target.value } }))
                          }
                          className="input w-36 text-xs"
                        >
                          {REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <Button variant="outline" onClick={() => handleAdjust(row)} className="px-3 py-1.5 text-xs">
                          OK
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
