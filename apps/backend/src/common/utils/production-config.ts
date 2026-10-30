const MIN_JWT_SECRET_LENGTH = 32;
// .env.example'dagi o'zgartirilmagan namuna qiymatlar — bular productionda ishlatilsa, sir
// repozitoriyda ochiq ko'rinib turgani uchun har kim JWT soxtalashtirishi mumkin bo'lib qoladi.
const KNOWN_PLACEHOLDER_SECRETS = new Set(['change-me-access-secret', 'change-me-refresh-secret']);

/** main.ts'dan ajratildi — sof funksiya sifatida unit test qilish uchun (server boot shart emas). */
export function assertProductionJwtSecret(nodeEnv: string | undefined, jwtSecret: string | undefined) {
  if (nodeEnv !== 'production') return;

  if (!jwtSecret) {
    throw new Error('JWT_ACCESS_SECRET muhit o\'zgaruvchisi productionda majburiy');
  }
  if (KNOWN_PLACEHOLDER_SECRETS.has(jwtSecret)) {
    throw new Error(
      'JWT_ACCESS_SECRET .env.example namunasidagi standart qiymatda qolib ketgan — bu qiymat ochiq ' +
        "repozitoriyda ko'rinadi, uni tasodifiy va maxfiy qiymat bilan almashtiring",
    );
  }
  if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_ACCESS_SECRET productionda kamida ${MIN_JWT_SECRET_LENGTH} belgidan iborat bo'lishi kerak (hozirgi qiymat juda qisqa/zaif)`,
    );
  }
}

const KNOWN_NODE_ENVS = new Set(['development', 'production', 'test']);

/**
 * NODE_ENV yozuvida xatolik (masalan "prod" to'liq "production" o'rniga) juda xavfli — chunki
 * CORS allowlist, Swagger, cookie `secure` flag va demo to'lov endpointi kabi productionga xos
 * himoyalarning barchasi xuddi shu bitta `=== 'production'` solishtiruvga tayanadi. Noto'g'ri
 * yozilsa, ular sukut bo'yicha "development" xatti-harakatiga (kamroq himoyalangan holatga)
 * tushib qoladi — buni sukutda o'tkazib yubormay, ochiq xato bilan to'xtatamiz.
 */
export function assertKnownNodeEnv(nodeEnv: string | undefined) {
  if (nodeEnv === undefined || KNOWN_NODE_ENVS.has(nodeEnv)) return;
  throw new Error(
    `NODE_ENV="${nodeEnv}" tanilmagan qiymat — "development", "production" yoki "test" bo'lishi kerak. ` +
      "Noto'g'ri yozilgan NODE_ENV productionga xos himoyalarni (CORS, Swagger, cookie secure, demo to'lov) sukutda o'chirib qo'yishi mumkin.",
  );
}
