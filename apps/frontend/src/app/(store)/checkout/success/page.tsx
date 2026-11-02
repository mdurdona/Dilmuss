
"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { formatSom } from "@/lib/format";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");
  const total = parseInt(searchParams.get("total") || "0");
  const subtotal = parseInt(searchParams.get("subtotal") || "0");
  const delivery = parseInt(searchParams.get("delivery") || "0");

  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="mb-6 font-display text-2xl text-ink">Xatolik yuz berdi</h1>
        <p className="mb-8 text-muted">Buyurtma topilmadi</p>
        <Link href="/catalog">
          <Button>Katalogga qaytish</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <div className="mb-8 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
        To'lov muvaffaqiyatli amalga oshirildi
      </h1>
      <p className="mb-10 text-sm text-muted">Buyurtma № {orderNumber}</p>

      <div className="mb-8 space-y-4 rounded-lg border border-line bg-surface p-6 text-left">
        <div className="mb-2 font-semibold text-ink">Chek</div>
        <div className="space-y-2 text-sm border-t border-line pt-3">
          <div className="flex justify-between font-medium text-ink">
            <span>Mahsulotlar</span>
            <span>{formatSom(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Yetkazib berish</span>
            <span>{formatSom(delivery)}</span>
          </div>
        </div>

        <div className="border-t border-line pt-3 flex justify-between text-base font-semibold text-ink">
          <span>Jami to'landi</span>
          <span>{formatSom(total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/profile/orders">
          <Button className="rounded-full px-8">Buyurtmalarim</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="rounded-full px-8">
            Bosh sahifaga qaytish
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center">Yuklanmoqda...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
