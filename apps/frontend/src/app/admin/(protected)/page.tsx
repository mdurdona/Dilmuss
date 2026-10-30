"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSom } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { AdminOrderListItem, AdminBranch } from "@/lib/admin-types";

export default function AdminDashboardPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    apiGet<AdminOrderListItem[]>("/orders/admin", accessToken)
      .then(async (ordersRes) => {
        setOrders(ordersRes);

        // Filial statistikasi ixtiyoriy — masalan, admin hali biror filialga
        // biriktirilmagan bo'lsa 403 qaytishi mumkin, lekin bu asosiy sahifani
        // to'sib qo'ymasligi kerak (ORDER_VIEW borligi yetarli).
        try {
          const branchesRes = await apiGet<AdminBranch[]>("/branches");
          setBranches(branchesRes);
          const main = branchesRes.find((b) => b.isMain) ?? branchesRes[0];
          if (main) {
            const lowStock = await apiGet<unknown[]>(`/inventory/branch/${main.id}/low-stock`, accessToken);
            setLowStockCount(lowStock.length);
          }
        } catch {
          // widget xatosi sahifani to'sib qo'ymaydi
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const revenue = orders.filter((o) => o.paymentStatus === "PAID").reduce((sum, o) => sum + o.total, 0);

  if (loading) return <p className="text-muted">Yuklanmoqda...</p>;
  if (forbidden) return <PermissionDenied />;

  return (
    <div>
      <PageHeader title="Boshqaruv paneli" />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Jami buyurtmalar" value={String(orders.length)} />
        <StatCard label="Ko'rib chiqilishi kerak" value={String((counts.MANUAL_REVIEW ?? 0) + (counts.PENDING_PAYMENT ?? 0))} />
        <StatCard label="Kam qolgan zaxira" value={String(lowStockCount)} href="/admin/inventory" />
        <StatCard label="To'langan tushum" value={formatSom(revenue)} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-8">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="rounded-lg border border-line bg-surface p-3 text-center">
            <p className="text-lg font-semibold text-ink">{count}</p>
            <StatusBadge status={status} />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">So&apos;nggi buyurtmalar</h2>
          <Link href="/admin/orders" className="text-xs text-brand hover:underline">
            Barchasi
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2">№</th>
              <th className="pb-2">Mijoz</th>
              <th className="pb-2">Filial</th>
              <th className="pb-2">Holat</th>
              <th className="pb-2 text-right">Summa</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 8).map((order) => (
              <tr key={order.id} className="border-b border-line last:border-0">
                <td className="py-2">
                  <Link href={`/admin/orders/${order.id}`} className="text-brand hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-2">{order.customerName}</td>
                <td className="py-2 text-muted">{order.branch?.name ?? "—"}</td>
                <td className="py-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-2 text-right">{formatSom(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
