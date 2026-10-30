import type { NotificationsService } from '../notifications/notifications.service';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryController } from '../inventory/inventory.controller';
import { DeliveryZonesService } from '../delivery/delivery-zones.service';
import { DeliveryService } from '../delivery/delivery.service';
import { SettingsService } from '../settings/settings.service';
import { AuditService } from '../audit/audit.service';
import { BranchAccessService } from '../branches/branch-access.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { AuthService } from '../auth/auth.service';

/** Nest DI'siz, real (mocklanmagan) servislarni qo'lda "wire" qilib beradi — haqiqiy DB integratsion testlar uchun. */
export function buildServices(prisma: PrismaService) {
  const inventoryService = new InventoryService(prisma);
  const deliveryZonesService = new DeliveryZonesService(prisma);
  const branchAccessService = new BranchAccessService(prisma);
  const deliveryService = new DeliveryService(prisma, branchAccessService);
  const settingsService = new SettingsService(prisma);
  // Bu testlar authorization/transaction mantig'ini tekshiradi, notification yetkazilishini emas —
  // shuning uchun haqiqiy TelegramAdapter/ConfigService'ni import qilmaymiz (ESM/CJS interop muammosi
  // bilan bog'liq emas, faqat keraksiz — NotificationsService.notify() shunchaki no-op stub).
  const notificationsService = { notify: async () => undefined } as unknown as NotificationsService;
  const auditService = new AuditService(prisma);

  const ordersService = new OrdersService(
    prisma,
    inventoryService,
    deliveryZonesService,
    deliveryService,
    settingsService,
    notificationsService,
    auditService,
    branchAccessService,
  );

  const paymentsService = new PaymentsService(prisma, ordersService);

  const inventoryController = new InventoryController(inventoryService, auditService, prisma, branchAccessService);

  return { inventoryService, ordersService, paymentsService, branchAccessService, inventoryController, deliveryService };
}

/**
 * AuthService'ni real Prisma bilan quradi (refresh-token rotation/reuse testlari uchun).
 * `@nestjs/jwt`ning ESM dist'i Jest'da yuklanmaydi (xuddi @nestjs/config kabi) — bu testlar
 * access-token JWT mazmunini emas, refresh-token/Session mantig'ini tekshirgani uchun stub yetarli.
 */
export function buildAuthService(prisma: PrismaService) {
  const jwtService = { sign: () => 'stub-access-token' } as unknown as JwtService;
  const configStub = {
    get: (key: string, fallback?: unknown) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-only-jwt-secret';
      return fallback;
    },
  } as unknown as ConfigService;
  const auditService = new AuditService(prisma);
  const notificationsService = { notify: async () => undefined } as unknown as NotificationsService;

  return new AuthService(prisma, jwtService, configStub, auditService, notificationsService);
}
