"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { ProductCard } from "@/components/product-card";
import { ImagePlaceholder } from "@/components/image-placeholder";
import { formatSom } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useFavorites } from "@/lib/favorites-context";
import type { ProductDetail } from "@/lib/types";

export function ProductDetailClient({ product }: { product: ProductDetail }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isFavorited, toggle } = useFavorites();
  const favorited = isFavorited(product.id);
  const router = useRouter();

  const colors = useMemo(
    () => Array.from(new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()),
    [product.variants],
  );

  const [selectedColor, setSelectedColor] = useState(colors[0]?.[0] ?? "");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("description");

  const availableSizes = product.variants.filter((v) => v.color === selectedColor).map((v) => v.size);
  const selectedVariant = product.variants.find((v) => v.color === selectedColor && v.size === selectedSize);
  const hasDiscount = product.discountedPrice < product.basePrice;

  const images = product.images.length > 0 ? product.images : [{ id: "placeholder", url: "", color: null, isMain: true, sortOrder: 0 }];

  // Video (agar bo'lsa) galereyada birinchi bo'lib ochiladi, keyin rasmlar.
  type GalleryItem =
    | { type: "video"; id: string; url: string; color: null }
    | { type: "image"; id: string; url: string; color: string | null };
  const galleryItems: GalleryItem[] = [
    ...(product.videoUrl ? [{ type: "video" as const, id: "video", url: product.videoUrl, color: null }] : []),
    ...images.map((img) => ({ type: "image" as const, id: img.id, url: img.url, color: img.color })),
  ];
  const activeMedia = galleryItems[activeImage] ?? galleryItems[0];

  async function handleAddToCart() {
    if (!selectedVariant) {
      setError("Iltimos, o'lchamni tanlang");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      await addItem(selectedVariant.id, 1);
      router.push("/cart");
    } catch {
      setError("Savatga qo'shishda xatolik yuz berdi");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xl text-muted hover:text-brand">
          ←
        </button>
        <p className="text-xs text-muted">
          <Link href="/" className="hover:text-brand">
            Bosh sahifa
          </Link>{" "}
          / {product.categories[0]?.name ?? "Katalog"} / {product.name}
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex gap-4">
          <div className="hidden flex-col gap-2 sm:flex">
            {galleryItems.map((item, index) => (
              <button
                key={item.id}
                aria-label={item.type === "video" ? "Videoni ko'rsatish" : `Rasm ${index + 1}ni ko'rsatish`}
                onClick={() => {
                  setActiveImage(index);
                  if (item.color && colors.some(([color]) => color === item.color)) {
                    setSelectedColor(item.color);
                    setSelectedSize(null);
                  }
                }}
                className={`relative h-20 w-16 overflow-hidden rounded-lg border-2 ${
                  activeImage === index ? "border-brand" : "border-transparent"
                }`}
              >
                {item.type === "video" ? (
                  <>
                    <video src={item.url} muted preload="metadata" playsInline className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/20">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7L8 5Z" />
                      </svg>
                    </span>
                  </>
                ) : item.url ? (
                  <Image src={item.url} alt={product.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <ImagePlaceholder className="h-full w-full" />
                )}
              </button>
            ))}
          </div>
          <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-2xl bg-brand-light">
            {activeMedia?.type === "video" ? (
              <video
                key={activeMedia.url}
                src={activeMedia.url}
                controls
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : activeMedia?.url ? (
              <Image
                src={activeMedia.url}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <ImagePlaceholder className="h-full w-full" />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl text-ink">{product.name}</h1>
            <p className="mt-1 text-xs text-muted">Kod: {product.productCode}</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-ink">{formatSom(product.discountedPrice)}</span>
            {hasDiscount && (
              <span className="text-base text-muted line-through">{formatSom(product.basePrice)}</span>
            )}
          </div>

          {colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Rang: {selectedColor}</p>
              <div className="flex gap-2">
                {colors.map(([color, hex]) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      setSelectedSize(null);
                      const imgIndex = galleryItems.findIndex((item) => item.type === "image" && item.color === color);
                      if (imgIndex !== -1) setActiveImage(imgIndex);
                    }}
                    title={color}
                    className={`h-8 w-8 rounded-full border-2 ${
                      selectedColor === color ? "border-brand" : "border-transparent"
                    }`}
                    style={{ backgroundColor: hex ?? "#ccc" }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-ink">O&apos;lcham</p>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-10 min-w-10 rounded border px-3 text-sm ${
                    selectedSize === size
                      ? "border-brand bg-brand text-white"
                      : "border-line text-ink/80 hover:border-brand"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button className="w-full sm:w-auto" onClick={handleAddToCart} disabled={adding}>
              {adding ? "Qo'shilmoqda..." : "Savatga qo'shish →"}
            </Button>
            {user && (
              <button
                type="button"
                aria-label={favorited ? "Saralanganlardan olib tashlash" : "Saralanganlarga qo'shish"}
                onClick={() => toggle(product.id)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line shadow-sm hover:border-brand"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={favorited ? "#E0447A" : "none"}
                  stroke={favorited ? "#E0447A" : "currentColor"}
                  strokeWidth="1.8"
                >
                  <path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.6 2.3 4 6 4c2.2 0 3.7 1.2 6 3.5C14.3 5.2 15.8 4 18 4c3.7 0 5.6 3.6 4 7.2-2.5 4.7-10 9.3-10 9.3Z" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>

          <div className="divide-y divide-line border-t border-line">
            {product.description && (
              <AccordionSection
                title="Tavsif"
                open={openSection === "description"}
                onToggle={() => setOpenSection(openSection === "description" ? null : "description")}
              >
                {product.description}
              </AccordionSection>
            )}
            {(product.deliveryInfo || product.returnPolicy) && (
              <AccordionSection
                title="Yetkazib berish va qaytish"
                open={openSection === "delivery"}
                onToggle={() => setOpenSection(openSection === "delivery" ? null : "delivery")}
              >
                {product.deliveryInfo && <p className="mb-2">{product.deliveryInfo}</p>}
                {product.returnPolicy && <p>{product.returnPolicy}</p>}
              </AccordionSection>
            )}
            {product.careInstructions && (
              <AccordionSection
                title="Parvarish bo'yicha tavsiyalar"
                open={openSection === "care"}
                onToggle={() => setOpenSection(openSection === "care" ? null : "care")}
              >
                {product.careInstructions}
              </AccordionSection>
            )}
          </div>
        </div>
      </div>

      {product.relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl text-ink">Boshqa mijozlar ham shuni sotib oldi</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AccordionSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left text-sm font-medium text-ink">
        {title}
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}
