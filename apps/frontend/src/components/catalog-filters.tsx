"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Category } from "@/lib/types";

interface ColorOption {
  color: string;
  colorHex: string | null;
}

function buildHref(
  pathname: string,
  current: URLSearchParams,
  changes: { category?: string | null; colors?: string[] },
) {
  const params = new URLSearchParams(current);
  params.delete("page");

  if (changes.category !== undefined) {
    if (changes.category === null) params.delete("category");
    else params.set("category", changes.category);
  }

  if (changes.colors !== undefined) {
    params.delete("colors");
    for (const c of changes.colors) params.append("colors", c);
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function CatalogFilters({
  categories,
  colorOptions,
  onNavigate,
}: {
  categories: Category[];
  colorOptions: ColorOption[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  // Panel har qanday sahifadan (header orqali) ochilishi mumkin — faqat /catalog'da
  // turgan bo'lsak joriy filtrlarni saqlaymiz, aks holda toza holatdan boshlaymiz.
  const searchParams = pathname === "/catalog" ? rawSearchParams : new URLSearchParams();
  const selectedCategory = searchParams.get("category");
  const selectedColors = searchParams.getAll("colors");
  const hasFilters = !!selectedCategory || selectedColors.length > 0;

  function toggleColor(color: string) {
    const next = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    return buildHref("/catalog", searchParams, { colors: next });
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Kategoriyalar</h2>
          {hasFilters && (
            <Link href="/catalog" onClick={onNavigate} className="text-xs text-brand hover:underline">
              Tozalash
            </Link>
          )}
        </div>
        <ul className="space-y-1 text-sm">
          <li>
            <Link
              href={buildHref("/catalog", searchParams, { category: null })}
              onClick={onNavigate}
              className={!selectedCategory ? "font-medium text-brand" : "text-ink/80 hover:text-brand"}
            >
              Barchasi
            </Link>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={buildHref("/catalog", searchParams, { category: cat.slug })}
                onClick={onNavigate}
                className={selectedCategory === cat.slug ? "font-medium text-brand" : "text-ink/80 hover:text-brand"}
              >
                {cat.name}
              </Link>
              {cat.children.length > 0 && (
                <ul className="ml-3 mt-1 space-y-1 border-l border-line pl-3">
                  {cat.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={buildHref("/catalog", searchParams, { category: child.slug })}
                        onClick={onNavigate}
                        className={
                          selectedCategory === child.slug ? "font-medium text-brand" : "text-muted hover:text-brand"
                        }
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      {colorOptions.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Ranglar</h2>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((opt) => {
              const active = selectedColors.includes(opt.color);
              return (
                <Link
                  key={opt.color}
                  href={toggleColor(opt.color)}
                  title={opt.color}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                    active ? "border-brand" : "border-transparent"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full border border-line"
                    style={{ backgroundColor: opt.colorHex ?? "#ccc" }}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
