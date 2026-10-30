/**
 * `@nestjs/passport` ham ESM sifatida chiqariladi (xuddi config/jwt/mapped-types kabi). Bu testlar
 * controller metodlarini to'g'ridan-to'g'ri (HTTP pipeline'siz, qo'lda tuzilgan `req` bilan)
 * chaqiradi — shuning uchun `AuthGuard`ning haqiqiy Passport strategiyasi hech qachon ishlamaydi,
 * faqat `OptionalJwtAuthGuard extends AuthGuard('jwt')` kabi klass ta'rifi uchun bazaviy klass kerak.
 */
export function AuthGuard(_type?: string) {
  return class {
    canActivate(): boolean {
      return true;
    }
    handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser {
      return user;
    }
  };
}
