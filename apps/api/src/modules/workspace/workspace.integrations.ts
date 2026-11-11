import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router, raw } from 'express';
import { z } from 'zod';
import type { ChallengeConfig } from '@gt/shared';
import type { PrismaClient } from '../../lib/prisma';
import type { Env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { WorkspaceSettings } from './workspace.settings';
import { createRateLimiter } from '../../middleware/rate-limit';

async function remoteJson(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    const value = await response.json();
    if (!response.ok || !value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('remote');
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Bağlantı doğrulanamadı. Anahtarları, izinleri ve sağlayıcıdaki ayarları kontrol edin.',
    );
  }
}

export async function verifyRobot(
  provider: ChallengeConfig['provider'],
  values: Record<string, string>,
  token: unknown,
  hostname: string,
  ip?: string,
) {
  if (typeof token !== 'string' || !token || token.length > 8192)
    throw new HttpError(400, 'VALIDATION_ERROR', 'Robot doğrulamasını tamamlayın.');
  if (!values.siteKey || !values.secretKey)
    throw new HttpError(400, 'VALIDATION_ERROR', 'Robot doğrulaması yapılandırılmamış.');
  const result = await remoteJson(
    provider === 'cloudflare'
      ? 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      : 'https://www.google.com/recaptcha/api/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: values.secretKey,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    },
  );
  if (result.success !== true || result.hostname !== hostname)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'Robot doğrulaması başarısız veya süresi dolmuş. Yeniden deneyin.',
    );
}

export class WorkspaceChallenge {
  private settings: WorkspaceSettings;
  constructor(
    private db: PrismaClient,
    private env: Env,
  ) {
    this.settings = new WorkspaceSettings(db, env.COOKIE_SECRET);
  }
  async resolve(email?: string) {
    const member = email
      ? await this.db.isletmeUyesi.findUnique({
          where: { email: email.trim().toLowerCase() },
          select: { businessId: true, durum: true },
        })
      : null;
    let explicitlyConfigured = false;
    if (member?.durum)
      for (const provider of ['cloudflare', 'recaptcha'] as const) {
        const values = await this.settings.values(member.businessId, provider, true);
        explicitlyConfigured ||= values.enabled !== undefined;
        if (values.enabled !== 'true') continue;
        return { provider, values };
      }
    if (explicitlyConfigured) return null;
    const provider = this.env.ROBOT_PROVIDER;
    if (!provider || provider === 'none') return null;
    return {
      provider,
      values: {
        siteKey:
          (provider === 'cloudflare' ? this.env.TURNSTILE_SITE_KEY : this.env.RECAPTCHA_SITE_KEY) ??
          '',
        secretKey:
          (provider === 'cloudflare'
            ? this.env.TURNSTILE_SECRET_KEY
            : this.env.RECAPTCHA_SECRET_KEY) ?? '',
      },
    };
  }
  async publicConfig(email?: string): Promise<ChallengeConfig | null> {
    const resolved = await this.resolve(email);
    return resolved
      ? { provider: resolved.provider, siteKey: resolved.values.siteKey ?? '' }
      : null;
  }
  async enforce(email: string, token: unknown, ip?: string) {
    const resolved = await this.resolve(email);
    if (resolved) {
      const { provider, values } = resolved;
      try {
        await verifyRobot(provider, values, token, new URL(this.env.APP_URL).hostname, ip);
      } catch (error) {
        const failure =
          error instanceof HttpError
            ? error
            : new HttpError(400, 'VALIDATION_ERROR', 'Robot doğrulaması tamamlanamadı.');
        failure.challenge = { provider, siteKey: values.siteKey ?? '' };
        throw failure;
      }
    }
  }
}

// Managed by the application, independently of business settings.
const META_GRAPH_API_VERSION = 'v25.0';

