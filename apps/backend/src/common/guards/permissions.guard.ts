import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCode, UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsService } from '../../rbac/permissions.service';
import type { RequestUser } from '../types/request-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) throw new ForbiddenException('Autentifikatsiya talab qilinadi');

    // Permission != Role: CUSTOMER hech qachon (hatto biror override unga tasodifan/xato
    // berilgan bo'lsa ham) admin-boshqaruv amalini bajara olmasligi kerak — bu tekshiruv
    // permission Set hisobidan mustaqil, alohida qatlam sifatida ishlaydi.
    if (user.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Bu amal uchun ruxsat yo\'q');
    }

    const effective = await this.permissionsService.getEffectivePermissions(user.id);
    const allowed = required.every((code) => effective.has(code));
    if (!allowed) throw new ForbiddenException('Bu amal uchun ruxsat yo\'q');

    return true;
  }
}
