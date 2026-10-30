"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/button";
import { ProductCard } from "@/components/product-card";
import type { ProductListItem } from "@/lib/types";

export default function FavoritesPage() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    apiGet<ProductListItem[]>("/favorites", accessToken)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (authLoading || !user) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted">Yuklanmoqda...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl text-ink">Saralangan mahsulotlar</h1>

      {loading ? (
        <p className="text-muted">Yuklanmoqda...</p>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-line/60 text-ink/40">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.6 2.3 4 6 4c2.2 0 3.7 1.2 6 3.5C14.3 5.2 15.8 4 18 4c3.7 0 5.6 3.6 4 7.2-2.5 4.7-10 9.3-10 9.3Z" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="text-muted">Hozircha saralangan mahsulotlar yo&apos;q.</p>
          <Link href="/catalog">
            <Button variant="outline">Katalogga o&apos;tish</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
