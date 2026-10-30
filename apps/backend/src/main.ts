import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { resolveCorsOrigins } from './common/utils/cors-config';
import { assertKnownNodeEnv, assertProductionJwtSecret } from './common/utils/production-config';

async function bootstrap() {
  // Bular ConfigService tayyor bo'lishidan oldin, NestFactory.create()'dan ham oldin tekshiriladi —
  // noto'g'ri konfiguratsiya bilan ilova butunlay ishga tushmasligi kerak, qisman ishlab
  // xavfsizlik teshigini yashirmasligi kerak.
  assertKnownNodeEnv(process.env.NODE_ENV);
  assertProductionJwtSecret(process.env.NODE_ENV, process.env.JWT_ACCESS_SECRET);

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  const isProduction = process.env.NODE_ENV === 'production';
  // credentials:true + keng/aniqlanmagan origin xavfli kombinatsiya — productionda aniq
  // allowlist bo'lmasa, xato bilan darhol to'xtaymiz (silent fallback yoki '*' o'rniga).
  app.enableCors({
    origin: resolveCorsOrigins(process.env.NODE_ENV, process.env.CORS_ORIGIN),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger UI ichki API strukturasini (route'lar, DTO shakllari) oshkor qiladi — productionda ochiq
  // qolmasligi kerak (hech qanday auth bilan himoyalanmagan public endpoint bo'lardi).
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Dilmuss API')
      .setDescription("Ayollar kiyim do'koni — ko'p filialli e-commerce backend")
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Dilmuss backend http://localhost:${port}/api${isProduction ? '' : ' (docs: /api/docs)'}`);
}
bootstrap();
