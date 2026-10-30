/** main.ts'dan ajratildi — sof funksiya sifatida unit test qilish uchun (server boot shart emas). */
export function resolveCorsOrigins(nodeEnv: string | undefined, corsOriginEnv: string | undefined): string[] | string {
  const isProduction = nodeEnv === 'production';
  const origins = corsOriginEnv
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isProduction) {
    if (!origins || origins.length === 0) {
      throw new Error('CORS_ORIGIN muhit o\'zgaruvchisi productionda majburiy (aniq domenlar, vergul bilan ajratilgan)');
    }
    if (origins.includes('*')) {
      throw new Error("CORS_ORIGIN productionda '*' bo'lishi mumkin emas — credentials: true bilan birga xavfli");
    }
  }

  return origins ?? 'http://localhost:3000';
}
