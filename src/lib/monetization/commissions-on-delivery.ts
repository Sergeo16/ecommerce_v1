/**
 * Création et validation des commissions affilié et plateforme
 * dès que la livraison est confirmée avec succès.
 * Applicable quel que soit le mode de paiement ou le canal d'achat (direct, panier).
 *
 * Commission affilié : priorité commande > lien > admin par défaut > produit/fournisseur > 10%
 */

import { prisma } from '@/lib/db';
import {
  getPlatformCommissionPercent,
  getAffiliateDefaultCommission,
  resolveAffiliateCommissionForOrder,
  areCommissionsHeldForVerification,
} from './commissions';

const DEFAULT_AFFILIATE_PERCENT = 10;

/**
 * Crée et approuve les commissions (plateforme + affilié + livreur) pour une commande
 * dont la livraison vient d'être confirmée. Par défaut disponibles dans les dashboards.
 * Si l'admin a activé "bloquer pour vérification", les commissions sont en ON_HOLD.
 */
export async function approveCommissionsOnDelivery(orderId: string): Promise<void> {
  const [order, delivery, held] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { categoryId: true } } } },
        companyProfile: true,
        affiliateLink: { select: { id: true, userId: true, commissionPercent: true, commissionAmount: true } },
        commissions: true,
      },
    }),
    prisma.delivery.findUnique({ where: { orderId } }),
    areCommissionsHeldForVerification(),
  ]);

  if (!order || order.items.length === 0) return;

  const orderTotal = Number(order.subtotal);
  if (orderTotal <= 0) return;

  const status = held ? 'ON_HOLD' : 'APPROVED';

  const firstItemCategoryId = order.items[0]?.product?.categoryId ?? null;
  const platformPercent = await getPlatformCommissionPercent({
    companyProfileId: order.companyProfileId,
    orderTotal,
    categoryId: firstItemCategoryId,
  });

  const platformAmount = Math.round((orderTotal * platformPercent) / 100 * 100) / 100;

  const existingPlatform = order.commissions.find((c) => c.type === 'PLATFORM');
  const existingAffiliate = order.commissions.find((c) => c.type === 'AFFILIATE');
  const existingCourier = order.commissions.find((c) => c.type === 'COURIER');

  if (!existingPlatform) {
    await prisma.commission.create({
      data: {
        orderId,
        type: 'PLATFORM',
        amount: platformAmount,
        percent: platformPercent,
        status,
      },
    });
  }

  if (order.affiliateLinkId && order.affiliateLink) {
    const defaultConfig = await getAffiliateDefaultCommission();
    const resolved = resolveAffiliateCommissionForOrder({
      orderOverridePercent: order.affiliateOverridePercent,
      orderOverrideAmount: order.affiliateOverrideAmount,
      linkCommissionPercent: order.affiliateLink.commissionPercent,
      linkCommissionAmount: order.affiliateLink.commissionAmount,
      defaultConfig,
    });

    let affiliateAmount: number;
    let percentUsed: number | null;

    if (resolved.type === 'AMOUNT') {
      affiliateAmount = Math.round(resolved.value * 100) / 100;
      percentUsed = null;
    } else {
      const hasOrderLinkOrDefaultOverride =
        order.affiliateOverridePercent != null || order.affiliateOverrideAmount != null ||
        order.affiliateLink.commissionPercent != null || order.affiliateLink.commissionAmount != null ||
        defaultConfig != null;
      if (hasOrderLinkOrDefaultOverride) {
        affiliateAmount = Math.round((orderTotal * resolved.value) / 100 * 100) / 100;
        percentUsed = resolved.value;
      } else {
        // Fallback : par ligne (produit > fournisseur > 10%)
        affiliateAmount = 0;
        percentUsed = DEFAULT_AFFILIATE_PERCENT;
        for (const item of order.items) {
          const pct =
            item.affiliateCommissionPercent != null
              ? Number(item.affiliateCommissionPercent)
              : order.companyProfile?.defaultAffiliateCommissionPercent != null
                ? Number(order.companyProfile.defaultAffiliateCommissionPercent)
                : DEFAULT_AFFILIATE_PERCENT;
          affiliateAmount += (Number(item.total) * pct) / 100;
          percentUsed = pct;
        }
        affiliateAmount = Math.round(affiliateAmount * 100) / 100;
      }
    }

    if (affiliateAmount > 0) {
      if (existingAffiliate) {
        await prisma.commission.update({
          where: { id: existingAffiliate.id },
          data: { status, amount: affiliateAmount, percent: percentUsed },
        });
      } else {
        await prisma.commission.create({
          data: {
            orderId,
            affiliateLinkId: order.affiliateLinkId,
            userId: order.affiliateLink.userId,
            type: 'AFFILIATE',
            amount: affiliateAmount,
            percent: percentUsed,
            status,
          },
        });
      }

      await prisma.affiliateLink.update({
        where: { id: order.affiliateLinkId },
        data: { conversionCount: { increment: 1 } },
      });
    }
  }

  if (delivery?.courierId && delivery.commissionAmount != null && Number(delivery.commissionAmount) > 0 && !existingCourier) {
    await prisma.commission.create({
      data: {
        orderId,
        userId: delivery.courierId,
        type: 'COURIER',
        amount: Number(delivery.commissionAmount),
        status,
      },
    });
  }
}
