import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const REDACTED_KEYS = ['passwordHash', 'refreshTokenHash', 'password'];

function redact(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'object') return value as Prisma.InputJsonValue;
  const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const key of REDACTED_KEYS) {
    if (key in clone) clone[key] = '[REDACTED]';
  }
  return clone as Prisma.InputJsonValue;
}

interface RecordAuditInput {
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  branchId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** TZ 18 — har bir sezilarli amal AuditLog'ga yoziladi; maxfiy maydonlar oldindan redact qilinadi. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput) {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        oldValue: redact(input.oldValue),
        newValue: redact(input.newValue),
        branchId: input.branchId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  findMany(params: { entity?: string; userId?: string; branchId?: string; take?: number; skip?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        entity: params.entity,
        userId: params.userId,
        branchId: params.branchId,
      },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
      skip: params.skip ?? 0,
    });
  }
}
