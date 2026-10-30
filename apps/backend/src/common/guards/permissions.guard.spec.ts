import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { UserRole, OverrideEffect, PermissionCode } from '@prisma/client';
import { TestContext } from '../../test/db-fixtures';
import { PermissionsService } from '../../rbac/permissions.service';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

function fakeContext(user: { id: string; role: UserRole; phone: string } | null, requiredPermissions: PermissionCode[]) {
  const handler = function dummyHandler() {};
  Reflect.defineMetadata(PERMISSIONS_KEY, requiredPermissions, handler);
  const klass = class DummyController {};
  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as any;
}

describe('PermissionsGuard — security fix #7: Permission != Role', () => {
  const ctx = new TestContext();
  const permissionsService = new PermissionsService(ctx.prisma);
  const guard = new PermissionsGuard(new Reflector(), permissionsService);

  afterAll(async () => {
    await ctx.cleanup();
  });

  it("CUSTOMER'ga (noto'g'ri/eski yo'l bilan) override GRANT qilingan bo'lsa ham, Guard uni rad etadi", async () => {
    const customer = await ctx.makeCustomer();
    // setOverride() endi bunday holatni servis darajasida oldindan bloklaydi — Guard'ning o'zini
    // (ikkinchi mudofaa qatlami sifatida) sinash uchun bu yerda to'g'ridan-to'g'ri DB'ga yozamiz.
    const permission = await ctx.prisma.permission.findFirstOrThrow({ where: { code: PermissionCode.PRODUCT_CREATE } });
    await ctx.prisma.userPermissionOverride.create({
      data: { userId: customer.id, permissionId: permission.id, effect: OverrideEffect.GRANT },
    });

    const context = fakeContext({ id: customer.id, role: UserRole.CUSTOMER, phone: customer.phone }, [
      PermissionCode.PRODUCT_CREATE,
    ]);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('ADMIN kerakli permissionga ega bo\'lsa o\'tkaziladi', async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });
    const permission = await ctx.prisma.permission.findFirstOrThrow({ where: { code: PermissionCode.PRODUCT_CREATE } });
    await ctx.prisma.userPermissionOverride.create({
      data: { userId: admin.id, permissionId: permission.id, effect: OverrideEffect.GRANT },
    });

    const context = fakeContext({ id: admin.id, role: UserRole.ADMIN, phone: admin.phone }, [
      PermissionCode.PRODUCT_CREATE,
    ]);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('ADMIN kerakli permissionga ega bo\'lmasa rad etiladi', async () => {
    const admin = await ctx.makeAdmin({ branchScope: 'OWN_BRANCH' as any });

    const context = fakeContext({ id: admin.id, role: UserRole.ADMIN, phone: admin.phone }, [
      PermissionCode.SYSTEM_SETTINGS_UPDATE,
    ]);
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('permission talab qilinmasa (decorator yoʻq), autentifikatsiyalangan har kim oʻtadi', async () => {
    const customer = await ctx.makeCustomer();
    const context = fakeContext({ id: customer.id, role: UserRole.CUSTOMER, phone: customer.phone }, []);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
