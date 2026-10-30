import * as crypto from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { TestContext } from '../test/db-fixtures';
import { buildAuthService } from '../test/service-builders';
import { UsersService } from './users.service';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('UsersService — security fixes #10 (SUPERADMIN protection) va #9 (block/parol → session revoke)', () => {
  const ctx = new TestContext();
  const authService = buildAuthService(ctx.prisma);
  const usersService = new UsersService(ctx.prisma, authService);

  async function seedActiveSession(userId: string) {
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

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("PATCH /users/:id (update) — SUPERADMIN nishonini o'zgartirib bo'lmaydi", async () => {
    const target = await ctx.makeSuperadmin();

    await expect(usersService.update(target.id, { fullName: 'Boshqa ism' })).rejects.toThrow(ForbiddenException);

    const after = await ctx.prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.fullName).toBe('Test Superadmin'); // o'zgarmagan
  });

  it("PATCH /users/:id (update) — SUPERADMIN nishoniga parol reset qilib bo'lmaydi", async () => {
    const target = await ctx.makeSuperadmin();
    const originalHash = target.passwordHash;

    await expect(usersService.update(target.id, { password: 'YangiKuchliParol123' })).rejects.toThrow(
      ForbiddenException,
    );

    const after = await ctx.prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.passwordHash).toBe(originalHash); // parol o'zgarmagan
  });

  it("PATCH /users/:id/status (setStatus) — SUPERADMIN nishonini bloklab bo'lmaydi", async () => {
    const target = await ctx.makeSuperadmin();

    await expect(usersService.setStatus(target.id, UserStatus.BLOCKED)).rejects.toThrow(ForbiddenException);

    const after = await ctx.prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.status).toBe(UserStatus.ACTIVE); // hali ham ACTIVE
  });

  it('ADMIN nishoni uchun update/setStatus normal ishlayveradi (SUPERADMIN himoyasi faqat SUPERADMINga tegishli)', async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });

    const updated = await usersService.update(admin.id, { fullName: 'Yangilangan Admin' });
    expect(updated.fullName).toBe('Yangilangan Admin');

    const blocked = await usersService.setStatus(admin.id, UserStatus.BLOCKED);
    expect(blocked.status).toBe(UserStatus.BLOCKED);
  });

  it("#9: admin BLOCKED qilinganda uning faol sessiyalari darhol bekor qilinadi", async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });
    await seedActiveSession(admin.id);
    await seedActiveSession(admin.id); // 2-qurilma

    await usersService.setStatus(admin.id, UserStatus.BLOCKED);

    const activeSessions = await ctx.prisma.session.count({ where: { userId: admin.id, revokedAt: null } });
    expect(activeSessions).toBe(0);
  });

  it("#9: admin qayta ACTIVE qilinganda sessiyalarga tegilmaydi (faqat blocklashda revoke qilinadi)", async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });
    await seedActiveSession(admin.id);
    await usersService.setStatus(admin.id, UserStatus.ACTIVE);

    const activeSessions = await ctx.prisma.session.count({ where: { userId: admin.id, revokedAt: null } });
    expect(activeSessions).toBe(1);
  });

  it("#9: admin paroli reset qilinganda eski sessiyalar darhol bekor qilinadi", async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });
    await seedActiveSession(admin.id);

    await usersService.update(admin.id, { password: 'YangiKuchliParol123' });

    const activeSessions = await ctx.prisma.session.count({ where: { userId: admin.id, revokedAt: null } });
    expect(activeSessions).toBe(0);
  });

  it("#9: parolsiz oddiy update (masalan ism) sessiyalarga tegmaydi", async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });
    await seedActiveSession(admin.id);

    await usersService.update(admin.id, { fullName: 'Faqat ism' });

    const activeSessions = await ctx.prisma.session.count({ where: { userId: admin.id, revokedAt: null } });
    expect(activeSessions).toBe(1);
  });
});
