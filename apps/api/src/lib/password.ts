import { hash, verify } from '@node-rs/argon2';

/**
 * OWASP önerisi: Argon2id, m=19 MiB, t=2, p=1.
 * @node-rs/argon2'nin varsayılan algoritması Argon2id'dir.
 */
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}

export const argon2Hasher: PasswordHasher = {
  hash: (password) => hash(password, ARGON2_OPTIONS),
  verify: async (passwordHash, password) => {
    try {
      return await verify(passwordHash, password);
    } catch {
      // Bozuk/uyumsuz hash dizesi: girişi reddet, hata fırlatma.
      return false;
    }
  },
};
