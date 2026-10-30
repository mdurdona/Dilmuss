import { resolveCorsOrigins } from './cors-config';

describe('resolveCorsOrigins — security fix #16 (CORS production hardening)', () => {
  it('dev muhitda CORS_ORIGIN berilmasa localhost:3000ga fallback qiladi', () => {
    expect(resolveCorsOrigins(undefined, undefined)).toBe('http://localhost:3000');
    expect(resolveCorsOrigins('development', undefined)).toBe('http://localhost:3000');
  });

  it("productionda CORS_ORIGIN berilmasa xato tashlaydi (silent fallback yo'q)", () => {
    expect(() => resolveCorsOrigins('production', undefined)).toThrow();
    expect(() => resolveCorsOrigins('production', '')).toThrow();
  });

  it("productionda CORS_ORIGIN='*' bo'lsa xato tashlaydi (credentials:true bilan xavfli)", () => {
    expect(() => resolveCorsOrigins('production', '*')).toThrow();
    expect(() => resolveCorsOrigins('production', 'https://dilmuss.uz,*')).toThrow();
  });

  it("productionda aniq allowlist berilsa ruxsat etiladi", () => {
    expect(resolveCorsOrigins('production', 'https://dilmuss.uz')).toEqual(['https://dilmuss.uz']);
    expect(resolveCorsOrigins('production', 'https://dilmuss.uz, https://admin.dilmuss.uz')).toEqual([
      'https://dilmuss.uz',
      'https://admin.dilmuss.uz',
    ]);
  });
});
