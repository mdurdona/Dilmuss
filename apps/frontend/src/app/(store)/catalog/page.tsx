import Link from "next/link";
import { apiGet } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { Pagination } from "@/components/pagination";
import type { Category, ProductListResponse } from "@/lib/types";

const PAGE_SIZE = 12;

const SEASON_LABELS: Record<string, string> = {
  kuz: "Kuzgi kiyimlar",
  qish: "Qishki kolleksiya",
  bahor: "Bahorgi kolleksiya",
  yoz: "Yozgi kolleksiya",
};

async function getCategories() {
  try {
    return await apiGet<Category[]>("/categories");
  } catch {
    return [];
  }
}

async function getProducts(query: string) {
  try {
    return await apiGet<ProductListResponse>(`/products?${query}`);
  } catch {
    return { items: [], total: 0, page: 1, pageSize: PAGE_SIZE } satisfies ProductListResponse;
  }
}

function findCategoryName(categories: Category[], slug: string): string | null {
  for (const cat of categories) {
    if (cat.slug === slug) return cat.name;
    for (const child of cat.children) {
      if (child.slug === slug) return child.name;
    }
  }
  return null;
}

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const sale = params.sale === "1";
  const season = typeof params.season === "string" ? params.season : undefined;
  const sort = typeof params.sort === "string" ? params.sort : "newest";
  const page = params.page ? Number(params.page) : 1;
  const colors = params.colors ? (Array.isArray(params.colors) ? params.colors : [params.colors]) : [];

  const query = new URLSearchParams();
  if (category) query.set("categorySlug", category);
  if (search) query.set("search", search);
  if (sale) query.set("sale", "1");
  if (season) query.set("season", season);
  if (sort) query.set("sort", sort);
  for (const c of colors) query.append("colors", c);
  query.set("page", String(page));
  query.set("pageSize", String(PAGE_SIZE));

  const [categories, products] = await Promise.all([getCategories(), getProducts(query.toString())]);
  const categoryName = category ? findCategoryName(categories, category) : null;
  const totalPages = Math.max(1, Math.ceil(products.total / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (search) p.set("search", search);
    if (sale) p.set("sale", "1");
    if (season) p.set("season", season);
    if (sort) p.set("sort", sort);
    for (const c of colors) p.append("colors", c);
    p.set("page", String(targetPage));
    return `/catalog?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center gap-3">
        <Link href="/" className="text-xl text-muted hover:text-brand">
          ←
        </Link>
        <Link href="/" className="text-xs text-muted hover:text-brand">
          Orqaga
        </Link>
      </div>

      <h1 className="mb-6 font-display text-3xl text-ink">
          {search
            ? `"${search}" bo'yicha qidiruv`
            : sale
              ? "Chegirmadagi mahsulotlar"
              : season
                ? (SEASON_LABELS[season] ?? "Mavsumiy kolleksiya")
                : (categoryName ?? "Barcha mahsulotlar")}
        </h1>

      <p className="mb-4 text-sm text-muted">{products.total} ta mahsulot</p>
      {products.items.length === 0 ? (
        <p className="text-muted">Hech narsa topilmadi.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
