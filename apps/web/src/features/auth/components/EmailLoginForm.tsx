import { zodResolver } from '@hookform/resolvers/zod';
import {
  CODE_LENGTH,
  emailStartSchema,
  emailVerifySchema,
  loginSchema,
  type EmailStartInput,
  type EmailStartResponse,
  type PublicUser,
} from '@gt/shared';
import { ArrowLeft, Eye, EyeOff, Pencil } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/TextField';
import { authApi } from '../services/auth.api';
import { loginErrorMessage } from '../services/auth.messages';

/**
 * "E-Posta İle Devam Et" akışı (ürün kararı):
 *  1) yalnızca e-posta sorulur → sunucu hesabın durumuna bakar
 *  2a) kayıtlı hesap  → şifre sorulur
 *  2b) kayıtlı değil  → e-postaya 6 haneli kod gönderilir, kod sorulur (doğrulanınca hesap açılır)
 * Başarılı giriş yalnızca sunucu oturumu doğruladıktan sonra `onSuccess` ile bildirilir.
 */
type Step =
  | { name: 'email' }
  | { name: 'password'; email: string }
  | { name: 'code'; email: string; resendAfterSeconds: number };

interface EmailLoginFormProps {
  onBack: () => void;
  onSuccess: (user: PublicUser) => void;
}

export function EmailLoginForm({ onBack, onSuccess }: EmailLoginFormProps) {
  const [step, setStep] = useState<Step>({ name: 'email' });
  // Kullanıcı geri dönerse yazdığı e-posta kaybolmasın.
  const [lastEmail, setLastEmail] = useState('');

  const goToEmail = () => setStep({ name: 'email' });
  const handleStart = (email: string, response: EmailStartResponse) => {
    setLastEmail(email);
    setStep(
      response.step === 'password'
        ? { name: 'password', email }
        : { name: 'code', email, resendAfterSeconds: response.resendAfterSeconds },
    );
  };

  return (
    <section aria-labelledby="eposta-baslik">
      <button
        type="button"
        onClick={step.name === 'email' ? onBack : goToEmail}
        className="-ml-3 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {step.name === 'email' ? 'Diğer Seçenekler' : 'Geri'}
      </button>

      {/* key: adım değişince içerik yeniden oluşur ve giriş animasyonu oynar. */}
      <div key={step.name} className="animate-in-from-bottom">
        {step.name === 'email' ? (
          <EmailStep defaultEmail={lastEmail} onNext={handleStart} />
        ) : step.name === 'password' ? (
          <PasswordStep email={step.email} onChangeEmail={goToEmail} onSuccess={onSuccess} />
        ) : (
          <CodeStep
            email={step.email}
            resendAfterSeconds={step.resendAfterSeconds}
            onChangeEmail={goToEmail}
            onSuccess={onSuccess}
          />
        )}
      </div>
    </section>
  );
}

function StepHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <h2 id="eposta-baslik" className="mt-3 text-2xl font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-1.5 text-base text-ink-muted">{children}</div>
    </>
  );
}

