"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";
import type { Category } from "@/lib/types";

interface VariantForm {
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  price: string;
}

function emptyVariant(): VariantForm {
  return { color: "", colorHex: "#000000", size: "", sku: "", price: "" };
}

export default function NewProductPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [discountType, setDiscountType] = useState<"" | "PERCENT" | "AMOUNT">("");
  const [discountValue, setDiscountValue] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiGet<Category[]>("/categories?includeInactive=true", accessToken)
      .then(setCategories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Kategoriyalarni yuklashda xatolik"));
  }, [accessToken]);

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setError(null);

    if (selectedCategories.length === 0) {
      setError("Kamida bitta kategoriya tanlang");
      return;
    }
    if (variants.some((v) => !v.color || !v.size || !v.sku)) {
      setError("Har bir variant uchun rang, o'lcham va SKU to'ldirilishi kerak");
      return;
    }

    setSubmitting(true);
    try {
      const product = await apiPost<{ id: string }>(
        "/products",
        {
          name,
          description: description || undefined,
          basePrice: Number(basePrice),
          categoryIds: selectedCategories,
          discountType: discountType || undefined,
          discountValue: discountType ? Number(discountValue) : undefined,
          variants: variants.map((v) => ({
            color: v.color,
            colorHex: v.colorHex,
            size: v.size,
            sku: v.sku,
            price: v.price ? Number(v.price) : undefined,
          })),
        },
        accessToken,
      );

      if (imageUrl) {
        await apiPost(
          `/products/${product.id}/images`,
          { images: [{ url: imageUrl, storageKey: `manual/${product.id}`, isMain: true }] },
          accessToken,
        );
      }

      router.push(`/admin/products/${product.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mahsulot yaratishda xatolik");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="mb-4 inline-block text-xs text-muted hover:text-brand">
        ← Mahsulotlar
      </Link>
      <h1 className="mb-6 font-display text-2xl text-ink">Yangi mahsulot</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
          <Field label="Nomi *">
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Tavsif">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input" rows={3} />
          </Field>
          <Field label="Asosiy narx (so'm) *">
            <input required type="number" min={0} value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="input" />
          </Field>
          <Field label="Asosiy rasm URL">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" placeholder="https://..." />
          </Field>

          <div>
            <p className="mb-2 text-xs text-muted">Chegirma</p>
            <div className="flex gap-2">
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as typeof discountType)} className="input">
                <option value="">Yo&apos;q</option>
                <option value="PERCENT">Foiz (%)</option>
                <option value="AMOUNT">Summa (so&apos;m)</option>
              </select>
              {discountType && (
                <input
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="input"
                  placeholder="Qiymat"
                />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6">
          <p className="mb-3 text-sm font-semibold text-ink">Kategoriyalar *</p>
          <div className="flex flex-wrap gap-2">
            {categories.flatMap((c) => [c, ...c.children]).map((c) => (
              <label
                key={c.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs ${
                  selectedCategories.includes(c.id) ? "border-brand bg-brand-light text-brand" : "border-line text-ink/70"
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedCategories.includes(c.id)}
                  onChange={() => toggleCategory(c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Variantlar (rang / o&apos;lcham) *</p>
            <Button type="button" variant="outline" onClick={() => setVariants((prev) => [...prev, emptyVariant()])}>
              + Variant
            </Button>
          </div>
          <div className="space-y-3">
            {variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-3 sm:grid-cols-5">
                <input
                  placeholder="Rang (masalan Qora)"
                  value={variant.color}
                  onChange={(e) => updateVariant(index, { color: e.target.value })}
                  className="input"
                />
                <input
                  type="color"
                  value={variant.colorHex}
                  onChange={(e) => updateVariant(index, { colorHex: e.target.value })}
                  className="h-10 w-full rounded border border-line"
                />
                <input
                  placeholder="O'lcham (S/M/L)"
                  value={variant.size}
                  onChange={(e) => updateVariant(index, { size: e.target.value })}
                  className="input"
                />
                <input
                  placeholder="SKU"
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, { sku: e.target.value })}
                  className="input"
                />
                <div className="flex gap-1">
                  <input
                    type="number"
                    placeholder="Narx (ixtiyoriy)"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, { price: e.target.value })}
                    className="input"
                  />
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                      className="text-muted hover:text-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saqlanmoqda..." : "Mahsulotni yaratish"}
        </Button>
      </form>
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
