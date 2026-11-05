import type { PublicUser } from '@gt/shared';

export type UserStatus = 'ACTIVE' | 'DISABLED';
export type AuthProvider = 'GOOGLE';

export interface UserRecord {
  id: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  lastSeenAt: Date;
}

export interface EmailCodeRecord {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface IssuedSession {
  token: string;
  expiresAt: Date;
  user: UserRecord;
}

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };
}
