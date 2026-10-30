import { assertKnownNodeEnv, assertProductionJwtSecret } from './production-config';

describe('assertProductionJwtSecret — security fix #14: JWT secret production validation', () => {
  it('dev muhitda tekshirilmaydi (JWT_ACCESS_SECRET nima bo\'lsa ham)', () => {
    expect(() => assertProductionJwtSecret(undefined, undefined)).not.toThrow();
    expect(() => assertProductionJwtSecret('development', 'change-me-access-secret')).not.toThrow();
  });

  it("productionda JWT_ACCESS_SECRET berilmasa xato tashlaydi", () => {
    expect(() => assertProductionJwtSecret('production', undefined)).toThrow();
    expect(() => assertProductionJwtSecret('production', '')).toThrow();
  });

  it(".env.example'dagi o'zgartirilmagan namuna qiymat productionda rad etiladi", () => {
    expect(() => assertProductionJwtSecret('production', 'change-me-access-secret')).toThrow();
  });

  it('qisqa/zaif qiymat productionda rad etiladi', () => {
    expect(() => assertProductionJwtSecret('production', 'short-secret-123')).toThrow();
  });

  it("yetarlicha uzun, tasodifiy qiymat productionda qabul qilinadi", () => {
    const strong = 'a'.repeat(48);
    expect(() => assertProductionJwtSecret('production', strong)).not.toThrow();
  });
});

describe('assertKnownNodeEnv — security fix #14: NODE_ENV yozuv xatosidan himoya', () => {
  it("tanilgan qiymatlar (development/production/test) yoki aniqlanmagan holat o'tkaziladi", () => {
    expect(() => assertKnownNodeEnv(undefined)).not.toThrow();
    expect(() => assertKnownNodeEnv('development')).not.toThrow();
    expect(() => assertKnownNodeEnv('production')).not.toThrow();
    expect(() => assertKnownNodeEnv('test')).not.toThrow();
  });

  it("noto'g'ri yozilgan qiymat (masalan 'prod') rad etiladi", () => {
    expect(() => assertKnownNodeEnv('prod')).toThrow();
    expect(() => assertKnownNodeEnv('Production')).toThrow();
    expect(() => assertKnownNodeEnv('PRODUCTION')).toThrow();
    expect(() => assertKnownNodeEnv('prodcution')).toThrow();
  });
});
