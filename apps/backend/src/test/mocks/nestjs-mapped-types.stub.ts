/**
 * `@nestjs/mapped-types` ham ESM sifatida chiqariladi va Jest ostida yuklanmaydi (xuddi
 * `@nestjs/config`/`@nestjs/jwt` kabi). Bu testlar DTO validatsiya xatti-harakatini emas,
 * controller/servis authorization mantig'ini tekshiradi — shuning uchun `PartialType`/`OmitType`ning
 * to'liq (decorator-nusxalash) real implementatsiyasi shart emas, faqat klass mavjud bo'lishi kifoya.
 */
export function PartialType<T>(classRef: new (...args: unknown[]) => T): new (...args: unknown[]) => Partial<T> {
  return class extends (classRef as unknown as new () => object) {} as unknown as new (...args: unknown[]) => Partial<T>;
}

export function OmitType<T, K extends keyof T>(
  classRef: new (...args: unknown[]) => T,
  _keys: readonly K[],
): new (...args: unknown[]) => Omit<T, K> {
  return class extends (classRef as unknown as new () => object) {} as unknown as new (...args: unknown[]) => Omit<T, K>;
}

export function PickType<T, K extends keyof T>(
  classRef: new (...args: unknown[]) => T,
  _keys: readonly K[],
): new (...args: unknown[]) => Pick<T, K> {
  return class extends (classRef as unknown as new () => object) {} as unknown as new (...args: unknown[]) => Pick<T, K>;
}
