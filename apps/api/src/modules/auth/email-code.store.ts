/** Kod kayıtları MySQL'e yazılmaz. Üretim uygulaması Redis kullanır. */
export interface CodePolicy {
  ttlSeconds: number;
  resendSeconds: number;
  maxAttempts: number;
  maxPerHour: number;
}

export type CodeReservation =
  | { status: 'created'; id: string }
  | { status: 'waiting'; resendAfterSeconds: number; expiresInSeconds: number }
  | { status: 'limited' };

export interface EmailCodeStore {
  reserve(email: string, codeHash: string, policy: CodePolicy): Promise<CodeReservation>;
  /** SMTP hatasında yalnızca bu gönderime ait kod silinir. */
  discard(email: string, id: string): Promise<void>;
  /** Karşılaştırma, deneme sayımı ve başarılı kodun silinmesi tek atomik işlemdir. */
  verify(email: string, codeHash: string, maxAttempts: number): Promise<boolean>;
}
