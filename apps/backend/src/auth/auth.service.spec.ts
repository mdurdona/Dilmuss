import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { TestContext } from '../test/db-fixtures';
import { buildAuthService } from '../test/service-builders';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('AuthService.refresh — security fix #6: refresh-token rotation + reuse detection', () => {
  const ctx = new TestContext();
  const authService = buildAuthService(ctx.prisma);

  afterAll(async () => {
    await ctx.cleanup();
  });

  async function seedSession(userId: string, opts: { revoked?: boolean; expired?: boolean } = {}) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await ctx.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hashToken(rawToken),
        expiresAt: opts.expired ? new Date(Date.now() - 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revokedAt: opts.revoked ? new Date() : null,
      },
    });
    return rawToken;
  }

  it("oddiy refresh — eski sessiya revoke bo'ladi, yangi token qaytadi (rotation)", async () => {
    const user = await ctx.makeCustomer();
    const rawToken = await seedSession(user.id);

    const result = await authService.refresh(rawToken, {});
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(rawToken);

    const oldSession = await ctx.prisma.session.findUniqueOrThrow({
      where: { refreshTokenHash: hashToken(rawToken) },
    });
    expect(oldSession.revokedAt).not.toBeNull();

    const activeSessions = await ctx.prisma.session.count({ where: { userId: user.id, revokedAt: null } });
    expect(activeSessions).toBe(1); // faqat yangi sessiya faol
  });

  it('reuse: allaqachon ishlatilgan (revoke qilingan) token qayta yuborilsa rad etiladi VA foydalanuvchining BARCHA sessiyalari bekor qilinadi', async () => {
    const user = await ctx.makeCustomer();
    const rawToken = await seedSession(user.id);

    // 1-marta: normal rotatsiya
    const first = await authService.refresh(rawToken, {});

    const newSessionBefore = await ctx.prisma.session.findUniqueOrThrow({
      where: { refreshTokenHash: hashToken(first.refreshToken) },
    });
    expect(newSessionBefore.revokedAt).toBeNull();

    // 2-marta: ESKI (allaqachon revoke qilingan) token bilan qayta urinish — o'g'irlangan token
    // replay hujumi simulyatsiyasi.
    await expect(authService.refresh(rawToken, {})).rejects.toThrow(UnauthorizedException);

    // Reuse aniqlangach, HATTO yangi (hech qachon o'zi reuse qilinmagan, hali muddati o'tmagan)
    // sessiya ham bekor qilingan bo'lishi kerak — butun "sessiya oilasi" yopiladi.
    const newSessionAfter = await ctx.prisma.session.findUniqueOrThrow({
      where: { refreshTokenHash: hashToken(first.refreshToken) },
    });
    expect(newSessionAfter.revokedAt).not.toBeNull();

    const activeSessionsAfter = await ctx.prisma.session.count({ where: { userId: user.id, revokedAt: null } });
    expect(activeSessionsAfter).toBe(0);
  });

  it("muddati o'tgan (lekin revoke qilinmagan) token rad etiladi, lekin boshqa faol sessiyalarga tegmaydi", async () => {
    const user = await ctx.makeCustomer();
    const expiredToken = await seedSession(user.id, { expired: true });
    const otherActiveToken = await seedSession(user.id); // boshqa qurilmadagi faol sessiya

    await expect(authService.refresh(expiredToken, {})).rejects.toThrow(UnauthorizedException);

    // Muddati o'tishi reuse emas — demak boshqa faol sessiyaga ta'sir qilmasligi kerak.
    const otherSession = await ctx.prisma.session.findUniqueOrThrow({
      where: { refreshTokenHash: hashToken(otherActiveToken) },
    });
    expect(otherSession.revokedAt).toBeNull();
  });

  it("mavjud bo'lmagan (soxta) token ham rad etiladi", async () => {
    await expect(authService.refresh('nonexistent-token-1234', {})).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.revokeAllSessions — security fix #9: barcha qurilmalardan chiqish', () => {
  const ctx = new TestContext();
  const authService = buildAuthService(ctx.prisma);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("foydalanuvchining barcha qurilmalaridagi faol sessiyalarini bekor qiladi", async () => {
    const user = await ctx.makeCustomer();
    await seedSession(ctx, user.id);
    await seedSession(ctx, user.id);
    await seedSession(ctx, user.id);

    await authService.revokeAllSessions(user.id);

    const activeCount = await ctx.prisma.session.count({ where: { userId: user.id, revokedAt: null } });
    expect(activeCount).toBe(0);
  });

  it("boshqa foydalanuvchining sessiyalariga tegmaydi", async () => {
    const userA = await ctx.makeCustomer();
    const userB = await ctx.makeCustomer();
    await seedSession(ctx, userA.id);
    await seedSession(ctx, userB.id);

    await authService.revokeAllSessions(userA.id);

    const bActive = await ctx.prisma.session.count({ where: { userId: userB.id, revokedAt: null } });
    expect(bActive).toBe(1);
  });
});

async function seedSession(ctx: TestContext, userId: string) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await ctx.prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  return rawToken;
}
