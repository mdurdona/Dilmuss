/**
 * `@nestjs/jwt@12` ham sof ESM chiqariladi — xuddi `nestjs-config.stub.ts`dagi kabi sabab bilan
 * Jest ostida `AuthService`ni (u JwtService'ni Nest metadata uchun value-import qiladi) yuklashda
 * "Must use import to load ES Module" xatosi beradi. Bu testlar haqiqiy JWT imzolashni emas,
 * refresh-token/Session business-logikasini tekshiradi — shuning uchun shu minimal stub yetarli.
 */
export class JwtService {
  sign(_payload: unknown, _options?: unknown): string {
    return 'stub-access-token';
  }

  verify<T = unknown>(_token: string, _options?: unknown): T {
    throw new Error('JwtService.verify() test stub-da amalga oshirilmagan');
  }
}
