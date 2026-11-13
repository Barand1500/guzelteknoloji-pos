import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import {
  SETTINGS_PAGES,
  messageTemplatesSchema,
  EMAIL_TEMPLATE_LIMIT,
  type SettingsPage,
} from '@gt/shared';
import { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import type { Env } from '../../config/env';
import { merchantProductUrlTemplateSchema } from '../site/site.feed';

export type ConnectionSection = 'smtp' | 'imap' | 'google';
/** Görsel kimliği taşıyan ayar alanları: yalnızca sayı ya da boş kabul edilir. */
const IMAGE_ID_KEYS = ['logoId', 'faviconId', 'popupId', 'campaignId', 'stokYokGorselId'];
type SettingsStore = Pick<PrismaClient, 'isletmeAyari' | '$queryRaw'>;

function settingsObject(value: Prisma.JsonValue | null | undefined): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}
export function hasOwnConnection(section: ConnectionSection, values: Record<string, string>) {
  const keys =
    section === 'google' ? ['clientId', 'clientSecret'] : ['host', 'username', 'password', 'from'];
  return keys.some((key) => !!values[key]?.trim());
}
export function environmentConnection(
  env: Env,
  section: ConnectionSection,
): Record<string, string> {
  if (section === 'smtp' && env.smtp)
    return {
      host: env.smtp.host,
      port: String(env.smtp.port),
      secure: String(env.smtp.secure),
      username: env.smtp.user ?? '',
      password: env.smtp.pass ?? '',
      from: env.smtp.from,
    };
  if (section === 'imap' && env.imap)
    return {
      host: env.imap.host,
      port: String(env.imap.port),
      username: env.imap.user,
      password: env.imap.pass,
    };
  if (section === 'google' && env.google)
    return { clientId: env.google.clientId, clientSecret: env.google.clientSecret };
  return {};
}

