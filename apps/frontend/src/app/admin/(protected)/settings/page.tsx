"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPut, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/button";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { SystemSetting } from "@/lib/admin-types";

export default function AdminSettingsPage() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken) return;
    apiGet<SystemSetting[]>("/settings", accessToken)
      .then((res) => {
        setSettings(res);
        setDrafts(Object.fromEntries(res.map((s) => [s.key, JSON.stringify(s.value)])));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      });
  }

  useEffect(load, [accessToken]);

  if (forbidden) return <PermissionDenied />;

  async function handleSave(key: string) {
    if (!accessToken) return;
    let value: unknown;
    try {
      value = JSON.parse(drafts[key]);
    } catch {
      value = drafts[key];
    }
    setError(null);
    try {
      await apiPut(`/settings/${key}`, { value }, accessToken);
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saqlashda xatolik");
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Tizim sozlamalari" />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-medium text-ink">{setting.key}</p>
            {setting.description && <p className="mb-2 text-xs text-muted">{setting.description}</p>}
            <div className="flex items-center gap-2">
              <input
                value={drafts[setting.key] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                className="input"
              />
              <Button variant="outline" onClick={() => handleSave(setting.key)}>
                Saqlash
              </Button>
              {saved === setting.key && <span className="text-xs text-green-600">Saqlandi</span>}
            </div>
          </div>
        ))}
        {settings.length === 0 && <p className="text-muted">Sozlamalar topilmadi.</p>}
      </div>
    </div>
  );
}
