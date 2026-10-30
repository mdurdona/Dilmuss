import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/button";
import { ProductCard } from "@/components/product-card";
import { HeroPanel } from "@/components/hero-panel";
import type { ProductListResponse } from "@/lib/types";

const FEATURES = [
  { title: "Tez yetkazib berish", subtitle: "Toshkent bo'ylab", icon: "truck" as const, bg: "bg-[#FCE7D3]", fg: "text-[#D98A3D]" },
  { title: "Xavfsiz to'lov", subtitle: "100% ishonchli", icon: "payment" as const, bg: "bg-brand-light", fg: "text-brand" },
  { title: "Siz uchun tanlov", subtitle: "Yangi kolleksiyalar", icon: "heart" as const, bg: "bg-[#E3F3E8]", fg: "text-[#4F9463]" },
  { title: "Barqaror moda", subtitle: "Kelajak uchun", icon: "leaf" as const, bg: "bg-[#EDEAFB]", fg: "text-[#7C6FD1]" },
];

const FEATURE_ICONS: Record<(typeof FEATURES)[number]["icon"], React.ReactNode> = {
  payment: (
    <>
      <path
        d="M12 3 L19 6 V11 C19 15.5 16 19.3 12 21 C8 19.3 5 15.5 5 11 V6 L12 3 Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 12 L11 14.5 L15.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  truck: (
    <>
      <path d="M2 7h11v9H2z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 10h4l3 3v3h-7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="16" cy="18" r="1.6" />
    </>
  ),
  heart: (
    <path d="M12 20.5s-7.5-4.6-10-9.3C.4 7.6 2.3 4 6 4c2.2 0 3.7 1.2 6 3.5C14.3 5.2 15.8 4 18 4c3.7 0 5.6 3.6 4 7.2-2.5 4.7-10 9.3-10 9.3Z" strokeLinejoin="round" />
  ),
  leaf: (
    <path d="M5 19c8 0 14-6 14-14 0 0-11-2-14 5-2 5 0 9 0 9Zm0 0c0-4 1.5-7 5-9.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

async function getFeaturedProducts() {
  try {
    return await apiGet<ProductListResponse>("/products?pageSize=10");
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 10 } satisfies ProductListResponse;
  }
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:items-start md:py-16">
        <div className="space-y-6">
          <p className="text-sm font-medium uppercase tracking-widest text-brand">Yangi kolleksiya</p>
          <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
            Har bir ayol —<br />
            <span className="text-brand italic">o&apos;z uslubini topadi</span>
          </h1>
          <p className="max-w-md text-muted">
            Dilmuss — nafislik, sifat va zamonaviy uslubni birlashtiruvchi ayollar kiyimlari brendi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalog">
              <Button>Katalogni ko&apos;rish →</Button>
            </Link>
            <Link href="/catalog?sort=newest">
              <Button variant="outline">Yangiliklar</Button>
            </Link>
          </div>
          <div className="flex gap-7 border-t border-line pt-4">
            <div>
              <p className="font-display text-xl font-semibold text-ink">120+</p>
              <p className="text-[11px] text-muted">Mahsulot turi</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-ink">4.8★</p>
              <p className="text-[11px] text-muted">Mijozlar bahosi</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-ink">24/7</p>
              <p className="text-[11px] text-muted">Qo&apos;llab-quvvatlash</p>
            </div>
          </div>
        </div>
        <HeroPanel />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-2 sm:px-6">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-line shadow-[0_24px_54px_-22px_rgba(36,26,29,0.22)] sm:grid-cols-2 md:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex items-center gap-3 bg-surface px-5 py-6">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${feature.bg} ${feature.fg}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  {FEATURE_ICONS[feature.icon]}
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{feature.title}</p>
                <p className="text-xs text-muted">{feature.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl text-ink">Kiyimlar</h2>
          <Link href="/catalog" className="text-sm text-brand hover:underline">
            Barchasini ko&apos;rish
          </Link>
        </div>
        {products.items.length === 0 ? (
          <p className="text-muted">Hozircha mahsulotlar yo&apos;q.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
