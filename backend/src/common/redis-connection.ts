import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// BullMQ requires maxRetriesPerRequest: null on its Redis connection (blocking commands
// otherwise time out). Managed Redis (Railway, Render, Upstash, etc.) is reached via a
// single REDIS_URL with auth/TLS baked in (rediss:// for TLS); local dev falls back to
// discrete host/port with no auth.
export function createRedisConnection(config: ConfigService): Redis {
  const redisUrl = config.get<string>('REDIS_URL');
  if (redisUrl) {
    return new Redis(redisUrl, { maxRetriesPerRequest: null });
  }
  return new Redis({
    host: config.get<string>('REDIS_HOST', 'localhost'),
    port: Number(config.get<string>('REDIS_PORT', '6379')),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
    maxRetriesPerRequest: null,
  });
}
