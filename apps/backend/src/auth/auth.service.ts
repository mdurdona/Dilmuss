import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuditAction, NotificationChannel, NotificationType, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const BCRYPT_ROUNDS = 10;
const OTP_TTL_MINUTES = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_VERIFIED_WINDOW_MINUTES = 15;

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** TZ'dan tashqari qo'shildi — ro'yxatdan o'tishda telefon raqamini OTP orqali tasdiqlash (TZ 20.1 stub orqali yuboriladi). */
  async requestRegisterOtp(dto: RequestOtpDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException("Bu telefon raqami allaqachon ro'yxatdan o'tgan");

    const recent = await this.prisma.phoneVerification.findFirst({
      where: { phone: dto.phone },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const elapsedMs = Date.now() - recent.createdAt.getTime();
      if (elapsedMs < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
        const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000);
        throw new ForbiddenException(`Qayta yuborish uchun ${waitSeconds} soniya kuting`);
      }
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    await this.prisma.phoneVerification.create({
      data: {
        phone: dto.phone,
        codeHash: this.hashToken(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    await this.notificationsService.notify({
      type: NotificationType.PHONE_VERIFICATION,
      channel: NotificationChannel.SMS,
      recipient: dto.phone,
      message: `Dilmuss tasdiqlash kodi: ${code}. Kod ${OTP_TTL_MINUTES} daqiqa amal qiladi.`,
    });

    return { sent: true, expiresInSeconds: OTP_TTL_MINUTES * 60 };
  }

  /** TZ'dan tashqari qo'shildi. */
  async verifyRegisterOtp(dto: VerifyOtpDto) {
    const record = await this.prisma.phoneVerification.findFirst({
      where: { phone: dto.phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new UnauthorizedException("Tasdiqlash kodi topilmadi, qaytadan so'rang");
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Tasdiqlash kodi muddati tugagan, qaytadan so\'rang');
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new ForbiddenException("Urinishlar soni tugadi, qaytadan kod so'rang");
    }

    const valid = this.hashToken(dto.code) === record.codeHash;
    if (!valid) {
      await this.prisma.phoneVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Tasdiqlash kodi xato');
    }

    await this.prisma.phoneVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { verified: true };
  }

  private async issueTokens(userId: string, role: UserRole, phone: string, ctx: LoginContext) {
    const payload = { sub: userId, role, phone };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_TTL', '15m') as any,
    });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTtlDays = 30;
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.hashToken(refreshToken),
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto, ctx: LoginContext) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Bu telefon raqami allaqachon ro\'yxatdan o\'tgan');

    const verification = await this.prisma.phoneVerification.findFirst({
      where: {
        phone: dto.phone,
        consumedAt: { gt: new Date(Date.now() - OTP_VERIFIED_WINDOW_MINUTES * 60 * 1000) },
      },
      orderBy: { consumedAt: 'desc' },
    });
    if (!verification) {
      throw new ForbiddenException("Telefon raqami tasdiqlanmagan. Avval OTP kodni tasdiqlang.");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash,
        role: UserRole.CUSTOMER,
      },
    });
    await this.prisma.phoneVerification.delete({ where: { id: verification.id } });

    await this.auditService.record({
      userId: user.id,
      action: AuditAction.CREATE,
      entity: 'User',
      entityId: user.id,
      newValue: { fullName: user.fullName, phone: user.phone, role: user.role },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const tokens = await this.issueTokens(user.id, user.role, user.phone, ctx);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto, ctx: LoginContext) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) {
      await this.auditService.record({
        action: AuditAction.FAILED_LOGIN,
        entity: 'User',
        newValue: { phone: dto.phone, reason: 'not_found' },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Telefon raqami yoki parol xato');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Hisob vaqtincha bloklangan. ${user.lockedUntil.toISOString()} dan keyin qayta urinib ko'ring.`,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Hisob faol emas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      const failedLoginCount = user.failedLoginCount + 1;
      const shouldLock = failedLoginCount >= MAX_FAILED_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: shouldLock ? 0 : failedLoginCount,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000) : null,
        },
      });
      await this.auditService.record({
        userId: user.id,
        action: AuditAction.FAILED_LOGIN,
        entity: 'User',
        entityId: user.id,
        newValue: { failedLoginCount },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException('Telefon raqami yoki parol xato');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.auditService.record({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const tokens = await this.issueTokens(user.id, user.role, user.phone, ctx);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string, ctx: LoginContext) {
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Sessiya yaroqsiz, qayta login qiling');
    }

    if (session.revokedAt) {
      // Reuse detection: har bir refresh token faqat bir marta ishlatiladi (rotatsiya bilan darhol
      // revoke qilinadi). Allaqachon revoke qilingan token qayta kelsa — bu token o'g'irlanib,
      // asl foydalanuvchi rotatsiyadan o'tgandan keyin o'g'ri uni qayta ishlatmoqchi bo'lgani (yoki
      // aksincha) degani. Qaysi tomon haqiqiy ekanini bilib bo'lmagani uchun ehtiyot chorasi sifatida
      // shu foydalanuvchining BARCHA faol sessiyalarini bekor qilamiz (hamma qurilmadan chiqariladi).
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.auditService.record({
        userId: session.userId,
        action: AuditAction.FAILED_LOGIN,
        entity: 'Session',
        entityId: session.id,
        newValue: { reason: 'refresh_token_reuse_detected' },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      throw new UnauthorizedException(
        "Xavfsizlik sababli barcha qurilmalardan chiqarildingiz — qayta ishlatilgan sessiya aniqlandi. Qayta login qiling",
      );
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessiya muddati tugagan, qayta login qiling');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(session.user.id, session.user.role, session.user.phone, ctx);
    return { user: this.toPublicUser(session.user), ...tokens };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * "Barcha qurilmalardan chiqish" — o'z-o'ziga xizmat (`/auth/logout-all`) va foydalanuvchi
   * bloklanganda / paroli reset qilinganda (UsersService) chaqiriladi. Refresh-token oynasini
   * (30 kun) qisqartirib, joriy access token muddati (15 daqiqa) bilan chegaralaydi.
   */
  async revokeAllSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toPublicUser(user);
  }

  private toPublicUser(user: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    role: UserRole;
    status: UserStatus;
    branchScope: string;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      branchScope: user.branchScope,
      createdAt: user.createdAt,
    };
  }
}
