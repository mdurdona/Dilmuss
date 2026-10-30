import { notFound } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { ProductDetailClient } from "@/components/product-detail-client";
import type { ProductDetail } from "@/lib/types";

async function getProduct(code: string): Promise<ProductDetail | null> {
  try {
    return await apiGet<ProductDetail>(`/products/${code}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export default async function ProductPage({ params }: PageProps<"/product/[code]">) {
  const { code } = await params;
  const product = await getProduct(code);
  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