export async function whatsappRequest(
  values: Record<string, string>,
  message?: { to: string; text: string },
) {
  if (values.enabled !== 'true')
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'WhatsApp entegrasyonunu etkinleştirin ve kaydedin.',
    );
  if (!/^\d{5,30}$/.test(values.phoneNumberId ?? '') || !values.accessToken || !values.appSecret)
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'WhatsApp bağlantı bilgileri eksik veya geçersiz.',
    );
  const url = new URL(
    `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${values.phoneNumberId}${message ? '/messages' : ''}`,
  );
  url.searchParams.set(
    'appsecret_proof',
    createHmac('sha256', values.appSecret).update(values.accessToken).digest('hex'),
  );
  if (!message) url.searchParams.set('fields', 'id,display_phone_number,verified_name');
  const result = await remoteJson(url.href, {
    method: message ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${values.accessToken}`,
      ...(message ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(message
      ? {
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: message.to.replace(/^\+/, ''),
            type: 'text',
            text: { preview_url: false, body: message.text },
          }),
        }
      : {}),
  });
  if (!message && result.id !== values.phoneNumberId)
    throw new HttpError(400, 'VALIDATION_ERROR', 'Telefon numarası kimliği doğrulanamadı.');
  return result;
}

export function whatsappWebhook(db: PrismaClient, env: Env) {
  const router = Router();
  const settings = new WorkspaceSettings(db, env.COOKIE_SECRET);
  router.use(createRateLimiter({ enabled: env.rateLimitEnabled, windowMs: 60000, limit: 120 }));
  router.get('/:businessId', async (req, res) => {
    const businessId = z.coerce
      .number()
      .int()
      .positive()
      .max(2147483647)
      .parse(req.params.businessId);
    const values = await settings.values(businessId, 'whatsapp', true);
    const token = req.query['hub.verify_token'];
    if (
      values.enabled !== 'true' ||
      typeof token !== 'string' ||
      !values.verifyToken ||
      token.length > 4000 ||
      req.query['hub.mode'] !== 'subscribe'
    )
      throw new HttpError(403, 'FORBIDDEN', 'Webhook doğrulanamadı.');
    const left = Buffer.from(token);
    const right = Buffer.from(values.verifyToken);
    if (left.length !== right.length || !timingSafeEqual(left, right))
      throw new HttpError(403, 'FORBIDDEN', 'Webhook doğrulanamadı.');
    const challenge = z.string().max(1000).parse(req.query['hub.challenge']);
    res.type('text/plain').send(challenge);
  });
  router.post(
    '/:businessId',
    raw({ type: 'application/json', limit: '128kb' }),
    async (req, res) => {
      const businessId = z.coerce
        .number()
        .int()
        .positive()
        .max(2147483647)
        .parse(req.params.businessId);
      const values = await settings.values(businessId, 'whatsapp', true);
      const signature = req.get('x-hub-signature-256') ?? '';
      if (
        values.enabled !== 'true' ||
        !values.appSecret ||
        !Buffer.isBuffer(req.body) ||
        !/^sha256=[0-9a-f]{64}$/.test(signature)
      )
        throw new HttpError(403, 'FORBIDDEN', 'Webhook imzası geçersiz.');
      const expected = createHmac('sha256', values.appSecret).update(req.body).digest();
      if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex')))
        throw new HttpError(403, 'FORBIDDEN', 'Webhook imzası geçersiz.');
      let decoded: unknown;
      try {
        decoded = JSON.parse(req.body.toString('utf8'));
      } catch {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçersiz webhook gövdesi.');
      }
      const payload = z
        .object({
          object: z.literal('whatsapp_business_account'),
          entry: z.array(
            z.object({
              changes: z.array(
                z.object({
                  value: z.object({
                    metadata: z.object({ phone_number_id: z.string() }),
                    messages: z.array(z.unknown()).optional(),
                    statuses: z.array(z.unknown()).optional(),
                  }),
                }),
              ),
            }),
          ),
        })
        .parse(decoded);
      const changes = payload.entry.flatMap((entry) => entry.changes);
      if (
        !changes.length ||
        changes.some((change) => change.value.metadata.phone_number_id !== values.phoneNumberId)
      )
        throw new HttpError(403, 'FORBIDDEN', 'Webhook telefon numarası bu işletmeye ait değil.');
      await db.islemKaydi.create({
        data: {
          businessId,
          userName: 'Meta WhatsApp',
          section: 'settings',
          action: 'WhatsApp Olayı',
          status: 'Başarılı',
          changes: {
            create: [
              {
                field: 'Gelen Mesaj Sayısı',
                after: String(changes.reduce((n, c) => n + (c.value.messages?.length ?? 0), 0)),
              },
              {
                field: 'Teslimat Bildirimi Sayısı',
                after: String(changes.reduce((n, c) => n + (c.value.statuses?.length ?? 0), 0)),
              },
            ],
          },
        },
      });
      res.sendStatus(200);
    },
  );
  return router;
}
