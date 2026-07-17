import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Railway (and most PaaS hosts) sit behind a reverse proxy. Without this, req.ip
  // resolves to the proxy's address for every request, which breaks per-IP rate
  // limiting (ThrottlerGuard) and makes audit log IPs useless.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  app.setGlobalPrefix('api');

  const port = config.get<string>('PORT', '3001');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`HRMS API listening on port ${port}`);
}

bootstrap();
