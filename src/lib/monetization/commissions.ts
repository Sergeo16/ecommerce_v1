/**
 * Commissions dynamiques : résolution du % plateforme selon
 * catégorie, fournisseur, volume, zone, abonnement vendeur.
 * S'appuie sur CommissionRule (Prisma) et/ou Settings (clés commission_*).
 */

import { prisma } from "@/lib/db";

export type CommissionContext = {
  categoryId?: string | null;
  companyProfileId: string;
  orderTotal: number;
  zoneId?: string | null;
  sellerPlanSlug?: "FREE" | "PRO" | "ELITE";
};

export async function getPlatformCommissionPercent(
  ctx: CommissionContext
): Promise<number> {
  // 1. Règle spécifique vendeur (abonnement Pro/Elite)
  if (ctx.sellerPlanSlug && ctx.sellerPlanSlug !== "FREE") {
    const plan = await prisma.sellerSubscriptionPlan.findUnique({
      where: { slug: ctx.sellerPlanSlug },
    });
    if (plan?.commissionPercentOverride != null) {
      return Number(plan.commissionPercentOverride);
    }
  }

  // 2. Règle par company
  const companyRule = await prisma.commissionRule.findFirst({
    where: { scope: "COMPANY", scopeId: ctx.companyProfileId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (companyRule) return Number(companyRule.platformPercent);

  // 3. Règle par catégorie
  if (ctx.categoryId) {
    const catRule = await prisma.commissionRule.findFirst({
      where: { scope: "CATEGORY", scopeId: ctx.categoryId, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (catRule) return Number(catRule.platformPercent);
  }

  // 4. Règle globale
  const globalRule = await prisma.commissionRule.findFirst({
    where: { scope: "GLOBAL", isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (globalRule) return Number(globalRule.platformPercent);

  // 5. Défaut (ex: 10%)
  return 10;
}
