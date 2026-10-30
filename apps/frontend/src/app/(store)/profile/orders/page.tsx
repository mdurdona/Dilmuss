"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSom } from "@/lib/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/order-status";
import type { OrderDto, OrderStatus } from "@/lib/types";

const TABS: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "all", label: "Barchasi", statuses: null },
  { key: "progress", label: "Jarayonda", statuses: ["PENDING_PAYMENT", "MANUAL_REVIEW", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED"] },
  { key: "delivered", label: "Yetkazib berildi", statuses: ["DELIVERED"] },
  { key: "cancelled", label: "Bekor qilingan", statuses: ["CANCELLED"] },
];

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    apiGet<OrderDto[]>("/orders/mine", accessToken)
      .then((data) => setOrders(data || []))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Buyurtmalarni yuklashda xatolik yuz berdi");
        setOrders([]);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const activeTab = TABS.find((t) => t.key === tab)!;
  const filtered = activeTab.statuses ? orders.filter((o) => activeTab.statuses!.includes(o.status)) : orders;

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${
              tab === t.key ? "bg-brand text-white" : "bg-brand-light text-ink/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted">Yuklanmoqda...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-line/60 text-ink/40">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 8 12 4 3 8l9 4 9-4Z" strokeLinejoin="round" />
              <path d="M3 8v8l9 4 9-4V8" strokeLinejoin="round" />
              <path d="M12 12v8" />
            </svg>
          </span>
          <p className="text-muted">Buyurtmalar topilmadi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order.id}
              href={`/profile/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border border-line p-4 transition hover:border-brand/40 hover:bg-brand-light/30"
            >
              <div>
                <p className="text-sm font-medium text-ink">№ {order.orderNumber}</p>
                <p className="text-xs text-muted">
                  {new Date(order.createdAt).toLocaleDateString("uz-UZ")} · {formatSom(order.total)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-ink/30">
                  <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
