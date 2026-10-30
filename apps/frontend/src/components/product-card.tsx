"use client";

import Link from "next/link";
import Image from "next/image";
import { formatSom } from "@/lib/format";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { useAuth } from "@/lib/auth-context";
import { useFavorites } from "@/lib/favorites-context";
import type { ProductListItem } from "@/lib/types";

export function ProductCard({ product }: { product: ProductListItem }) {
  const hasDiscount = product.discountedPrice < product.basePrice;
  const { user } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const favorited = isFavorited(product.id);

  return (
    <Link href={`/product/${product.productCode}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-brand-light">
        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder className="h-full w-full" />
        )}
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white">
            -{Math.round(100 - (product.discountedPrice / product.basePrice) * 100)}%
          </span>
        )}
        {user && (
          <button
            type="button"
            aria-label={favorited ? "Saralanganlardan olib tashlash" : "Saralanganlarga qo'shish"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(product.id);
            }}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/90 shadow-md transition hover:scale-105"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={favorited ? "#E0447A" : "none"}
              stroke={favorited ? "#E0447A" : "#241a1d"}
              strokeWidth="1.8"
            >
              <path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.6 2.3 4 6 4c2.2 0 3.7 1.2 6 3.5C14.3 5.2 15.8 4 18 4c3.7 0 5.6 3.6 4 7.2-2.5 4.7-10 9.3-10 9.3Z" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm text-ink group-hover:text-brand">{product.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{formatSom(product.discountedPrice)}</span>
          {hasDiscount && (
            <span className="text-xs text-muted line-through">{formatSom(product.basePrice)}</span>
          )}
        </div>
        {product.colors.length > 0 && (
          <div className="flex gap-1 pt-1">
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c.color}
                title={c.color}
                className="h-3.5 w-3.5 rounded-full border border-line"
                style={{ backgroundColor: c.colorHex ?? "#ccc" }}
              />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
