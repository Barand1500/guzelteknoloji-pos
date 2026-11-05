import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMailer, smtpFailure, verifySmtp } from '../lib/mailer';
import { createLogger } from '../lib/logger';
import { testEnv } from './helpers';
const mocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
  verify: vi.fn(),
  close: vi.fn(),
  createTransport: vi.fn(),
}));
vi.mock('nodemailer', () => ({ default: { createTransport: mocks.createTransport } }));
const smtp = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: 'sender@example.com',
  SMTP_PASS: 'dummy-test-password',
  SMTP_FROM: 'Destek <sender@example.com>',
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.createTransport.mockReturnValue(mocks);
});
describe('SMTP settings and delivery', () => {
  it('accepts SMTP_FROM and prefers MAIL_FROM when both exist', () => {
    expect(testEnv(smtp).smtp?.from).toBe(smtp.SMTP_FROM);
    expect(testEnv({ ...smtp, MAIL_FROM: 'other@example.com' }).smtp?.from).toBe(
      'other@example.com',
    );
    expect(() => testEnv({ SMTP_HOST: 'smtp.gmail.com' })).toThrow(/MAIL_FROM/);
    expect(() => testEnv({ ...smtp, SMTP_PASS: '' })).toThrow(/SMTP_PASS/);
  });
  it('uses authenticated STARTTLS and the configured sender', async () => {
    mocks.sendMail.mockResolvedValue({});
    await createMailer(testEnv(smtp), createLogger('silent')).sendLoginCode(
      'recipient@example.com',
      '123456',
      10,
    );
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: smtp.SMTP_USER, pass: smtp.SMTP_PASS },
      }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: smtp.SMTP_FROM, to: 'recipient@example.com' }),
    );
  });
  it('logs safe diagnostics and propagates the delivery failure', async () => {
    const failure = Object.assign(new Error('sensitive message'), {
      code: 'EAUTH',
      responseCode: 535,
      response: 'secret response',
    });
    mocks.sendMail.mockRejectedValue(failure);
    const logger = createLogger('silent');
    const log = vi.spyOn(logger, 'error');
    await expect(
      createMailer(testEnv(smtp), logger).sendLoginCode('recipient@example.com', '123456', 10),
    ).rejects.toBe(failure);
    expect(log).toHaveBeenCalledWith(
      { smtpCode: 'EAUTH', responseCode: 535, category: 'authentication' },
      expect.any(String),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('sensitive');
    expect(smtpFailure({ code: 'secret', response: 'secret', responseCode: 999 })).toEqual({
      smtpCode: 'UNKNOWN',
      category: 'connection_or_delivery',
      responseCode: undefined,
    });
  });
  it('checks credentials without sending mail and closes after failure', async () => {
    mocks.verify.mockRejectedValue(new Error('offline'));
    await expect(verifySmtp(testEnv(smtp))).rejects.toThrow('offline');
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
