/** Intl.toLocaleString("uz-UZ") formats differently between Node's full-ICU and browser
 * builds, causing SSR/CSR hydration mismatches — so grouping is done manually instead. */
export function formatSom(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} so'm`;
}

export function formatProductCode(code: string | number): string {
  return String(code).padStart(4, "0");
}
