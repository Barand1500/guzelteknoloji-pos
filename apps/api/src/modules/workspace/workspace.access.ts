import {
  WORKSPACE_RESOURCES,
  type PermissionAction,
  type RolePermission,
  type WorkspaceContext,
  type WorkspaceResource,
} from '@gt/shared';
import { Prisma } from '../../generated/prisma/client';
import type { PrismaClient } from '../../lib/prisma';
import { HttpError } from '../../lib/http-error';
import type { UserRecord } from '../auth/auth.types';

export interface AccessContext extends WorkspaceContext {
  ownerId: number;
}
export const forbidden = () => new HttpError(403, 'FORBIDDEN', 'Bu işlem için yetkiniz yok.');
export function hasPermission(
  ctx: WorkspaceContext,
  resource: WorkspaceResource,
  action: PermissionAction,
) {
  return ctx.owner || ctx.permissions.some((p) => p.resource === resource && p.read && p[action]);
}
export function requirePermission(
  ctx: WorkspaceContext,
  resource: WorkspaceResource,
  action: PermissionAction,
) {
  if (!hasPermission(ctx, resource, action)) throw forbidden();
}
export function canGrant(ctx: WorkspaceContext, permissions: RolePermission[]) {
  return (
    ctx.owner ||
    permissions.every((p) =>
      (['read', 'save', 'delete'] as const).every(
        (a) => !p[a] || hasPermission(ctx, p.resource, a),
      ),
    )
  );
}

export class WorkspaceAccess {
  constructor(private db: PrismaClient) {}
  async resolve(user: UserRecord): Promise<AccessContext> {
    const id = Number(user.id);
    // Günlük isteklerde kilit/yazma yok; yalnızca ilk üyelik kurulumu transaction gerektirir.
    const ready = await this.db.isletmeUyesi.findUnique({
      where: { userId: id },
      include: { business: true, role: { include: { permissions: true } } },
    });
    if (ready && !ready.durum) throw forbidden();
    const member =
      ready ??
      (await this.db.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM kullanicilar WHERE id=${id} FOR UPDATE`);
        let existing = await tx.isletmeUyesi.findUnique({ where: { userId: id } });
        if (!existing && user.email) {
          const invite = await tx.isletmeUyesi.findUnique({
            where: { email: user.email.toLowerCase() },
          });
          if (invite && invite.userId === null) {
            if (!invite.durum || !user.emailVerifiedAt) throw forbidden();
            existing = await tx.isletmeUyesi.update({
              where: { id: invite.id },
              data: { userId: id },
            });
          }
        }
        if (!existing) {
          const business = await tx.isletme.upsert({
            where: { ownerId: id },
            update: {},
            create: {
              ownerId: id,
              name: (user.displayName ? `${user.displayName} İşletmesi` : 'İşletmem').slice(0, 120),
            },
          });
          existing = await tx.isletmeUyesi.create({
            data: {
              businessId: business.id,
              userId: id,
              email: user.email,
              name: user.displayName ?? user.email ?? 'İşletme Sahibi',
            },
          });
        }
        if (!existing.durum) throw forbidden();
        return tx.isletmeUyesi.findUniqueOrThrow({
          where: { id: existing.id },
          include: { business: true, role: { include: { permissions: true } } },
        });
      }));
    const owner = member.business.ownerId === id;
    return {
      business: { id: member.businessId, name: member.business.name },
      user: { id, name: user.displayName, email: user.email },
      owner,
      ownerId: member.business.ownerId,
      permissions: owner
        ? WORKSPACE_RESOURCES.map((r) => ({
            resource: r.key,
            read: true,
            save: true,
            delete: true,
          }))
        : WORKSPACE_RESOURCES.map((r) => {
            const p = member.role?.permissions.find((v) => v.resource === r.key);
            return {
              resource: r.key,
              read: p?.read ?? false,
              save: p?.save ?? false,
              delete: p?.delete ?? false,
            };
          }),
    };
  }
}
