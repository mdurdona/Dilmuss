"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { AdminUser, Permission, UserPermissionOverrideRow } from "@/lib/admin-types";

type Effect = "GRANT" | "REVOKE";

export function PermissionsPanel({ admin, onClose }: { admin: AdminUser; onClose: () => void }) {
  const { accessToken } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Effect>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      apiGet<Permission[]>("/permissions", accessToken),
      apiGet<UserPermissionOverrideRow[]>(`/permissions/overrides/${admin.id}`, accessToken),
    ])
      .then(([perms, overrideRows]) => {
        setPermissions(perms);
        const map: Record<string, Effect> = {};
        overrideRows.forEach((o) => {
          map[o.permission.code] = o.effect;
        });
        setOverrides(map);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Yuklashda xatolik"))
      .finally(() => setLoading(false));
  }, [accessToken, admin.id]);

  async function setEffect(code: string, effect: Effect | null) {
    if (!accessToken) return;
    setError(null);
    try {
      if (effect === null) {
        await apiDelete(`/permissions/overrides/${admin.id}/${code}`, accessToken);
        setOverrides((prev) => {
          const next = { ...prev };
          delete next[code];
          return next;
        });
      } else {
        await apiPost("/permissions/overrides", { userId: admin.id, permissionCode: code, effect }, accessToken);
        setOverrides((prev) => ({ ...prev, [code]: effect }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "O'zgartirishda xatolik");
    }
  }

  const grouped = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-ink">Ruxsatlar — {admin.fullName}</h2>
            <p className="text-xs text-muted">
              {admin.role} roli standart huquqlariga qo&apos;shimcha ruxsat yoki cheklov
            </p>
          </div>
          <button onClick={onClose} aria-label="Yopish" className="text-muted hover:text-brand">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Yuklanmoqda...</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([module, perms]) => (
              <div key={module}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{module}</h3>
                <div className="space-y-1.5">
                  {perms.map((p) => {
                    const current = overrides[p.code] ?? null;
                    return (
                      <div
                        key={p.code}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
                      >
                        <span className="text-ink">{p.description ?? p.code}</span>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => setEffect(p.code, "GRANT")}
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              current === "GRANT" ? "bg-green-600 text-white" : "border border-line text-muted hover:border-brand"
                            }`}
                          >
                            Ruxsat
                          </button>
                          <button
                            onClick={() => setEffect(p.code, null)}
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              current === null ? "bg-brand-light text-brand" : "border border-line text-muted hover:border-brand"
                            }`}
                          >
                            Standart
                          </button>
                          <button
                            onClick={() => setEffect(p.code, "REVOKE")}
                            className={`rounded-full px-2.5 py-1 text-xs ${
                              current === "REVOKE" ? "bg-red-600 text-white" : "border border-line text-muted hover:border-brand"
                            }`}
                          >
                            Taqiqlash
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="text-xs text-muted hover:text-brand">
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
