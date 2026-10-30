"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/use-permissions";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/button";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { Category } from "@/lib/types";

interface AdminCategory extends Category {
  isActive: boolean;
  children: AdminCategory[];
}

export default function AdminCategoriesPage() {
  const { accessToken } = useAuth();
  const { has, loading: permissionsLoading, error: permissionsError } = usePermissions();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState("");

  function load() {
    if (!accessToken) return;
    apiGet<AdminCategory[]>("/categories?includeInactive=true", accessToken)
      .then(setCategories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Kategoriyalarni yuklashda xatolik"));
  }

  useEffect(load, [accessToken]);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      await apiPost(
        "/categories",
        { name, slug: slugify(name), parentId: parentId || undefined },
        accessToken,
      );
      setName("");
      setParentId("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Yaratishda xatolik");
    }
  }

  async function toggleActive(category: AdminCategory) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiPatch(`/categories/${category.id}`, { isActive: !category.isActive }, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  function startEdit(category: AdminCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditParentId(category.parentId ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditParentId("");
  }

  async function saveEdit(id: string) {
    if (!accessToken) return;
    setError(null);
    try {
      await apiPatch(
        `/categories/${id}`,
        { name: editName, slug: slugify(editName), parentId: editParentId || null },
        accessToken,
      );
      cancelEdit();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tahrirlashda xatolik");
    }
  }

  if (permissionsLoading) return null;
  if (permissionsError) return <p className="text-sm text-red-600">Huquqlarni tekshirishda xatolik. Sahifani yangilab ko&apos;ring.</p>;
  if (!has("PRODUCT_VIEW")) return <PermissionDenied />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Kategoriyalar" />

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
        <label className="space-y-1">
          <span className="block text-xs text-muted">Nomi</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted">Ota kategoriya (ixtiyoriy)</span>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="input">
            <option value="">— Top-level —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">+ Qo&apos;shish</Button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-line bg-surface p-4">
            {editingId === cat.id ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="space-y-1">
                  <span className="block text-xs text-muted">Nomi</span>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input" />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs text-muted">Ota kategoriya</span>
                  <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)} className="input">
                    <option value="">— Top-level —</option>
                    {categories.filter((c) => c.id !== cat.id).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button onClick={() => saveEdit(cat.id)}>Saqlash</Button>
                <Button variant="outline" onClick={cancelEdit}>Bekor qilish</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className={cat.isActive ? "text-ink" : "text-muted line-through"}>{cat.name}</span>
                <div className="flex gap-3">
                  <button onClick={() => startEdit(cat)} className="text-xs text-brand hover:underline">
                    Tahrirlash
                  </button>
                  <button onClick={() => toggleActive(cat)} className="text-xs text-brand hover:underline">
                    {cat.isActive ? "Faolsizlantirish" : "Faollashtirish"}
                  </button>
                </div>
              </div>
            )}
            {cat.children.length > 0 && (
              <div className="mt-2 space-y-1 border-l border-line pl-4">
                {cat.children.map((child) =>
                  editingId === child.id ? (
                    <div key={child.id} className="flex flex-wrap items-end gap-2 py-1">
                      <label className="space-y-1">
                        <span className="block text-xs text-muted">Nomi</span>
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input" />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-xs text-muted">Ota kategoriya</span>
                        <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)} className="input">
                          <option value="">— Top-level —</option>
                          {categories.filter((c) => c.id !== child.id).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button onClick={() => saveEdit(child.id)}>Saqlash</Button>
                      <Button variant="outline" onClick={cancelEdit}>Bekor qilish</Button>
                    </div>
                  ) : (
                    <div key={child.id} className="flex items-center justify-between text-sm">
                      <span className={child.isActive ? "text-ink/80" : "text-muted line-through"}>{child.name}</span>
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(child)} className="text-xs text-brand hover:underline">
                          Tahrirlash
                        </button>
                        <button onClick={() => toggleActive(child)} className="text-xs text-brand hover:underline">
                          {child.isActive ? "Faolsizlantirish" : "Faollashtirish"}
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
