import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { SETTINGS_PAGES, type SettingsPage } from '@gt/shared';
import { z } from 'zod';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import type { Env } from '../../config/env';

export type ConnectionSection = 'smtp' | 'imap' | 'google';
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
    const rows = await this.db.isletmeAyari.findMany({ where: { businessId, section } });
    return Object.fromEntries(
      rows
        .filter((r) => includeSecrets || !this.isSecret(r.key))
        .map((r) => [r.key, this.isSecret(r.key) ? this.decrypt(r.value) : r.value]),
    );
  }
  async effective(businessId: number, section: ConnectionSection, env: Env) {
    const stored = await this.values(businessId, section, true);
    if (hasOwnConnection(section, stored)) return { source: 'database' as const, values: stored };
    const values = environmentConnection(env, section);
    return {
      source: Object.keys(values).length ? ('environment' as const) : ('unconfigured' as const),
      values,
    };
  }
  async read(businessId: number, section: SettingsPage) {
    const rows = await this.db.isletmeAyari.findMany({ where: { businessId, section } });
    const fields = new Set<string>(
      SETTINGS_PAGES.find((p) => p.key === section)!.fields.map((f) => f.key),
    );
    const values = Object.fromEntries(
      rows.filter((r) => fields.has(r.key) && !this.isSecret(r.key)).map((r) => [r.key, r.value]),
    );
    if (section === 'whatsapp' && !values.apiVersion) values.apiVersion = 'v25.0';
    return {
      values,
      configured: rows.filter((r) => fields.has(r.key) && this.isSecret(r.key)).map((r) => r.key),
      googleConnected: section === 'google' && rows.some((r) => r.key === 'refreshToken'),
    };
  }
  async save(businessId: number, section: SettingsPage, body: unknown) {
    const input = z
      .strictObject({
        values: z.record(z.string(), z.string().max(4000)),
        clear: z.array(z.string()).default([]),
      })
      .parse(body);
    const page = SETTINGS_PAGES.find((p) => p.key === section)!;
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
    await this.db.$transaction(async (tx) => {
      if (['cloudflare', 'recaptcha', 'whatsapp'].includes(section)) {
        await tx.$queryRaw`SELECT id FROM isletmeler WHERE id = ${businessId} FOR UPDATE`;
        const old = await tx.isletmeAyari.findMany({ where: { businessId, section } });
        const combined: Record<string, string> = Object.fromEntries(
          old.map((r) => [r.key, r.value]),
        );
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
          if (combined.apiVersion && !/^v\d{1,2}\.0$/.test(combined.apiVersion))
            throw new HttpError(400, 'VALIDATION_ERROR', 'API sürümünü v25.0 biçiminde girin.');
        } else if (combined.enabled === 'true') {
          const other = section === 'cloudflare' ? 'recaptcha' : 'cloudflare';
          await tx.isletmeAyari.upsert({
            where: { businessId_section_key: { businessId, section: other, key: 'enabled' } },
            create: { businessId, section: other, key: 'enabled', value: 'false' },
            update: { value: 'false' },
          });
        }
      }
      if (section === 'google') {
        const oldId = await tx.isletmeAyari.findUnique({
          where: { businessId_section_key: { businessId, section, key: 'clientId' } },
        });
        if (
          (input.values.clientId !== undefined && input.values.clientId.trim() !== oldId?.value) ||
          !!input.values.clientSecret ||
          input.clear.some((k) => ['clientId', 'clientSecret'].includes(k))
        )
          await tx.isletmeAyari.deleteMany({
            where: {
              businessId,
              section,
              key: { in: ['refreshToken', 'accessToken', 'expiresAt'] },
            },
          });
      }
      if (input.clear.length)
        await tx.isletmeAyari.deleteMany({
          where: { businessId, section, key: { in: input.clear } },
        });
      for (const [key, value] of Object.entries(input.values)) {
        if (this.isSecret(key) && !value) continue;
        const stored = this.isSecret(key) ? this.encrypt(value) : value.trim();
        await tx.isletmeAyari.upsert({
          where: { businessId_section_key: { businessId, section, key } },
          create: { businessId, section, key, value: stored },
          update: { value: stored },
        });
      }
      if (section === 'general' && input.values.name?.trim())
        await tx.isletme.update({
          where: { id: businessId },
          data: { name: input.values.name.trim().slice(0, 120) },
        });
    });
    return this.read(businessId, section);
  }
}
