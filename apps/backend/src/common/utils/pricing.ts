import { DiscountType } from '@prisma/client';

interface Discountable {
  discountType: DiscountType | null;
  discountValue: number | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
}

/** TZ 5.3 — chegirma faqat discountStartsAt..discountEndsAt oralig'ida amal qiladi. */
export function isDiscountActive(entity: Discountable, now: Date = new Date()): boolean {
  if (!entity.discountType || entity.discountValue == null) return false;
  if (entity.discountStartsAt && entity.discountStartsAt > now) return false;
  if (entity.discountEndsAt && entity.discountEndsAt < now) return false;
  return true;
}

export function applyDiscount(price: number, entity: Discountable, now: Date = new Date()): number {
  if (!isDiscountActive(entity, now)) return price;
  if (entity.discountType === DiscountType.PERCENT) {
    return Math.round(price - (price * entity.discountValue!) / 100);
  }
  return Math.max(0, price - entity.discountValue!);
}

/** Variant narxi mavjud bo'lsa uni, aks holda Product.basePrice'ni meros oladi (TZ 5.3). */
export function resolveVariantPrice(product: { basePrice: number }, variant: { price: number | null }): number {
  return variant.price ?? product.basePrice;
}
