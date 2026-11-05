import { z } from 'zod';

export { emailStartSchema, emailVerifySchema, loginSchema } from '@gt/shared';

/** OAuth akışı boyunca imzalı, HttpOnly cookie'de taşınan geçici değerler. */
export const oauthFlowCookieSchema = z.object({
  state: z.string().min(16).max(128),
  nonce: z.string().min(16).max(128),
  codeVerifier: z.string().min(43).max(128),
});

export type OAuthFlowCookie = z.infer<typeof oauthFlowCookieSchema>;

export const googleCallbackQuerySchema = z.object({
  state: z.string().max(256).optional(),
  code: z.string().max(4096).optional(),
  error: z.string().max(256).optional(),
});
