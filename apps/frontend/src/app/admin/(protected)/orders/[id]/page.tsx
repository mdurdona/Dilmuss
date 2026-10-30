"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSom } from "@/lib/format";
import { Button } from "@/components/button";
import { StatusBadge } from "@/components/admin/status-badge";
import type { AdminOrderDetail, AdminBranch } from "@/lib/admin-types";
import type { OrderStatus } from "@/lib/types";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  MANUAL_REVIEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!accessToken || !params.id) return;
    Promise.all([
      apiGet<AdminOrderDetail>(`/orders/admin/${params.id}`, accessToken),
      apiGet<AdminBranch[]>("/branches"),
    ])
      .then(([o, b]) => {
        setOrder(o);
        setBranches(b);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Buyurtmani yuklashda xatolik"));
  }

  useEffect(load, [accessToken, params.id]);

  async function handleStatusChange(status: OrderStatus) {
    if (!order || !accessToken) return;
    setBusy(true);
    setError(null);
    try {
      await apiPatch(`/orders/${order.id}/status`, { status }, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignBranch() {
    if (!order || !accessToken || !selectedBranch) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/orders/${order.id}/assign-branch`, { branchId: selectedBranch }, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  if (!order) return <p className={error ? "text-sm text-red-600" : "text-muted"}>{error ?? "Yuklanmoqda..."}</p>;

  const nextStatuses = ALLOWED_TRANSITIONS[order.status] ?? [];

  return (
    <div>
      <Link href="/admin/orders" className="mb-4 inline-block text-xs text-muted hover:text-brand">
        ← Buyurtmalar
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">№ {order.orderNumber}</h1>
          <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString("uz-UZ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-line bg-surface p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink">Mahsulotlar</h2>
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
            <div className="mt-4 space-y-1 border-t border-line pt-3 text-sm text-muted">
              <div className="flex justify-between">
                <span>Mahsulotlar</span>
                <span>{formatSom(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Yetkazib berish</span>
                <span>{formatSom(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-ink">
                <span>Jami</span>
                <span>{formatSom(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink">Manzil</h2>
            <p className="text-sm text-ink/80">
              {order.address.recipientName}, {order.address.phone}
              <br />
              {order.address.region}, {order.address.district} {order.address.street} {order.address.house}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-6">
            <h2 className="mb-3 text-sm font-semibold text-ink">Holat tarixi</h2>
            <div className="space-y-2 text-sm">
              {order.statusHistory.map((h) => (
                <div key={h.id} className="flex justify-between text-muted">
                  <span>
                    {h.fromStatus ?? "—"} → <span className="text-ink">{h.toStatus}</span>
                  </span>
                  <span>{new Date(h.createdAt).toLocaleString("uz-UZ")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {order.status === "MANUAL_REVIEW" && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="mb-2 text-sm font-medium text-amber-800">Filial tanlanmagan</p>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="input mb-2">
                <option value="">Filial tanlang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Button className="w-full" disabled={!selectedBranch || busy} onClick={handleAssignBranch}>
                Biriktirish va tasdiqlash
              </Button>
            </div>
          )}

          {nextStatuses.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Holatni o&apos;zgartirish</p>
              <div className="space-y-2">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant={s === "CANCELLED" ? "outline" : "primary"}
                    className="w-full"
                    disabled={busy}
                    onClick={() => handleStatusChange(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {order.payments.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="mb-3 text-sm font-semibold text-ink">To&apos;lovlar</p>
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted">{p.provider}</span>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