/** Seçili e-postayı gösterir ve değiştirmeye izin verir. */
function EmailChip({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="min-w-0 truncate font-semibold text-ink">{email}</span>
      <button
        type="button"
        onClick={onChange}
        aria-label="E-Posta Adresini Değiştir"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ─────────────── Adım 1: E-posta ─────────────── */

function EmailStep({
  defaultEmail,
  onNext,
}: {
  defaultEmail: string;
  onNext: (email: string, response: EmailStartResponse) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<EmailStartInput>({
    resolver: zodResolver(emailStartSchema),
    mode: 'onTouched',
    defaultValues: { email: defaultEmail },
  });
  useEffect(() => setFocus('email'), [setFocus]);

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError(null);
    try {
      onNext(email, await authApi.emailStart(email));
    } catch (error) {
      setServerError(loginErrorMessage(error));
    }
  });

  return (
    <>
      <StepHeader title="E-Posta ile giriş">E-Posta adresinizi girin.</StepHeader>
      <form
        noValidate
        onSubmit={onSubmit}
        className="mt-7 flex flex-col gap-5"
        aria-busy={isSubmitting}
      >
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <TextField
          label="E-Posta"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button
          type="submit"
          loading={isSubmitting}
          loadingLabel="Kontrol Ediliyor…"
          className="mt-1"
        >
          Devam Et
        </Button>
      </form>
    </>
  );
}

/* ─────────────── Adım 2a: Şifre (kayıtlı hesap) ─────────────── */

const passwordSchema = loginSchema.pick({ password: true });
type PasswordInput = z.infer<typeof passwordSchema>;

function PasswordStep({
  email,
  onChangeEmail,
  onSuccess,
}: {
  email: string;
  onChangeEmail: () => void;
  onSuccess: (user: PublicUser) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    mode: 'onTouched',
    defaultValues: { password: '' },
  });
  useEffect(() => setFocus('password'), [setFocus]);

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null);
    try {
      onSuccess(await authApi.login({ email, password }));
    } catch (error) {
      setServerError(loginErrorMessage(error));
    }
  });

  return (
    <>
      <StepHeader title="Şifrenizi girin">Hesabınıza devam etmek için şifrenizi girin.</StepHeader>
      <EmailChip email={email} onChange={onChangeEmail} />
      <form
        noValidate
        onSubmit={onSubmit}
        className="mt-6 flex flex-col gap-5"
        aria-busy={isSubmitting}
      >
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        {/* Şifre yöneticileri için kullanıcı adı alanı (görünmez). */}
        <input type="hidden" name="username" autoComplete="username" value={email} readOnly />
        <TextField
          label="Şifre"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
              aria-pressed={showPassword}
              className="inline-flex size-12 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              {showPassword ? (
                <EyeOff className="size-5" aria-hidden="true" />
              ) : (
                <Eye className="size-5" aria-hidden="true" />
              )}
            </button>
          }
        />
        <Button
          type="submit"
          loading={isSubmitting}
          loadingLabel="Giriş Yapılıyor…"
          className="mt-1"
        >
          Devam Et
        </Button>
      </form>
    </>
  );
}

/* ─────────────── Adım 2b: Kod (kayıtlı olmayan e-posta) ─────────────── */

const codeSchema = emailVerifySchema.pick({ code: true });
type CodeInput = z.infer<typeof codeSchema>;

/** Saniye geri sayımı; sıfırlanabilir. */
function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [remaining]);
  const reset = useCallback((seconds: number) => setRemaining(seconds), []);
  return [remaining, reset] as const;
}

function CodeStep({
  email,
  resendAfterSeconds,
  onChangeEmail,
  onSuccess,
}: {
  email: string;
  resendAfterSeconds: number;
  onChangeEmail: () => void;
  onSuccess: (user: PublicUser) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [remaining, resetCountdown] = useCountdown(resendAfterSeconds);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CodeInput>({
    resolver: zodResolver(codeSchema),
    mode: 'onTouched',
    defaultValues: { code: '' },
  });
  useEffect(() => setFocus('code'), [setFocus]);

  const onSubmit = handleSubmit(async ({ code }) => {
    setServerError(null);
    setNotice(null);
    try {
      onSuccess(await authApi.emailVerify({ email, code }));
    } catch (error) {
      setServerError(loginErrorMessage(error));
    }
  });

  const resend = async () => {
    setServerError(null);
    setNotice(null);
    setResending(true);
    try {
      const response = await authApi.emailStart(email);
      if (response.step === 'code') {
        resetCountdown(response.resendAfterSeconds);
        setNotice('Yeni kod gönderildi.');
      }
    } catch (error) {
      setServerError(loginErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <StepHeader title="Kodu girin">E-Postanıza {CODE_LENGTH} haneli kod gönderdik.</StepHeader>
      <EmailChip email={email} onChange={onChangeEmail} />
      <form
        noValidate
        onSubmit={onSubmit}
        className="mt-6 flex flex-col gap-5"
        aria-busy={isSubmitting}
      >
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        {notice ? <Alert tone="info">{notice}</Alert> : null}
        <TextField
          label="Doğrulama Kodu"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          error={errors.code?.message}
          {...register('code', {
            // Yalnızca rakam kabul edilir (yapıştırılan boşluk/tire temizlenir).
            onChange: (event: { target: HTMLInputElement }) => {
              event.target.value = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
            },
          })}
        />
        <div className="flex flex-col gap-1">
          <Button
            type="submit"
            loading={isSubmitting}
            loadingLabel="Doğrulanıyor…"
            className="mt-1"
          >
            Devam Et
          </Button>
          <Button
            variant="ghost"
            flow={false}
            onClick={resend}
            loading={resending}
            loadingLabel="Gönderiliyor…"
            disabled={remaining > 0}
            className="min-h-11! py-2! text-sm! text-brand-700"
          >
            {remaining > 0 ? `Kodu Tekrar Gönder (${remaining} sn)` : 'Kodu Tekrar Gönder'}
          </Button>
        </div>
      </form>
    </>
  );
}