export class WorkspaceSettings {
  private key: Buffer;
  constructor(
    private db: PrismaClient,
    secret: string,
  ) {
    this.key = createHash('sha256')
      .update('workspace-settings:' + secret)
      .digest();
  }
  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((p) => p.toString('base64url')).join('.');
  }
  decrypt(value: string) {
    const [iv, tag, data] = value.split('.').map((p) => Buffer.from(p, 'base64url'));
    if (!iv || !tag || !data) throw new Error('Invalid encrypted setting');
    const cipher = createDecipheriv('aes-256-gcm', this.key, iv);
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
  }
  isSecret(key: string) {
    return [
      'password',
      'clientSecret',
      'refreshToken',
      'accessToken',
      'secretKey',
      'verifyToken',
      'appSecret',
    ].includes(key);
  }
  async values(businessId: number, section: string, includeSecrets = false) {
    const row = await this.db.isletmeAyari.findUnique({
      where: { businessId_section: { businessId, section } },
    });
    return Object.fromEntries(
      Object.entries(settingsObject(row?.values))
        .filter(([key]) => includeSecrets || !this.isSecret(key))
        .map(([key, value]) => [key, this.isSecret(key) ? this.decrypt(value) : value]),
    );
  }
  async merge(
    store: SettingsStore,
    businessId: number,
    section: string,
    patch: Record<string, string>,
    clear: string[] = [],
  ) {
    // Lock the owning business so concurrent writes to different JSON keys cannot overwrite each other.
    await store.$queryRaw`SELECT id FROM isletmeler WHERE id = ${businessId} FOR UPDATE`;
    const where = { businessId_section: { businessId, section } };
    const row = await store.isletmeAyari.findUnique({ where });
    const values = settingsObject(row?.values);
    for (const key of clear) delete values[key];
    Object.assign(values, patch);
    return store.isletmeAyari.upsert({
      where,
      create: { businessId, section, values: values as Prisma.InputJsonObject },
      update: { values: values as Prisma.InputJsonObject },
    });
  }
  async remove(businessId: number, section: string, keys: string[]) {
    return this.db.$transaction((tx) => this.merge(tx, businessId, section, {}, keys));
  }
  async effective(businessId: number, section: ConnectionSection, env: Env) {
    const stored = await this.values(businessId, section, true);
    const environment = environmentConnection(env, section);
    if (stored.enabled === 'false')
      return { source: 'database' as const, values: { ...stored, enabled: 'false' } };
    if (hasOwnConnection(section, stored)) return { source: 'database' as const, values: stored };
    const values = { ...environment, ...stored };
    return {
      source: Object.keys(environment).length
        ? ('environment' as const)
        : Object.keys(values).length
          ? ('database' as const)
          : ('unconfigured' as const),
      values,
    };
  }
  async read(businessId: number, section: SettingsPage) {
    const row = await this.db.isletmeAyari.findUnique({
      where: { businessId_section: { businessId, section } },
    });
    const stored = settingsObject(row?.values);
    const fields = new Set<string>(
      SETTINGS_PAGES.find((p) => p.key === section)!.fields.map((f) => f.key),
    );
    const values = Object.fromEntries(
      Object.entries(stored).filter(([key]) => fields.has(key) && !this.isSecret(key)),
    );
    return {
      values,
      configured: Object.keys(stored).filter((key) => fields.has(key) && this.isSecret(key)),
      googleConnected: section === 'google' && 'refreshToken' in stored,
    };
  }
  async save(businessId: number, section: SettingsPage, body: unknown) {
    const input = z
      .strictObject({
        values: z.record(
          z.string(),
          z.string().max(section === 'site_eposta_sablonlari' ? EMAIL_TEMPLATE_LIMIT : 20000),
        ),
        clear: z.array(z.string()).default([]),
      })
      .parse(body);
    const page = SETTINGS_PAGES.find((p) => p.key === section)!;
    if (
      (section === 'site_eposta_sablonlari' || section === 'site_sms_sablonlari') &&
      input.values.sablonlar
    ) {
      let value: unknown;
      try {
        value = JSON.parse(input.values.sablonlar);
      } catch {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Şablon listesi okunamadı.');
      }
      const result = messageTemplatesSchema(
        section === 'site_eposta_sablonlari' ? 'email' : 'sms',
      ).safeParse(value);
      if (!result.success)
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          result.error.issues[0]?.message ?? 'Şablonları kontrol edin.',
        );
    }
    if (
      section === 'site_menu' &&
      Object.values(input.values).some((value) => value.trim().length > 120)
    )
      throw new HttpError(400, 'VALIDATION_ERROR', 'Menü blok adı en fazla 120 karakter olmalı.');
    if (section === 'general') {
      const values = input.values;
      if (values.calismaSekli && !['B2C', 'B2B', 'Katalog'].includes(values.calismaSekli))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Çalışma şekli B2C, B2B veya Katalog olmalı.');
      for (const key of ['website', 'webAdresi', 'binListesiUrl']) {
        if (
          values[key] &&
          !z
            .url()
            .refine((s) => /^https?:\/\//i.test(s))
            .safeParse(values[key]).success
        )
          throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir HTTP/HTTPS adresi girin.');
      }
      if (values.acilisTarihi && !z.iso.date().safeParse(values.acilisTarihi).success)
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir açılış tarihi girin.');
      if (values.bayiSozlesmesi && !/^[0-9a-f-]{36}\.pdf$/.test(values.bayiSozlesmesi))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Bayi sözleşmesi dosyasını yeniden seçin.');
    }
    if (
      section === 'general' &&
      'name' in input.values &&
      (!input.values.name.trim() || input.values.name.trim().length > 120)
    )
      throw new HttpError(400, 'VALIDATION_ERROR', 'İşletme adı 1–120 karakter olmalı.');
    for (const key of [...Object.keys(input.values), ...input.clear]) {
      const field = page.fields.find((f) => f.key === key);
      if (!field) throw new HttpError(400, 'VALIDATION_ERROR', 'Bilinmeyen ayar alanı.');
      const value = input.values[key];
      if (value && IMAGE_ID_KEYS.includes(key) && !/^\d+$/.test(value))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Görsel seçimi geçersiz.');
      if (value && 'type' in field && field.type === 'port' && !/^\d+$/.test(value))
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçerli bir port girin.');
      if (
        value &&
        'type' in field &&
        field.type === 'port' &&
        (Number(value) < 1 || Number(value) > 65535)
      )
        throw new HttpError(400, 'VALIDATION_ERROR', 'Port 1–65535 arasında olmalı.');
      if (
        value &&
        'type' in field &&
        field.type === 'boolean' &&
        !['true', 'false'].includes(value)
      )
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçersiz seçenek.');
      if (
        value &&
        ['host', 'username', 'from'].includes(key) &&
        (/[\r\n]/.test(value) || value.includes(String.fromCharCode(0)))
      )
        throw new HttpError(400, 'VALIDATION_ERROR', 'Geçersiz bağlantı bilgisi.');
    }
    if (section === 'site_xml') {
      const existing = await this.values(businessId, 'site_xml');
      const merged = { ...existing, ...input.values };
      for (const key of input.clear) delete merged[key];
      if (merged.enabled === 'true') {
        const result = merchantProductUrlTemplateSchema.safeParse(merged.productUrlTemplate);
        if (!result.success)
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            result.error.issues[0]?.message ?? 'Ürün URL şablonunu kontrol edin.',
          );
      }
    }
    if (section === 'sms') {
      // Etkinleştirmeden önce kimlik ve başlık gerçekten kayıtlı olmalı; yoksa test de çalışmaz.
      const stored = await this.values(businessId, 'sms', true);
      const merged = { ...stored, ...input.values };
      if (
        merged.enabled === 'true' &&
        (!merged.username?.trim() ||
          !merged.password ||
          (!merged.sender?.trim() && !merged.sanalNumara?.trim()))
      )
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          'SMS’i etkinleştirmeden önce kullanıcı adı, şifre ve gönderici başlığı (ya da sanal numara) girin.',
        );
    }
    await this.db.$transaction(async (tx) => {
      if (['cloudflare', 'recaptcha', 'whatsapp'].includes(section)) {
        await tx.$queryRaw`SELECT id FROM isletmeler WHERE id = ${businessId} FOR UPDATE`;
        const old = await tx.isletmeAyari.findUnique({
          where: { businessId_section: { businessId, section } },
        });
        const combined = settingsObject(old?.values);
        for (const key of input.clear) delete combined[key];
        for (const [key, value] of Object.entries(input.values))
          if (value || !this.isSecret(key)) combined[key] = value.trim();
        const required =
          section === 'whatsapp'
            ? ['appId', 'appSecret', 'phoneNumberId', 'accessToken', 'verifyToken']
            : ['siteKey', 'secretKey'];
        if (combined.enabled === 'true' && required.some((key) => !combined[key]))
          throw new HttpError(
            400,
            'VALIDATION_ERROR',
            'Etkinleştirmeden önce bağlantı bilgilerini eksiksiz girin.',
          );
        if (section === 'whatsapp') {
          for (const key of ['appId', 'phoneNumberId'])
            if (combined[key] && !/^\d{5,30}$/.test(combined[key]))
              throw new HttpError(
                400,
                'VALIDATION_ERROR',
                'Meta kimlikleri yalnızca rakam içermeli.',
              );
        } else if (combined.enabled === 'true') {
          const other = section === 'cloudflare' ? 'recaptcha' : 'cloudflare';
          await this.merge(tx, businessId, other, { enabled: 'false' });
        }
      }
      if (section === 'google') {
        const oldId = await tx.isletmeAyari.findUnique({
          where: { businessId_section: { businessId, section } },
        });
        const oldIdValue = settingsObject(oldId?.values).clientId;
        if (
          (input.values.clientId !== undefined && input.values.clientId.trim() !== oldIdValue) ||
          !!input.values.clientSecret ||
          input.clear.some((k) => ['clientId', 'clientSecret'].includes(k))
        )
          input.clear.push('refreshToken', 'accessToken', 'expiresAt');
      }
      const patch: Record<string, string> = {};
      for (const [key, value] of Object.entries(input.values)) {
        if (this.isSecret(key) && !value) continue;
        patch[key] = this.isSecret(key) ? this.encrypt(value) : value.trim();
      }
      await this.merge(tx, businessId, section, patch, input.clear);
      if (section === 'general' && input.values.name?.trim())
        await tx.isletme.update({
          where: { id: businessId },
          data: { name: input.values.name.trim().slice(0, 120) },
        });
    });
    return this.read(businessId, section);
  }
}
