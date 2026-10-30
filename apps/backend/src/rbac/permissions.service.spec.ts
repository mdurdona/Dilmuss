import { ForbiddenException } from '@nestjs/common';
import { OverrideEffect, PermissionCode } from '@prisma/client';
import { TestContext } from '../test/db-fixtures';
import { PermissionsService } from './permissions.service';

describe('PermissionsService.setOverride — security fix #7: faqat ADMIN nishoniga override', () => {
  const ctx = new TestContext();
  const permissionsService = new PermissionsService(ctx.prisma);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("CUSTOMER nishoniga override berish rad etiladi", async () => {
    const customer = await ctx.makeCustomer();
    const granter = await ctx.makeSuperadmin();

    await expect(
      permissionsService.setOverride(customer.id, PermissionCode.PRODUCT_CREATE, OverrideEffect.GRANT, granter.id),
    ).rejects.toThrow(ForbiddenException);

    const overrides = await ctx.prisma.userPermissionOverride.findMany({ where: { userId: customer.id } });
    expect(overrides).toHaveLength(0);
  });

  it("SUPERADMIN nishoniga override berish rad etiladi (befoyda bo'lgani uchun)", async () => {
    const superadmin = await ctx.makeSuperadmin();
    const granter = await ctx.makeSuperadmin();

    await expect(
      permissionsService.setOverride(superadmin.id, PermissionCode.PRODUCT_CREATE, OverrideEffect.GRANT, granter.id),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ADMIN nishoniga override berish ishlayveradi', async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });
    const granter = await ctx.makeSuperadmin();

    const result = await permissionsService.setOverride(
      admin.id,
      PermissionCode.PRODUCT_CREATE,
      OverrideEffect.GRANT,
      granter.id,
    );
    expect(result.effect).toBe(OverrideEffect.GRANT);

    const effective = await permissionsService.getEffectivePermissions(admin.id);
    expect(effective.has(PermissionCode.PRODUCT_CREATE)).toBe(true);
  });
});
