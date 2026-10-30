/** TZ 5.2 — public mahsulot kodi 4 xonali ko'rinishda: 3 -> "0003". */
export function formatProductCode(productCode: number): string {
  return String(productCode).padStart(4, '0');
}

/** TZ 11 — mijozga ko'rinadigan buyurtma raqami. */
export function generateOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `DM${y}${m}${d}${rand}`;
}
