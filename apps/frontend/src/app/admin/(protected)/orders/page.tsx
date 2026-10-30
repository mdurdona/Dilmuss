"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSom } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { AdminOrderListItem } from "@/lib/admin-types";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "PENDING_PAYMENT",
  "MANUAL_REVIEW",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export default function AdminOrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    const query = status ? `?status=${status}` : "";
    apiGet<AdminOrderListItem[]>(`/orders/admin${query}`, accessToken)
      .then(setOrders)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, [accessToken, status]);

  if (forbidden) return <PermissionDenied />;

  return (
    <div>
      <PageHeader
        title="Buyurtmalar"
        action={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-56">
            <option value="">Barcha holatlar</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        }
      />

      <div className="rounded-xl border border-line bg-surface p-2">
        {loading ? (
          <p className="p-4 text-muted">Yuklanmoqda...</p>
        ) : orders.length === 0 ? (
          <p className="p-4 text-muted">Buyurtmalar topilmadi.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-3 py-2">№</th>
                <th className="px-3 py-2">Mijoz</th>
                <th className="px-3 py-2">Telefon</th>
                <th className="px-3 py-2">Filial</th>
                <th className="px-3 py-2">Holat</th>
                <th className="px-3 py-2">To&apos;lov</th>
                <th className="px-3 py-2 text-right">Summa</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-line last:border-0 hover:bg-brand-light/40">
                  <td className="px-3 py-2">
                    <Link href={`/admin/orders/${order.id}`} className="text-brand hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{order.customerName}</td>
                  <td className="px-3 py-2 text-muted">{order.customerPhone}</td>
                  <td className="px-3 py-2 text-muted">{order.branch?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-3 py-2 text-right">{formatSom(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
