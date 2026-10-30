"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSom } from "@/lib/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/order-status";
import type { OrderDto } from "@/lib/types";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || !params.id) return;
    apiGet<OrderDto>(`/orders/${params.id}`, accessToken)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [accessToken, params.id]);

  if (loading) return <p className="text-muted">Yuklanmoqda...</p>;
  if (!order) return <p className="text-muted">Buyurtma topilmadi.</p>;

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface p-6">
      <Link href="/profile/orders" className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Buyurtmalarim
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">№ {order.orderNumber}</h2>
          <span className="text-xs text-muted">{new Date(order.createdAt).toLocaleString("uz-UZ")}</span>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>
      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-ink/80">
              {item.productName} ({item.color}/{item.size}) × {item.quantity}
            </span>
            <span className="text-ink">{formatSom(item.actualPrice * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-line pt-3 text-sm text-muted">
        <div className="flex justify-between">
          <span>Mahsulotlar</span>
          <span>{formatSom(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Yetkazib berish</span>
          <span>{formatSom(order.deliveryFee)}</span>
        </div>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-semibold text-ink">
        <span>Jami</span>
        <span>{formatSom(order.total)}</span>
      </div>
    </div>
  );
}
