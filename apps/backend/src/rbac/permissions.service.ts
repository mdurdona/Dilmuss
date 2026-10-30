import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OverrideEffect, PermissionCode, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** TZ 4.6 — yakuniy ruxsat = RolePermission ± UserPermissionOverride. SUPERADMIN har doim to'liq huquqga ega. */
  async getEffectivePermissions(userId: string): Promise<Set<PermissionCode>> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });

    if (user.role === UserRole.SUPERADMIN) {
      return new Set(Object.values(PermissionCode));
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: { code: user.role } },
      select: { permission: { select: { code: true } } },
    });
    const effective = new Set<PermissionCode>(rolePermissions.map((rp) => rp.permission.code));

    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { userId },
      select: { effect: true, permission: { select: { code: true } } },
    });
    for (const override of overrides) {
      if (override.effect === OverrideEffect.GRANT) {
        effective.add(override.permission.code);
      } else {
        effective.delete(override.permission.code);
      }
    }

    return effective;
  }

  async hasPermission(userId: string, code: PermissionCode): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId);
    return effective.has(code);
  }

  listAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  }

  getUserOverrides(userId: string) {
    return this.prisma.userPermissionOverride.findMany({
      where: { userId },
      select: { effect: true, permission: { select: { code: true } } },
    });
  }

  async setOverride(userId: string, permissionCode: PermissionCode, effect: OverrideEffect, grantedById: string) {
    // Permission != Role: override faqat ADMIN rolidagi hisoblarni "nozik sozlash" uchun —
    // CUSTOMER'ga override berish uni amalda xodimga aylantirib qo'yadi (Guard buni alohida
    // tekshiradi, lekin bu yerda ham to'sib qo'yamiz — noto'g'ri holat umuman yaratilmasin).
    // SUPERADMIN'ga override befoyda (getEffectivePermissions uni doim to'liq huquqli qiladi).
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (target.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        target.role === UserRole.SUPERADMIN
          ? "SUPERADMIN'ga permission override berilmaydi (u har doim to'liq huquqli)"
          : 'Permission override faqat ADMIN rolidagi foydalanuvchilarga berilishi mumkin',
      );
    }

    const permission = await this.prisma.permission.findUnique({ where: { code: permissionCode } });
    if (!permission) throw new NotFoundException('Permission topilmadi');

    return this.prisma.userPermissionOverride.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      create: { userId, permissionId: permission.id, effect, grantedById },
      update: { effect, grantedById },
    });
  }

  async removeOverride(userId: string, permissionCode: PermissionCode) {
    const permission = await this.prisma.permission.findUnique({ where: { code: permissionCode } });
    if (!permission) throw new NotFoundException('Permission topilmadi');

    await this.prisma.userPermissionOverride.deleteMany({
      where: { userId, permissionId: permission.id },
    });
  }
}
