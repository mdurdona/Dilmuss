"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { apiGet, apiPatch, apiPost, apiDelete, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSom } from "@/lib/format";
import { Button } from "@/components/button";
import { StatusBadge } from "@/components/admin/status-badge";
import type { Category } from "@/lib/types";
import type { AdminProductDetail, AdminVariant } from "@/lib/admin-types";

const DISCOUNT_TYPES = ["", "PERCENT", "AMOUNT"] as const;
const SEASONS = [
  { value: "kuz", label: "Kuz" },
  { value: "qish", label: "Qish" },
  { value: "bahor", label: "Bahor" },
  { value: "yoz", label: "Yoz" },
];

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [product, setProduct] = useState<AdminProductDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    discountType: "" as "" | "PERCENT" | "AMOUNT",
    discountValue: "",
    discountStartsAt: "",
    discountEndsAt: "",
    videoUrl: "",
    fit: "",
    seasons: [] as string[],
    careInstructions: "",
    modelInfo: "",
    deliveryInfo: "",
    returnPolicy: "",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newVariant, setNewVariant] = useState({ color: "", colorHex: "#000000", size: "", sku: "", price: "" });
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editVariant, setEditVariant] = useState({ color: "", colorHex: "#000000", size: "", sku: "", price: "" });
  const [newImage, setNewImage] = useState({ url: "", color: "", isMain: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    if (!accessToken || !params.id) return;
    Promise.all([
      apiGet<AdminProductDetail>(`/products/admin/${params.id}`, accessToken),
      apiGet<Category[]>("/categories?includeInactive=true", accessToken),
    ])
      .then(([p, c]) => {
        setProduct(p);
        setCategories(c);
        setForm({
          name: p.name,
          description: p.description ?? "",
          basePrice: String(p.basePrice),
          discountType: p.discountType ?? "",
          discountValue: p.discountValue != null ? String(p.discountValue) : "",
          discountStartsAt: p.discountStartsAt ? p.discountStartsAt.slice(0, 10) : "",
          discountEndsAt: p.discountEndsAt ? p.discountEndsAt.slice(0, 10) : "",
          videoUrl: p.videoUrl ?? "",
          fit: p.fit ?? "",
          seasons: p.seasons,
          careInstructions: p.careInstructions ?? "",
          modelInfo: p.modelInfo ?? "",
          deliveryInfo: p.deliveryInfo ?? "",
          returnPolicy: p.returnPolicy ?? "",
        });
        setSelectedCategories(p.categories.map((c) => c.id));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Mahsulotni yuklashda xatolik"));
  }

  useEffect(load, [accessToken, params.id]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function toggleSeason(value: string) {
    setForm((prev) => ({
      ...prev,
      seasons: prev.seasons.includes(value) ? prev.seasons.filter((s) => s !== value) : [...prev.seasons, value],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !product) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPatch(
        `/products/${product.id}`,
        {
          name: form.name,
          description: form.description || undefined,
          basePrice: Number(form.basePrice),
          categoryIds: selectedCategories,
          discountType: form.discountType || undefined,
          discountValue: form.discountValue ? Number(form.discountValue) : undefined,
          discountStartsAt: form.discountStartsAt ? new Date(form.discountStartsAt).toISOString() : undefined,
          discountEndsAt: form.discountEndsAt ? new Date(form.discountEndsAt).toISOString() : undefined,
          videoUrl: form.videoUrl || undefined,
          fit: form.fit || undefined,
          seasons: form.seasons,
          careInstructions: form.careInstructions || undefined,
          modelInfo: form.modelInfo || undefined,
          deliveryInfo: form.deliveryInfo || undefined,
          returnPolicy: form.returnPolicy || undefined,
        },
        accessToken,
      );
      setSuccess("Saqlandi");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddVariant() {
    if (!accessToken || !product) return;
    if (!newVariant.color || !newVariant.size || !newVariant.sku) {
      setError("Rang, o'lcham va SKU to'ldirilishi kerak");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost(
        `/products/${product.id}/variants`,
        [
          {
            color: newVariant.color,
            colorHex: newVariant.colorHex,
            size: newVariant.size,
            sku: newVariant.sku,
            price: newVariant.price ? Number(newVariant.price) : undefined,
          },
        ],
        accessToken,
      );
      setNewVariant({ color: "", colorHex: "#000000", size: "", sku: "", price: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Variant qo'shishda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddImage() {
    if (!accessToken || !product) return;
    if (!newImage.url) {
      setError("Rasm havolasini kiriting");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPost(
        `/products/${product.id}/images`,
        {
          images: [
            {
              url: newImage.url,
              storageKey: newImage.url,
              color: newImage.color || undefined,
              isMain: newImage.isMain,
            },
          ],
        },
        accessToken,
      );
      setNewImage({ url: "", color: "", isMain: false });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rasm qo'shishda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveImage(imageId: string) {
    if (!accessToken || !product) return;
    if (!confirm("Rasmni olib tashlaysizmi?")) return;
    setError(null);
    try {
      await apiDelete(`/products/${product.id}/images/${imageId}`, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rasmni olib tashlashda xatolik");
    }
  }

  async function handleToggleVariant(variantId: string, isActive: boolean) {
    if (!accessToken || !product) return;
    if (isActive && !confirm("Variantni olib tashlaysizmi?")) return;
    setError(null);
    try {
      await apiPatch(`/products/${product.id}/variants/${variantId}`, { isActive: !isActive }, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  function startEditVariant(v: AdminVariant) {
    setEditingVariantId(v.id);
    setEditVariant({
      color: v.color,
      colorHex: v.colorHex ?? "#000000",
      size: v.size,
      sku: v.sku,
      price: v.price != null ? String(v.price) : "",
    });
  }

  async function handleSaveVariant(variantId: string) {
    if (!accessToken || !product) return;
    if (!editVariant.color || !editVariant.size || !editVariant.sku) {
      setError("Rang, o'lcham va SKU to'ldirilishi kerak");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPatch(
        `/products/${product.id}/variants/${variantId}`,
        {
          color: editVariant.color,
          colorHex: editVariant.colorHex,
          size: editVariant.size,
          sku: editVariant.sku,
          price: editVariant.price ? Number(editVariant.price) : undefined,
        },
        accessToken,
      );
      setEditingVariantId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Variantni yangilashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!accessToken || !product) return;
    if (!confirm("Mahsulotni arxivlaysizmi?")) return;
    setError(null);
    try {
      await apiPost(`/products/${product.id}/archive`, undefined, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  async function handleActivate() {
    if (!accessToken || !product) return;
    setError(null);
    try {
      await apiPost(`/products/${product.id}/activate`, undefined, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  if (!product) return <p className={error ? "text-sm text-red-600" : "text-muted"}>{error ?? "Yuklanmoqda..."}</p>;

  const availableColors = Array.from(new Set(product.variants.map((v) => v.color)));

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="mb-4 inline-block text-xs text-muted hover:text-brand">
        ← Mahsulotlar
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">
          {product.name} <span className="text-sm text-muted">#{product.productCode}</span>
        </h1>
        <div className="flex items-center gap-3">
          <StatusBadge status={product.status} />
          {product.status === "ACTIVE" ? (
            <Button variant="outline" onClick={handleArchive}>
              Arxivlash
            </Button>
          ) : (
            <Button variant="outline" onClick={handleActivate}>
              Faollashtirish
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {product.images.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {product.images.map((img) => (
            <div key={img.id} className="relative h-24 w-20 overflow-hidden rounded-lg bg-brand-light">
              <Image src={img.url} alt={product.name} fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(img.id)}
                aria-label="Rasmni olib tashlash"
                className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-xs text-ink hover:bg-white"
              >
                ✕
              </button>
              {img.color && (
                <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 text-center text-[10px] text-white">
                  {img.color}
                </span>
              )}
              {img.isMain && (
                <span className="absolute right-1 top-1 rounded-full bg-brand px-1.5 py-0.5 text-[9px] text-white">
                  asosiy
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-line bg-surface p-6">
        <p className="mb-3 text-sm font-semibold text-ink">Rasm qo&apos;shish</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input
            placeholder="Rasm havolasi (URL)"
            value={newImage.url}
            onChange={(e) => setNewImage({ ...newImage, url: e.target.value })}
            className="input sm:col-span-2"
          />
          <select
            value={newImage.color}
            onChange={(e) => setNewImage({ ...newImage, color: e.target.value })}
            className="input"
          >
            <option value="">Rang (ixtiyoriy)</option>
            {availableColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={handleAddImage} disabled={saving}>
            + Qo&apos;shish
          </Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={newImage.isMain}
            onChange={(e) => setNewImage({ ...newImage, isMain: e.target.checked })}
          />
          Asosiy rasm sifatida belgilash
        </label>
      </div>

      <form onSubmit={handleSave} className="mb-6 space-y-4 rounded-xl border border-line bg-surface p-6">
        <Field label="Nomi">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
        </Field>
        <Field label="Tavsif">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input"
            rows={3}
          />
        </Field>
        <Field label="Asosiy narx">
          <input
            type="number"
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Chegirma turi">
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as typeof form.discountType })}
              className="input"
            >
              {DISCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t || "Yo'q"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chegirma qiymati">
            <input
              type="number"
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Boshlanish sanasi">
            <input
              type="date"
              value={form.discountStartsAt}
              onChange={(e) => setForm({ ...form, discountStartsAt: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Tugash sanasi">
            <input
              type="date"
              value={form.discountEndsAt}
              onChange={(e) => setForm({ ...form, discountEndsAt: e.target.value })}
              className="input"
            />
          </Field>
        </div>

        <Field label="Video havolasi">
          <input
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://..."
            className="input"
          />
        </Field>

        <Field label="Fasoni (fit)">
          <input value={form.fit} onChange={(e) => setForm({ ...form, fit: e.target.value })} className="input" />
        </Field>

        <div>
          <p className="mb-2 text-xs text-muted">Mavsum (bir nechtasini tanlash mumkin)</p>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((s) => (
              <label
                key={s.value}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                  form.seasons.includes(s.value) ? "border-brand bg-brand-light text-brand" : "border-line text-ink/70"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={form.seasons.includes(s.value)}
                  onChange={() => toggleSeason(s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <Field label="Parvarish bo'yicha tavsiyalar">
          <textarea
            value={form.careInstructions}
            onChange={(e) => setForm({ ...form, careInstructions: e.target.value })}
            className="input"
            rows={2}
          />
        </Field>
        <Field label="Model haqida ma'lumot">
          <textarea
            value={form.modelInfo}
            onChange={(e) => setForm({ ...form, modelInfo: e.target.value })}
            className="input"
            rows={2}
          />
        </Field>
        <Field label="Yetkazib berish ma'lumoti">
          <textarea
            value={form.deliveryInfo}
            onChange={(e) => setForm({ ...form, deliveryInfo: e.target.value })}
            className="input"
            rows={2}
          />
        </Field>
        <Field label="Qaytarish siyosati">
          <textarea
            value={form.returnPolicy}
            onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
            className="input"
            rows={2}
          />
        </Field>

        <div>
          <p className="mb-2 text-xs text-muted">Kategoriyalar</p>
          <div className="flex flex-wrap gap-2">
            {categories.flatMap((c) => [c, ...c.children]).map((c) => (
              <label
                key={c.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                  selectedCategories.includes(c.id) ? "border-brand bg-brand-light text-brand" : "border-line text-ink/70"
                }`}
              >
                <input type="checkbox" className="hidden" checked={selectedCategories.includes(c.id)} onChange={() => toggleCategory(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button type="submit" disabled={saving}>
          Saqlash
        </Button>
      </form>

      <div className="rounded-xl border border-line bg-surface p-6">
        <p className="mb-3 text-sm font-semibold text-ink">Variantlar</p>
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2">SKU</th>
              <th className="py-2">Rang</th>
              <th className="py-2">O&apos;lcham</th>
              <th className="py-2">Narx</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {product.variants.map((v) =>
              editingVariantId === v.id ? (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-2">
                    <input
                      value={editVariant.sku}
                      onChange={(e) => setEditVariant({ ...editVariant, sku: e.target.value })}
                      className="input"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1">
                      <input
                        value={editVariant.color}
                        onChange={(e) => setEditVariant({ ...editVariant, color: e.target.value })}
                        className="input"
                      />
                      <input
                        type="color"
                        value={editVariant.colorHex}
                        onChange={(e) => setEditVariant({ ...editVariant, colorHex: e.target.value })}
                        className="h-9 w-9 shrink-0 rounded border border-line"
                      />
                    </div>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={editVariant.size}
                      onChange={(e) => setEditVariant({ ...editVariant, size: e.target.value })}
                      className="input"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      placeholder="Asosiy narx"
                      value={editVariant.price}
                      onChange={(e) => setEditVariant({ ...editVariant, price: e.target.value })}
                      className="input"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveVariant(v.id)}
                        disabled={saving}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Saqlash
                      </button>
                      <button
                        onClick={() => setEditingVariantId(null)}
                        className="text-xs text-muted hover:text-ink"
                      >
                        Bekor qilish
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={v.id} className={`border-b border-line last:border-0 ${v.isActive ? "" : "opacity-50"}`}>
                  <td className="py-2 text-muted">{v.sku}</td>
                  <td className="py-2">{v.color}</td>
                  <td className="py-2">{v.size}</td>
                  <td className="py-2">{v.price != null ? formatSom(v.price) : "Asosiy narx"}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => startEditVariant(v)} className="text-xs text-muted hover:text-brand">
                        Tahrirlash
                      </button>
                      <button
                        onClick={() => handleToggleVariant(v.id, v.isActive)}
                        className="text-xs text-muted hover:text-brand"
                      >
                        {v.isActive ? "Olib tashlash" : "Faollashtirish"}
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input placeholder="Rang" value={newVariant.color} onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })} className="input" />
          <input type="color" value={newVariant.colorHex} onChange={(e) => setNewVariant({ ...newVariant, colorHex: e.target.value })} className="h-10 rounded border border-line" />
          <input placeholder="O'lcham" value={newVariant.size} onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })} className="input" />
          <input placeholder="SKU" value={newVariant.sku} onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })} className="input" />
          <Button type="button" variant="outline" onClick={handleAddVariant} disabled={saving}>
            + Qo&apos;shish
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
