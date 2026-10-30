"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatSom } from "@/lib/format";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/button";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { PermissionDenied } from "@/components/admin/permission-denied";
import type { AdminProductListResponse, AdminProductListItem } from "@/lib/admin-types";

export default function AdminProductsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AdminProductListResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  function load() {
    if (!accessToken) return;
    setLoading(true);
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    apiGet<AdminProductListResponse>(`/products/admin/all${query}`, accessToken)
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [accessToken, search]);

  if (forbidden) return <PermissionDenied />;

  async function handleArchive(product: AdminProductListItem) {
    if (!accessToken) return;
    if (!confirm(`"${product.name}" mahsulotini arxivlaysizmi?`)) return;
    try {
      await apiPost(`/products/${product.id}/archive`, undefined, accessToken);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xatolik yuz berdi");
    }
  }

  return (
    <div>
      <PageHeader
        title="Mahsulotlar"
        action={
          <Link href="/admin/products/new">
            <Button>+ Yangi mahsulot</Button>
          </Link>
        }
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Qidirish..."
        className="input mb-4 max-w-xs"
      />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-line bg-surface p-2">
        {loading ? (
          <p className="p-4 text-muted">Yuklanmoqda...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-4 text-muted">Mahsulotlar topilmadi.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-3 py-2">Rasm</th>
                <th className="px-3 py-2">Kod</th>
                <th className="px-3 py-2">Nomi</th>
                <th className="px-3 py-2">Kategoriya</th>
                <th className="px-3 py-2">Narx</th>
                <th className="px-3 py-2">Holat</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr key={product.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">
                    <div className="relative h-12 w-10 overflow-hidden rounded bg-brand-light">
                      {product.mainImageUrl ? (
                        <Image src={product.mainImageUrl} alt={product.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <ImagePlaceholder className="h-full w-full" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted">{product.productCode}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/products/${product.id}`} className="text-brand hover:underline">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">{product.categories.join(", ")}</td>
                  <td className="px-3 py-2">{formatSom(product.basePrice)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <Link href={`/admin/products/${product.id}`} className="text-xs text-muted hover:text-brand">
                        Tahrirlash
                      </Link>
                      {product.status === "ACTIVE" && (
                        <button onClick={() => handleArchive(product)} className="text-xs text-muted hover:text-red-600">
                          Arxivlash
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
