/**
 * Audit log pour actions sensibles (Super Admin, modifs règles, etc.)
 */
import { prisma } from './db';

export async function auditLog(params: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details ?? undefined,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}
