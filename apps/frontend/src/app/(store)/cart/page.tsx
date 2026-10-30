"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { formatSom } from "@/lib/format";
import { useCart } from "@/lib/cart-context";

export default function CartPage() {
  const { cart, loading, updateItem, removeItem } = useCart();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(itemId: string, quantity: number) {
    setError(null);
    try {
      await updateItem(itemId, quantity);
    } catch {
      setError("Miqdorni yangilashda xatolik yuz berdi");
    }
  }

  async function handleRemove(itemId: string) {
    setError(null);
    try {
      await removeItem(itemId);
    } catch {
      setError("O'chirishda xatolik yuz berdi");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted">Yuklanmoqda...</div>;
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl text-ink">Savatcha bo&apos;sh</h1>
        <p className="mt-2 text-muted">Katalogdan mahsulot tanlab, savatga qo&apos;shing.</p>
        <Link href="/catalog" className="mt-6 inline-block">
          <Button>Xarid qilishni davom ettirish</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl text-ink">Savatcha ({items.length})</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{item.productName}</p>
                <p className="text-xs text-muted">
                  Rang: {item.color} / O&apos;lcham: {item.size}
                </p>
                <p className="mt-1 text-sm font-medium text-ink">{formatSom(item.actualPrice)}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-xs text-muted hover:text-brand"
                  aria-label="O'chirish"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2 rounded-full border border-line px-2 py-1">
                  <button
                    onClick={() => handleUpdate(item.id, item.quantity - 1)}
                    className="h-6 w-6 text-ink/70 hover:text-brand"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdate(item.id, item.quantity + 1)}
                    className="h-6 w-6 text-ink/70 hover:text-brand"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
          <Link href="/catalog" className="inline-block text-sm text-brand hover:underline">
            ← Xaridni davom ettirish
          </Link>
        </div>

        <div className="h-fit space-y-4 rounded-xl border border-line bg-surface p-6">
          <h2 className="text-sm font-semibold text-ink">Buyurtma xulosasi</h2>
          <div className="space-y-2 text-sm text-muted">
            <div className="flex justify-between">
              <span>Jami mahsulotlar ({items.length})</span>
              <span>{formatSom(cart?.subtotal ?? 0)}</span>
            </div>
            {(cart?.discountTotal ?? 0) > 0 && (
              <div className="flex justify-between text-brand">
                <span>Chegirma</span>
                <span>-{formatSom(cart!.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Yetkazib berish</span>
              <span>Checkout&apos;da hisoblanadi</span>
            </div>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink">
            <span>Umumiy summa</span>
            <span>{formatSom(cart?.total ?? 0)}</span>
          </div>
          <Button className="w-full" onClick={() => router.push("/checkout")}>
            Buyurtmani davom ettirish →
          </Button>
        </div>
      </div>
    </div>
  );
}
